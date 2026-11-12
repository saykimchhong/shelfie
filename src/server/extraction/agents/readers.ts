import "server-only";
import { FunctionNode, LlmAgent } from "@google/adk";
import { createPartFromBase64, createUserContent, type Part, type ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { PRICE_UNIT_GUIDE, PRICE_UNITS } from "@/domain/product";
import { aboutShop } from "@/domain/shop";
import { LANGUAGE_NAMES } from "@/domain/store";
import { geminiModel } from "@/server/adk";
import type { Watch, WatcherSettings } from "./watcher";

// Photo reader and List reader: the Watcher's stand-ins for photos and typed
// lists. Both return a Watch, so every later step is the same. Their
// "seconds" are positions: the photo's index, or the line's.

const productFields = {
  name: z.string().describe("Short English name a customer would search for: brand + product + size if shown."),
  localName: z
    .string()
    .nullable()
    .describe("Name exactly as written in Khmer, Sinhala, Tamil or Thai script. null if none."),
  category: z.string().nullable().describe("One or two English words, e.g. Rice, Snacks, Shoes."),
  unit: z.enum(PRICE_UNITS).describe(PRICE_UNIT_GUIDE),
};

const photoReadSchema = z.object({
  products: z.array(
    z.object({
      ...productFields,
      photo: z.number().int().describe("Number of the photo where the product is clearest, as given."),
      box: z
        .array(z.number())
        .length(4)
        .nullable()
        .describe("[ymin, xmin, ymax, xmax] of the product in that photo, each 0-1000. null if it isn't pictured."),
      price: z.number().nullable().describe("The price written for it, as a number. null if none is written."),
      confidence: z.number().min(0).max(1).describe("0 to 1: how sure you are about the name and price."),
    }),
  ),
});

const listReadSchema = z.object({
  products: z.array(
    z.object({
      ...productFields,
      price: z.number().nullable().describe("The price written for it, as a number. null if none."),
    }),
  ),
});

export type PhotoRead = z.infer<typeof photoReadSchema>;
export type ListRead = z.infer<typeof listReadSchema>;

function photoInstruction({ currency, labelLanguage, shopType }: WatcherSettings): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You catalogue the products in a small shop from photos the owner took: shelves, a menu board or a price list.
${aboutShop(shopType)}List every distinct product for sale.
- Labels are mostly in ${language}. localName is only the ${language}-script words of its name, exactly as written; null when there are none.
- The same product in several photos is one item. Different sizes, colours or flavours are separate items.
- photo is the number of the photo where it is clearest, and box is where it is in that photo. A line on a menu or price list with no picture of the item has box null.
- price is only a price written for that product (tag, shelf label, menu or list line), as a number in ${currency}. Never guess.
- unit is chosen product by product: one shop often mixes things sold each, by the kg and by the bunch.
- Ignore people, hands, furniture and anything not for sale.
- Keep the order: photo by photo, top to bottom, left to right.`;
}

function listInstruction({ currency, labelLanguage, shopType }: WatcherSettings): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You turn the owner's typed product list into a shop catalogue. It may be in ${language}, English or both, one product per line or separated by commas, usually with the price after the name.
${aboutShop(shopType)}- name is a short English name a customer would search for, translated when written in ${language}. localName is only the ${language}-script words of its name, exactly as written; null when there are none.
- price is the number written for it, in ${currency}. null if none. Never guess.
- unit is chosen product by product: "rice 45/kg" is kg, "mint 10 a bunch" is bunch, "cola 15" is each.
- Skip headings, totals, notes and anything that isn't a product. Keep the owner's order.`;
}

type Options = { thinkingLevel?: ThinkingLevel };

function readerModel(
  name: string,
  instruction: string,
  schema: typeof photoReadSchema | typeof listReadSchema,
  { thinkingLevel }: Options,
) {
  return new LlmAgent({
    name,
    description: "Lists the products and their written prices.",
    model: geminiModel(),
    instruction,
    outputSchema: schema,
    generateContentConfig: thinkingLevel ? { thinkingConfig: { thinkingLevel } } : undefined,
  });
}

// Runs as the "watcher" step, so the activity feed and pipeline stay the same.
export function createPhotoReader(settings: WatcherSettings, photos: readonly Blob[], options: Options = {}) {
  const model = readerModel("photoReaderModel", photoInstruction(settings), photoReadSchema, options);
  return new FunctionNode("watcher", async (ctx): Promise<Watch> => {
    const parts: Part[] = [];
    for (const [index, photo] of photos.entries()) {
      parts.push({ text: `Photo ${index + 1}:` });
      parts.push(createPartFromBase64(Buffer.from(await photo.arrayBuffer()).toString("base64"), photo.type));
    }
    const result = await ctx.runNode(model, createUserContent([...parts, "Catalogue these photos."]));
    return photosToWatch(photoReadSchema.parse(result.output), photos.length);
  });
}

export function createListReader(settings: WatcherSettings, text: string, options: Options = {}) {
  const model = readerModel("listReaderModel", listInstruction(settings), listReadSchema, options);
  return new FunctionNode("watcher", async (ctx): Promise<Watch> => {
    const result = await ctx.runNode(model, createUserContent(`The owner's list:\n${text}`));
    return listToWatch(listReadSchema.parse(result.output));
  });
}

// Khmer, Sinhala, Tamil or Thai letters.
const LOCAL_SCRIPT = /[\u0E00-\u0E7F\u1780-\u17FF\u0D80-\u0DFF\u0B80-\u0BFF]/;

// A "local name" without local script is just the English name again.
export function localOnly(localName: string | null): string | null {
  return localName && LOCAL_SCRIPT.test(localName) ? localName.trim() : null;
}

export function photosToWatch(read: PhotoRead, photoCount: number): Watch {
  const products = read.products.map(({ name, localName, category, unit, photo, box, confidence }) => {
    const index = photo - 1;
    const valid = index >= 0 && index < photoCount;
    const at = valid ? index : 0;
    return {
      name,
      localName: localOnly(localName),
      category,
      unit,
      firstSeenSeconds: at,
      lastSeenSeconds: at,
      clearestSeconds: at,
      box: valid ? box : null,
      confidence,
      note: null,
    };
  });
  return { products, prices: writtenPrices(read.products, products) };
}

export function listToWatch(read: ListRead): Watch {
  const products = read.products.map(({ name, localName, category, unit }, index) => ({
    name,
    localName: localOnly(localName),
    category,
    unit,
    firstSeenSeconds: index,
    lastSeenSeconds: index,
    clearestSeconds: index,
    box: null,
    confidence: 0.9,
    note: null,
  }));
  return { products, prices: writtenPrices(read.products, products) };
}

// A written price belongs to its own product, at its position.
function writtenPrices(read: readonly { price: number | null }[], products: Watch["products"]): Watch["prices"] {
  return read.flatMap(({ price }, index) =>
    price !== null && Number.isFinite(price) && price >= 0
      ? [{ atSeconds: products[index].clearestSeconds, heard: String(price), amount: price, product: index }]
      : [],
  );
}
