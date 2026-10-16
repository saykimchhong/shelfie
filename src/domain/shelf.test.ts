import { describe, expect, it } from "vitest";
import type { Product } from "./product";
import { canonicalShelf, productsOnShelf, shelvesOf, UNSORTED } from "./shelf";

const product = (id: string, shelf?: string): Product => ({
  id,
  name: id,
  price: 1,
  inStock: true,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  shelf,
});

const products = [product("coke", "Drinks"), product("fanta", " drinks "), product("rice", "Rice & oil"), product("soap")];

describe("shelvesOf", () => {
  it("lists each shelf once, in order of first appearance, as first spelled", () => {
    expect(shelvesOf(products)).toEqual(["Drinks", "Rice & oil"]);
  });

  it("is empty when no product has a shelf", () => {
    expect(shelvesOf([product("soap")])).toEqual([]);
  });
});

describe("productsOnShelf", () => {
  it("ignores case and extra spaces", () => {
    expect(productsOnShelf(products, "DRINKS").map((p) => p.id)).toEqual(["coke", "fanta"]);
  });

  it("returns products without a shelf for UNSORTED", () => {
    expect(productsOnShelf(products, UNSORTED).map((p) => p.id)).toEqual(["soap"]);
  });
});

describe("canonicalShelf", () => {
  const shelves = shelvesOf(products);

  it("reuses an existing shelf's spelling", () => {
    expect(canonicalShelf("  drinks ", shelves)).toBe("Drinks");
  });

  it("tidies a new name", () => {
    expect(canonicalShelf(" Snacks   bar ", shelves)).toBe("Snacks bar");
  });

  it("is UNSORTED when blank", () => {
    expect(canonicalShelf("   ", shelves)).toBe(UNSORTED);
  });
});
