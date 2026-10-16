import { describe, expect, it } from "vitest";
import type { ExtractedProduct } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import { toProductUpdate } from "./drafts";
import { mergeShelf, resolveMatches, toKnownProducts } from "./merge";

const product = (id: string, name: string, extra: Partial<Product> = {}): Product => ({
  id,
  name,
  price: 1,
  inStock: true,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const seen = (name: string, extra: Partial<ExtractedProduct> = {}): ExtractedProduct => ({
  name,
  localName: null,
  price: null,
  category: null,
  seenAtSeconds: 1,
  confidence: 0.9,
  matchId: null,
  note: null,
  ...extra,
});

const shelf = [
  product("coke", "Coke 1.5L", { price: 1.5 }),
  product("fanta", "Fanta", { inStock: false }),
  product("sprite", "Sprite", { localName: "สไปรท์" }),
  product("water", "Water", { price: 0.5 }),
];

const video = [
  seen("Coca-Cola", { matchId: "coke", price: 1.75 }), // AI match with a new price
  seen("fanta "), // name match, was sold out
  seen("Lemon soda", { localName: "สไปรท์" }), // label-name match, no price said
  seen("Coke 1.5L"), // same name as a product the AI already matched
  seen("Chips", { matchId: "not-on-this-shelf", price: 2 }),
];

describe("resolveMatches", () => {
  it("uses the AI's matchId first, then name or label name, each product once", () => {
    expect(resolveMatches(video, shelf).map((match) => match?.id ?? null)).toEqual([
      "coke",
      "fanta",
      "sprite",
      null,
      null,
    ]);
  });

  it("matches nothing on a new shelf", () => {
    expect(resolveMatches(video, [])).toEqual([null, null, null, null, null]);
  });
});

describe("mergeShelf", () => {
  const restock = mergeShelf(video, shelf, { restock: true, markMissingSoldOut: true });

  it("groups products by what saving will do", () => {
    expect(restock.drafts.map((draft) => draft.group)).toEqual(["update", "update", "same", "new", "new"]);
  });

  it("keeps a known product's name, and its price when none was said", () => {
    expect(restock.drafts[0].name).toBe("Coke 1.5L");
    expect(restock.drafts[2].price).toBe("1");
  });

  it("offers the shelf's unseen in-stock products, preset from the setting", () => {
    expect(restock.missing.map(({ product: p, soldOut }) => [p.id, soldOut])).toEqual([["water", true]]);
    const keep = mergeShelf(video, shelf, { restock: true, markMissingSoldOut: false });
    expect(keep.missing.map((item) => item.soldOut)).toEqual([false]);
  });

  it("never suggests sold out when only adding products", () => {
    expect(mergeShelf(video, shelf, { restock: false, markMissingSoldOut: true }).missing).toEqual([]);
  });

  it("skips products that are already sold out", () => {
    const soldOut = [product("milo", "Milo", { inStock: false })];
    expect(mergeShelf([], soldOut, { restock: true, markMissingSoldOut: true }).missing).toEqual([]);
  });
});

describe("toProductUpdate", () => {
  const [coke, fanta, sprite] = mergeShelf(video, shelf, { restock: true, markMissingSoldOut: true }).drafts;

  it("writes only what changed", () => {
    expect(toProductUpdate(coke, shelf[0])).toEqual({ id: "coke", patch: { price: 1.75 } });
    expect(toProductUpdate(fanta, shelf[1])).toEqual({ id: "fanta", patch: { inStock: true } });
    expect(toProductUpdate(sprite, shelf[2])).toBeNull();
  });

  it("clears the price when the seller empties it", () => {
    expect(toProductUpdate({ ...sprite, price: "" }, shelf[2])).toEqual({ id: "sprite", patch: { price: null } });
  });
});

describe("toKnownProducts", () => {
  it("sends only what the AI needs", () => {
    expect(toKnownProducts([product("tea", "Tea", { localName: "ชา", shelf: "Drinks", imageUrl: "https://x/y.webp" })])).toEqual([
      { id: "tea", name: "Tea", localName: "ชา", price: 1 },
    ]);
  });
});
