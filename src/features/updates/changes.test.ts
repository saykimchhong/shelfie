import { describe, expect, it } from "vitest";
import type { Product } from "@/domain/product";
import { toListedProducts, toWrites } from "./changes";

const base = { inStock: true, position: 0, createdAt: 0, updatedAt: 0 };
const milo: Product = { ...base, id: "milo", name: "Milo 400g", price: 95, imageUrl: "https://example.com/milo.webp" };
const rice: Product = { ...base, id: "rice", name: "Jasmine Rice", localName: "ข้าวหอมมะลิ", price: 40, unit: "kg" };
const byId = new Map([milo, rice].map((product) => [product.id, product]));

describe("toListedProducts", () => {
  it("resolves each product's unit against the shop default", () => {
    expect(toListedProducts([milo, rice], "pack")).toEqual([
      { id: "milo", name: "Milo 400g", localName: undefined, price: 95, unit: "pack", inStock: true },
      { id: "rice", name: "Jasmine Rice", localName: "ข้าวหอมมะลิ", price: 40, unit: "kg", inStock: true },
    ]);
  });
});

describe("toWrites", () => {
  it("turns kept changes into adds, updates and removals", () => {
    const writes = toWrites(
      [
        { kind: "update", id: "milo", edit: { price: 99, inStock: false } },
        { kind: "add", product: { name: "Eggs", localName: null, price: 4, unit: null } },
        { kind: "remove", id: "rice" },
      ],
      byId,
    );

    expect(writes.update).toEqual([{ id: "milo", patch: { price: 99, inStock: false } }]);
    expect(writes.add).toEqual([{ name: "Eggs", localName: undefined, price: 4, unit: undefined, inStock: true }]);
    expect(writes.remove).toEqual([rice]);
  });

  it("skips products deleted since the AI read the list", () => {
    expect(
      toWrites(
        [
          { kind: "update", id: "gone", edit: { price: 1 } },
          { kind: "remove", id: "gone" },
        ],
        byId,
      ),
    ).toEqual({ add: [], update: [], remove: [] });
  });
});
