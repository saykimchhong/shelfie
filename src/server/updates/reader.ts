import "server-only";
import { LlmAgent } from "@google/adk";
import { createPartFromBase64, createUserContent, type Part, type ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { PRICE_UNITS } from "@/domain/product";
import { aboutShop, type ShopType } from "@/domain/shop";
import { LANGUAGE_NAMES, type Currency, type LabelLanguage } from "@/domain/store";
import type { ListedProduct, NewProduct, ProductChange, ProductEdit } from "@/domain/updates";
import { geminiModel, runWorkflow } from "@/server/adk";

// Update reader: turns the seller's typed or spoken message into product changes.

export const readerSchema = z.object({
  heard: z
    .string()
    .nullable()
    .describe("For a voice note: what the owner said, written out in the language they spoke. null for typed text."),
  changes: z.array(
    z.object({
      action: z.enum(["update", "add", "remove"]),
      product: z.number().int().nullable().describe("The listed product's number, for update and remove. null for add."),
      name: z.string().nullable().describe("update: the new name, only when renamed. add: the new product's name."),
      localName: z
        .string()
        .nullable()
        .describe("update: the new label-language name, only when renamed. add: the name in the label language."),
      price: z.number().nullable().describe("The new price, only when said."),
      unit: z.enum(PRICE_UNITS).nullable().describe("What the price is for, only when said."),
      inStock: z.boolean().nullable().describe("false when sold out, true when back in stock, null when not said."),
    }),
  ),
});

export type ReaderOutput = z.infer<typeof readerSchema>;

export type ShopSettings = { currency: Currency; labelLanguage: LabelLanguage; shopType?: ShopType };

export type UpdateMessage = { text: string } | { audio: Blob };

function instruction({ currency, labelLanguage, shopType }: ShopSettings): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You keep a small shop's product list up to date from the owner's message. The message is typed or a voice note, often mixing ${language} and English.
${aboutShop(shopType)}The shop's products are listed, numbered. Prices are in ${currency}.
Turn the message into changes:
- update: a listed product changes. Fill only what the owner asked to change (name, localName, price, unit, inStock) and leave the rest null. Naming a product to point at it is not a rename.
- add: a product that isn't listed. Give its name in English, localName in ${language} when said, and its price and unit when said.
- remove: the owner stops selling a listed product. Sold out is not remove: it is update with inStock false.
- Match products by meaning: names may be short, misspelled, translated or said differently.
- Prices are plain numbers in ${currency}: "25", "twenty five" and "25 baht" are all 25. Never convert currency.
- inStock is false for sold out, finished or none left, and true for back in stock or restocked.
- Skip anything unclear or that could mean several products. Never invent changes the owner didn't ask for.`;
}

function describeProducts(products: readonly ListedProduct[], currency: Currency): string {
  if (products.length === 0) return "The shop has no products yet.";
  const lines = products.map((product, index) => {
    const name = product.localName ? `${product.name} (${product.localName})` : product.name;
    const price = product.price === null ? "no price" : `${product.price} ${currency} ${product.unit === "each" ? "each" : `per ${product.unit}`}`;
    return `${index + 1}. ${name}: ${price}, ${product.inStock ? "in stock" : "sold out"}`;
  });
  return `Products:\n${lines.join("\n")}`;
}

async function messageParts(message: UpdateMessage): Promise<Part[]> {
  if ("text" in message) return [{ text: `The owner typed:\n${message.text}` }];
  const base64 = Buffer.from(await message.audio.arrayBuffer()).toString("base64");
  return [{ text: "The owner's voice note:" }, createPartFromBase64(base64, message.audio.type || "audio/wav")];
}

export async function readUpdate(
  message: UpdateMessage,
  products: readonly ListedProduct[],
  settings: ShopSettings,
  { thinkingLevel }: { thinkingLevel?: ThinkingLevel } = {},
): Promise<{ heard: string | null; changes: ProductChange[] }> {
  const reader = new LlmAgent({
    name: "updateReader",
    description: "Turns the owner's message into product changes.",
    model: geminiModel(),
    instruction: instruction(settings),
    outputSchema: readerSchema,
    generateContentConfig: thinkingLevel ? { thinkingConfig: { thinkingLevel } } : undefined,
  });
  const parts = [{ text: describeProducts(products, settings.currency) }, ...(await messageParts(message))];
  const output = await runWorkflow("updateReader", (run) => run(reader, createUserContent(parts)));
  const parsed = readerSchema.parse(output);
  return { heard: "audio" in message ? clean(parsed.heard) : null, changes: toChanges(parsed, products) };
}

const clean = (value: string | null | undefined) => value?.trim() || null;
const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
const validPrice = (price: number | null) => (price !== null && Number.isFinite(price) && price >= 0 ? price : null);

type Change = ReaderOutput["changes"][number];

// Checks the reader's answer against the real list: unknown products are
// dropped, repeats are merged, and only real differences are kept.
export function toChanges(output: ReaderOutput, products: readonly ListedProduct[]): ProductChange[] {
  const edits = new Map<number, Change[]>();
  const removed = new Set<number>();
  const added: NewProduct[] = [];
  const editOf = (index: number, change: Change) => edits.set(index, [...(edits.get(index) ?? []), change]);

  for (const change of output.changes) {
    if (change.action === "add") {
      const name = clean(change.name);
      if (!name) continue;
      // "Adding" a product the shop already lists means updating it.
      const listed = products.findIndex(
        (product) => sameText(product.name, name) || sameText(product.localName, change.localName),
      );
      if (listed >= 0) editOf(listed, { ...change, name: null, localName: null });
      else if (!added.some((product) => sameText(product.name, name))) {
        added.push({ name, localName: clean(change.localName), price: validPrice(change.price), unit: change.unit });
      }
      continue;
    }
    const index = (change.product ?? 0) - 1;
    if (index < 0 || index >= products.length) continue;
    if (change.action === "remove") removed.add(index);
    else editOf(index, change);
  }

  const updates: ProductChange[] = [...edits]
    .filter(([index]) => !removed.has(index))
    .flatMap(([index, changes]) => {
      const edit = diff(products[index], changes);
      return Object.keys(edit).length > 0 ? [{ kind: "update" as const, id: products[index].id, edit }] : [];
    });
  return [
    ...updates,
    ...added.map((product) => ({ kind: "add" as const, product })),
    ...[...removed].map((index) => ({ kind: "remove" as const, id: products[index].id })),
  ];
}

// Later mentions win.
function diff(product: ListedProduct, changes: readonly Change[]): ProductEdit {
  const edit: ProductEdit = {};
  for (const change of changes) {
    const name = clean(change.name);
    const localName = clean(change.localName);
    const price = validPrice(change.price);
    if (name && name !== product.name) edit.name = name.slice(0, 120);
    if (localName && localName !== product.localName) edit.localName = localName.slice(0, 120);
    if (price !== null && price !== product.price) edit.price = price;
    if (change.unit && change.unit !== product.unit) edit.unit = change.unit;
    if (change.inStock !== null && change.inStock !== product.inStock) edit.inStock = change.inStock;
  }
  return edit;
}
