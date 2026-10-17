import "server-only";
import { FunctionNode, LlmAgent } from "@google/adk";
import { createUserContent } from "@google/genai";
import { z } from "zod";
import type { FrameBox } from "@/domain/extraction";
import type { Currency, LabelLanguage } from "@/domain/store";
import { geminiModel } from "@/server/adk";
import { uploadVideo } from "@/server/gemini";

// What the Watcher returns: the one call that reads the video. Field
// descriptions are part of the prompt.
export const watchedProductSchema = z.object({
  name: z.string().describe("Short English name a customer would search for: brand + product + size if visible."),
  localName: z
    .string()
    .nullable()
    .describe("Name exactly as printed on the label in Khmer, Sinhala, Tamil or Thai script. null if none."),
  category: z.string().nullable().describe("One or two English words, e.g. Rice, Snacks, Shoes."),
  firstSeenSeconds: z.number().describe("Seconds from the start when the product first appears."),
  lastSeenSeconds: z.number().describe("Seconds from the start when the product was last on screen."),
  clearestSeconds: z.number().describe("Seconds from the start where the product is clearest."),
  box: z
    .array(z.number())
    .length(4)
    .nullable()
    .describe("[ymin, xmin, ymax, xmax] of the product in the frame at clearestSeconds, each 0-1000. null if unsure."),
  confidence: z.number().min(0).max(1).describe("0 to 1: how sure you are about the name."),
  note: z
    .string()
    .nullable()
    .describe("Only if the owner should double-check the name or label: a few words. Otherwise null."),
});

export const heardPriceSchema = z.object({
  atSeconds: z.number().describe("Seconds from the start when the price is said."),
  heard: z.string().describe("The words as said, in the language spoken."),
  amount: z.number().describe("The price as a number in the store currency."),
  product: z
    .number()
    .int()
    .nullable()
    .describe("Index in products of the item this price is for. null if it is unclear."),
});

export const watchSchema = z.object({
  products: z.array(watchedProductSchema),
  prices: z.array(heardPriceSchema),
});

export type WatchedProduct = z.infer<typeof watchedProductSchema>;
export type HeardPrice = z.infer<typeof heardPriceSchema>;
export type Watch = z.infer<typeof watchSchema>;

export type WatcherSettings = { currency: Currency; labelLanguage: LabelLanguage };

export type VideoInput = { blob: Blob; mimeType: string };

const LANGUAGE_NAMES: Record<LabelLanguage, string> = {
  km: "Khmer",
  si: "Sinhala",
  ta: "Tamil",
  th: "Thai",
  en: "English",
};

function instruction({ currency, labelLanguage }: WatcherSettings): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You catalogue the products in a small shop from a video the owner recorded on their phone.
The owner walks past one shelf and may say prices out loud, often mixing ${language} and English, with numbers in either language.

Products: list every distinct product for sale that is visible.
- Labels are mostly in ${language}. Copy local-script names exactly as printed into localName.
- The same product seen more than once is one item. Different sizes, colours or flavours are separate items.
- Ignore people, hands, furniture and anything that is not for sale.
- Keep the order in which products first appear.

Prices: list every price the owner says, in ${currency}.
- Record when it is said and the words as said.
- Set product to the item it is for: usually the one on screen or pointed at while it is said.
- Never guess or invent a price. A product with no price said simply has no entry.`;
}

// Uploads the video, then asks Gemini to read it.
export function createWatcher(settings: WatcherSettings, video: VideoInput): FunctionNode<unknown, Watch> {
  const model = new LlmAgent({
    name: "watcherModel",
    description: "Lists the products in a shelf video and the prices said out loud.",
    model: geminiModel(),
    instruction: instruction(settings),
    outputSchema: watchSchema,
  });

  return new FunctionNode("watcher", async (ctx) => {
    const upload = await uploadVideo(video.blob, video.mimeType);
    try {
      const result = await ctx.runNode(model, createUserContent([upload.part, "Catalogue this shelf."]));
      return watchSchema.parse(result.output);
    } finally {
      upload.release();
    }
  });
}

const BOX_GRID = 1000;

// Gemini's [ymin, xmin, ymax, xmax] on a 0–1000 grid → fractions of the frame.
export function toFrameBox(box: readonly number[] | null): FrameBox | null {
  if (!box || box.length !== 4) return null;
  const [top, left, bottom, right] = box.map((value) => Math.min(Math.max(value, 0), BOX_GRID));
  if (right <= left || bottom <= top) return null;
  return {
    left: left / BOX_GRID,
    top: top / BOX_GRID,
    width: (right - left) / BOX_GRID,
    height: (bottom - top) / BOX_GRID,
  };
}
