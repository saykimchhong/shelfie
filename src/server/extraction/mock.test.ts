import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractionSchema, type KnownProduct } from "@/domain/extraction";
import { mockExtract } from "./mock";
import type { ExtractInput } from "./types";

const input: Omit<ExtractInput, "known"> = {
  video: null,
  mimeType: "",
  currency: "THB",
  labelLanguage: "th",
  durationSeconds: 12,
};

// Skip the simulated "AI is thinking" delay.
async function run(known: KnownProduct[]) {
  const pending = mockExtract({ ...input, known });
  await vi.runAllTimersAsync();
  return extractionSchema.parse(await pending);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("mockExtract", () => {
  it("returns new products for a new shelf, with a missing price and a flagged item", async () => {
    const { products } = await run([]);
    expect(products).toHaveLength(7);
    expect(products.every((item) => item.matchId === null)).toBe(true);
    expect(products.filter((item) => item.price === null)).toHaveLength(1);
    expect(products.filter((item) => item.note !== null).length).toBeGreaterThan(0);
  });

  it("simulates a restock: a new price, a missing product and two new ones", async () => {
    const known: KnownProduct[] = [
      { id: "rice", name: "Jasmine Rice 5kg", price: 250 },
      { id: "sauce", name: "Fish Sauce", price: 45 },
      { id: "milo", name: "Milo 400g", price: 120 },
      { id: "coke", name: "Coke 1.5L", price: 1.5 },
    ];
    const { products } = await run(known);

    expect(products.map((item) => item.matchId)).toEqual(["rice", "sauce", "coke", null, null]);
    expect(products[0].price).toBe(275); // ~10% up, whole baht
    expect(products[1].price).toBe(45);
    expect(products.slice(3).every((item) => !known.some((k) => k.name === item.name))).toBe(true);
    // Timestamps stay inside the video, in order.
    const times = products.map((item) => item.seenAtSeconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.max(...times)).toBeLessThan(12);
  });
});
