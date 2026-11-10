import { describe, expect, it } from "vitest";
import type { ListedProduct } from "@/domain/updates";
import { toChanges, type ReaderOutput } from "./reader";

const products: ListedProduct[] = [
  { id: "coke", name: "Coca-Cola 1.5L", localName: "โค้ก", price: 20, unit: "each", inStock: true },
  { id: "milo", name: "Milo 400g", price: 95, unit: "each", inStock: true },
  { id: "rice", name: "Jasmine Rice", price: 40, unit: "kg", inStock: false },
];

type Change = ReaderOutput["changes"][number];
const none = { product: null, name: null, localName: null, price: null, unit: null, inStock: null };
const update = (product: number, fields: Partial<Change>): Change => ({ ...none, action: "update", product, ...fields });
const add = (name: string, fields: Partial<Change> = {}): Change => ({ ...none, action: "add", name, ...fields });
const read = (...changes: Change[]) => toChanges({ heard: null, changes }, products);

describe("toChanges", () => {
  it("keeps only what actually changes", () => {
    expect(read(update(1, { price: 25 }), update(2, { price: 95, inStock: false }), update(3, { inStock: true }))).toEqual([
      { kind: "update", id: "coke", edit: { price: 25 } },
      { kind: "update", id: "milo", edit: { inStock: false } },
      { kind: "update", id: "rice", edit: { inStock: true } },
    ]);
  });

  it("drops changes to products that aren't listed, and no-op updates", () => {
    expect(read(update(0, { price: 1 }), update(9, { price: 1 }), update(1, { price: 20, unit: "each" }))).toEqual([]);
  });

  it("merges several mentions of one product, later ones winning", () => {
    expect(read(update(1, { price: 22 }), update(1, { inStock: false }), update(1, { price: 25 }))).toEqual([
      { kind: "update", id: "coke", edit: { price: 25, inStock: false } },
    ]);
  });

  it("renames, with trimmed names", () => {
    expect(read(update(2, { name: "  Milo Tin 400g ", localName: "ไมโล" }))).toEqual([
      { kind: "update", id: "milo", edit: { name: "Milo Tin 400g", localName: "ไมโล" } },
    ]);
  });

  it("adds new products once, and treats adding a listed one as an update", () => {
    expect(read(add("Eggs", { price: 4, unit: "each" }), add("eggs"), add("milo 400g", { price: 99 }), add("  "))).toEqual([
      { kind: "update", id: "milo", edit: { price: 99 } },
      { kind: "add", product: { name: "Eggs", localName: null, price: 4, unit: "each" } },
    ]);
  });

  it("removes, and a removal beats an update to the same product", () => {
    expect(read(update(2, { price: 10 }), { ...none, action: "remove", product: 2 })).toEqual([
      { kind: "remove", id: "milo" },
    ]);
  });

  it("ignores impossible prices", () => {
    expect(read(update(1, { price: -5 }), add("Soap", { price: Number.NaN }))).toEqual([
      { kind: "add", product: { name: "Soap", localName: null, price: null, unit: null } },
    ]);
  });
});
