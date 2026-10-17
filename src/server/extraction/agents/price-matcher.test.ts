import { describe, expect, it } from "vitest";
import { pairPrices } from "./price-matcher";
import type { HeardPrice, WatchedProduct } from "./watcher";

const product = (name: string, firstSeenSeconds: number, lastSeenSeconds: number): WatchedProduct => ({
  name,
  localName: null,
  category: null,
  firstSeenSeconds,
  lastSeenSeconds,
  clearestSeconds: (firstSeenSeconds + lastSeenSeconds) / 2,
  box: null,
  confidence: 0.9,
  note: null,
});

const said = (atSeconds: number, amount: number, product: number | null = null): HeardPrice => ({
  atSeconds,
  heard: String(amount),
  amount,
  product,
});

const shelf = [product("Loafer", 0, 5), product("Brogue", 10, 15), product("Sandal", 12, 20)];

describe("pairPrices", () => {
  it("uses the Watcher's pairing", () => {
    const { products, unpaired } = pairPrices({ products: shelf, prices: [said(13, 45, 1)] });
    expect(products[1]).toMatchObject({ price: 45, priceSaidAt: 13, priceIssue: null });
    expect(unpaired).toEqual([]);
  });

  it("falls back to the only product on screen", () => {
    const { products } = pairPrices({ products: shelf, prices: [said(2, 30)] });
    expect(products[0]).toMatchObject({ price: 30, priceIssue: null });
  });

  it("leaves a price unpaired when several products are on screen", () => {
    const { products, unpaired } = pairPrices({ products: shelf, prices: [said(13, 50)] });
    expect(products.every((item) => item.price === null)).toBe(true);
    expect(unpaired).toHaveLength(1);
  });

  it("keeps the last price said and flags that two were said", () => {
    const { products } = pairPrices({ products: shelf, prices: [said(4, 35, 0), said(1, 30, 0)] });
    expect(products[0]).toMatchObject({ price: 35, priceSaidAt: 4, priceIssue: "several" });
  });

  it("does not flag the same price said twice", () => {
    const { products } = pairPrices({ products: shelf, prices: [said(1, 30, 0), said(4, 30, 0)] });
    expect(products[0].priceIssue).toBeNull();
  });

  it("flags a price said long after the product left the screen", () => {
    const { products } = pairPrices({ products: shelf, prices: [said(18, 25, 0)] });
    expect(products[0]).toMatchObject({ price: 25, priceIssue: "offscreen" });
  });

  it("ignores an out-of-range pairing and falls back to time", () => {
    const { products } = pairPrices({ products: shelf, prices: [said(3, 30, 9)] });
    expect(products[0].price).toBe(30);
  });
});
