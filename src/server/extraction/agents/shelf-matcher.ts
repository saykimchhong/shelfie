import "server-only";
import { LlmAgent } from "@google/adk";
import { z } from "zod";
import type { KnownProduct } from "@/domain/extraction";
import { geminiModel } from "@/server/adk";
import type { WatchedProduct } from "./watcher";

export const shelfMatchSchema = z.object({
  matches: z.array(
    z.object({
      index: z.number().int().describe("index of the seen product"),
      matchId: z.string().nullable().describe("id of the listed product it is, or null if it is not listed"),
    }),
  ),
});

export type ShelfMatch = z.infer<typeof shelfMatchSchema>;

export type ShelfMatchInput = {
  seen: { index: number; name: string; localName: string | null }[];
  listed: KnownProduct[];
};

const INSTRUCTION = `You match the products seen in a new video of a shop shelf to the products the shop already lists for that shelf.
The input is JSON: "seen" are the products in the video, "listed" are the shop's current products.
For every seen product, return its index and the id of the listed product it is, or null when it is not listed.
- The same product means the same brand, product and size, colour or flavour. Names may be worded differently or be in another language.
- Each listed id matches at most one seen product.
- When unsure, return null: the seller will add it as a new product.`;

export function createShelfMatcher(): LlmAgent {
  return new LlmAgent({
    name: "shelfMatcher",
    description: "Recognises products the shop already sells.",
    model: geminiModel(),
    instruction: INSTRUCTION,
    outputSchema: shelfMatchSchema,
  });
}

export function shelfMatchInput(products: readonly WatchedProduct[], known: readonly KnownProduct[]): ShelfMatchInput {
  return {
    seen: products.map(({ name, localName }, index) => ({ index, name, localName })),
    listed: [...known],
  };
}

// One matchId per seen product. Unknown ids, bad indexes and a second use of
// the same id are dropped, so the review can still match those by name.
export function toMatchIds(output: unknown, count: number, known: readonly KnownProduct[]): (string | null)[] {
  const unused = new Set(known.map((product) => product.id));
  const matchIds: (string | null)[] = Array.from({ length: count }, () => null);

  for (const { index, matchId } of shelfMatchSchema.parse(output).matches) {
    if (!matchId || !unused.has(matchId) || index < 0 || index >= count || matchIds[index]) continue;
    matchIds[index] = matchId;
    unused.delete(matchId);
  }

  return matchIds;
}
