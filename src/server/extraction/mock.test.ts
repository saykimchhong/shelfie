import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@/domain/agents";
import { extractionSchema, type KnownProduct } from "@/domain/extraction";
import { mockAgents } from "./mock";
import { readShelf } from "./pipeline";
import type { ExtractInput } from "./types";

const input: Omit<ExtractInput, "known"> = {
  video: null,
  mimeType: "",
  currency: "THB",
  labelLanguage: "th",
  durationSeconds: 12,
};

async function run(known: KnownProduct[]) {
  const events: AgentEvent[] = [];
  const shelf = { ...input, known };
  const extraction = await readShelf(mockAgents(shelf, { watcherMs: 0, shelfMatcherMs: 0 }), shelf, (event) =>
    events.push(event),
  );
  return { ...extractionSchema.parse(extraction), events };
}

describe("mock agents through the pipeline", () => {
  it("reads a new shelf: a missing price, a flagged item, and no shelf matching", async () => {
    const { products, events } = await run([]);

    expect(products).toHaveLength(7);
    expect(products.every((item) => item.matchId === null)).toBe(true);
    expect(products.filter((item) => item.price === null)).toHaveLength(1);
    expect(products[3].note).toBe("Price not said");
    expect(products[5].note).toBe("Label hard to read");
    expect(events.map(({ step, status }) => `${step}:${status}`)).toEqual([
      "watcher:running",
      "watcher:done",
      "priceMatcher:running",
      "priceMatcher:done",
      "shelfMatcher:skipped",
      "checker:running",
      "checker:done",
    ]);
  });

  it("simulates a restock: a new price, a missing product and two new ones", async () => {
    const known: KnownProduct[] = [
      { id: "rice", name: "Jasmine Rice 5kg", price: 250 },
      { id: "sauce", name: "Fish Sauce", price: 45 },
      { id: "milo", name: "Milo 400g", price: 120 },
      { id: "coke", name: "Coke 1.5L", price: 1.5 },
    ];
    const { products, events } = await run(known);

    expect(products.map((item) => item.matchId)).toEqual(["rice", "sauce", "coke", null, null]);
    expect(products[0].price).toBe(275); // ~10% up, whole baht
    expect(products[1].price).toBe(45);
    expect(products.slice(3).every((item) => !known.some((k) => k.name === item.name))).toBe(true);
    expect(events).toContainEqual({ step: "shelfMatcher", status: "done", summary: "3 already in your shop" });

    // Timestamps stay inside the video, in order.
    const times = products.map((item) => item.seenAtSeconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.max(...times)).toBeLessThan(12);
  });
});
