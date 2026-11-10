import "server-only";
import { LlmAgent } from "@google/adk";
import { createPartFromBase64, createUserContent, type Part, type ThinkingLevel } from "@google/genai";
import { z } from "zod";
import type { FrameBox } from "@/domain/extraction";
import type { ShotPick, ShotProduct } from "@/domain/photos";
import { chunk } from "@/lib/chunk";
import { geminiModel, runWorkflow } from "@/server/adk";
import { toFrameBox } from "./watcher";

// Picks each product's best still and boxes it there: video boxes drift while the phone pans.

const PRODUCTS_PER_CALL = 6;
const PARALLEL_CALLS = 4;

const finderSchema = z.object({
  picks: z.array(
    z.object({
      product: z.number().int().describe("The product's number, as given."),
      frame: z
        .number()
        .int()
        .nullable()
        .describe("The number of the frame that shows this product best. null if none shows it clearly."),
      box: z
        .array(z.number())
        .length(4)
        .nullable()
        .describe("[ymin, xmin, ymax, xmax] of the product in that frame, each 0-1000. null when frame is null."),
    }),
  ),
});

const INSTRUCTION = `You choose catalogue photos for a small shop. The owner filmed their shelf on a phone; each product below comes with a few still frames from that video, taken a moment apart.
For each product, pick the frame where that exact product is sharpest, most fully in view, and least covered by hands, on-screen text or other items. Then box the product tightly in that frame.
- Box only that product: one item, or the matching pair when a pair is shown together. Not its neighbours, the shelf or price tags.
- The hint says roughly where it was in the middle frame. Use it to tell look-alike products apart.
- If no frame clearly shows the product, return null for frame and box.
Return one pick for every product.`;

export type ShotFrame = { data: Blob; mimeType: string };

// frames: all products' frames, in product order.
export async function findShots(
  products: readonly ShotProduct[],
  frames: readonly ShotFrame[],
  { thinkingLevel }: { thinkingLevel?: ThinkingLevel } = {},
): Promise<ShotPick[]> {
  const offsets = frameOffsets(products);
  const pickGroup = async (indexes: number[]) => {
    const group = indexes.map((index) => products[index]);
    const groupFrames = indexes.map((index) => frames.slice(offsets[index], offsets[index] + products[index].frames));
    const parts = await promptParts(group, groupFrames);
    const output = await runWorkflow("photoFinder", (run) => run(createPhotoFinder(thinkingLevel), createUserContent(parts)));
    return toPicks(output, group);
  };

  const picks: ShotPick[] = [];
  const groups = chunk(
    products.map((_, index) => index),
    PRODUCTS_PER_CALL,
  );
  for (const wave of chunk(groups, PARALLEL_CALLS)) {
    const results = await Promise.allSettled(wave.map(pickGroup));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        picks.push(...result.value);
      } else {
        console.error("Photo finder call failed", result.reason);
        picks.push(...wave[index].map(() => ({ frame: null, box: null })));
      }
    });
  }
  return picks;
}

function createPhotoFinder(thinkingLevel?: ThinkingLevel): LlmAgent {
  return new LlmAgent({
    name: "photoFinder",
    description: "Picks the best video frame for each product and boxes the product in it.",
    model: geminiModel(),
    instruction: INSTRUCTION,
    outputSchema: finderSchema,
    generateContentConfig: thinkingLevel ? { thinkingConfig: { thinkingLevel } } : undefined,
  });
}

function frameOffsets(products: readonly ShotProduct[]): number[] {
  let next = 0;
  return products.map((product) => {
    const offset = next;
    next += product.frames;
    return offset;
  });
}

// Numbered from 1 for the model.
async function promptParts(products: readonly ShotProduct[], frames: readonly ShotFrame[][]): Promise<Part[]> {
  const parts: Part[] = [];
  for (const [index, product] of products.entries()) {
    parts.push({ text: describeProduct(product, index + 1) });
    for (const [frame, { data, mimeType }] of frames[index].entries()) {
      parts.push({ text: `Product ${index + 1}, frame ${frame + 1}:` });
      parts.push(createPartFromBase64(Buffer.from(await data.arrayBuffer()).toString("base64"), mimeType));
    }
  }
  return parts;
}

export function describeProduct(product: ShotProduct, number: number): string {
  const name = product.localName ? `${product.name} (${product.localName})` : product.name;
  const hint = product.hint ? `[${toGridBox(product.hint).join(", ")}]` : "none";
  return `Product ${number}: ${name}. Hint: ${hint}.`;
}

// Invalid picks become no pick.
export function toPicks(output: unknown, products: readonly ShotProduct[]): ShotPick[] {
  const parsed = finderSchema.safeParse(output);
  const picks: ShotPick[] = products.map(() => ({ frame: null, box: null }));
  if (!parsed.success) return picks;

  for (const { product, frame, box } of parsed.data.picks) {
    const index = product - 1;
    if (index < 0 || index >= products.length || frame === null) continue;
    const frameIndex = frame - 1;
    const frameBox = toFrameBox(box);
    if (frameIndex < 0 || frameIndex >= products[index].frames || !frameBox) continue;
    picks[index] = { frame: frameIndex, box: frameBox };
  }
  return picks;
}

const GRID = 1000;

// Fractions → Gemini's [ymin, xmin, ymax, xmax] on 0–1000.
export function toGridBox({ left, top, width, height }: FrameBox): number[] {
  return [top, left, top + height, left + width].map((value) => Math.round(value * GRID));
}
