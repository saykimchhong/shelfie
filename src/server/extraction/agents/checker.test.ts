import { describe, expect, it } from "vitest";
import type { KnownProduct } from "@/domain/extraction";
import { checkProducts } from "./checker";
import type { PricedProduct } from "./price-matcher";

const priced = (name: string, extra: Partial<PricedProduct> = {}): PricedProduct => ({
  name,
  localName: null,
  category: "Shoes",
  firstSeenSeconds: 0,
  lastSeenSeconds: 4,
  clearestSeconds: 2,
  box: [100, 200, 600, 700],
  confidence: 0.9,
  note: null,
  price: 40,
  priceSaidAt: 2,
  priceIssue: null,
  ...extra,
});

const known: KnownProduct[] = [{ id: "loafer", name: "Tan Loafer", price: 40 }];

function notes(products: PricedProduct[], matchIds: (string | null)[] = products.map(() => null)) {
  return checkProducts({ pricing: { products, unpaired: [] }, matchIds }, { currency: "USD", known }).products.map(
    (product) => product.note,
  );
}

describe("checkProducts", () => {
  it("builds the review product: clearest time, frame box and match", () => {
    const [product] = checkProducts(
      { pricing: { products: [priced("Tan Loafer")], unpaired: [] }, matchIds: ["loafer"] },
      { currency: "USD", known },
    ).products;

    expect(product).toMatchObject({ seenAtSeconds: 2, priceSaidAt: 2, matchId: "loafer", note: null });
    expect(product.box).toEqual({ left: 0.2, top: 0.1, width: 0.5, height: 0.5 });
  });

  it("flags a new product with no price, but not a known one", () => {
    expect(notes([priced("Brogue", { price: null })])).toEqual(["Price not said"]);
    expect(notes([priced("Tan Loafer", { price: null })], ["loafer"])).toEqual([null]);
  });

  it("flags price problems from the Price matcher", () => {
    expect(notes([priced("A", { priceIssue: "several" }), priced("B", { priceIssue: "offscreen" })])).toEqual([
      "Two prices said",
      "Check price",
    ]);
  });

  it("flags a price far from the current one", () => {
    expect(notes([priced("Tan Loafer", { price: 400 })], ["loafer"])).toEqual(["Was $40"]);
    expect(notes([priced("Tan Loafer", { price: 45 })], ["loafer"])).toEqual([null]);
  });

  it("flags the same product listed twice", () => {
    expect(notes([priced("Brogue"), priced("brogue ")])).toEqual(["Listed twice?", "Listed twice?"]);
  });

  it("flags low confidence, keeping the Watcher's reason when it gave one", () => {
    expect(notes([priced("A", { confidence: 0.3 }), priced("B", { confidence: 0.3, note: "Blurry label" })])).toEqual([
      "Check name",
      "Blurry label",
    ]);
  });

  it("ignores a match the shop doesn't have", () => {
    const [product] = checkProducts(
      { pricing: { products: [priced("Brogue")], unpaired: [] }, matchIds: ["gone"] },
      { currency: "USD", known },
    ).products;
    expect(product.matchId).toBeNull();
  });
});
