import { describe, expect, it } from "vitest";
import type { ListedProduct } from "@/domain/updates";
import { mockRead } from "./mock";
import { toChanges } from "./reader";

const products: ListedProduct[] = [
  { id: "coke", name: "Coca-Cola 1.5L", price: 20, unit: "each", inStock: true },
  { id: "milo", name: "Milo 400g", price: 95, unit: "each", inStock: true },
  { id: "rice", name: "Jasmine Rice", price: 40, unit: "kg", inStock: false },
  { id: "soap", name: "Lux Soap", price: 15, unit: "each", inStock: true },
];

const changes = (text: string) => toChanges(mockRead(text, products), products);

describe("mock update reader", () => {
  it("reads prices, stock and removals in one message", () => {
    expect(changes("Milo 99, coca-cola sold out and rice back in stock; remove the soap")).toEqual([
      { kind: "update", id: "milo", edit: { price: 99 } },
      { kind: "update", id: "coke", edit: { inStock: false } },
      { kind: "update", id: "rice", edit: { inStock: true } },
      { kind: "remove", id: "soap" },
    ]);
  });

  it("adds products it doesn't know", () => {
    expect(changes("add free range eggs 4 each, bananas 30 per bunch")).toEqual([
      { kind: "add", product: { name: "Free Range Eggs", localName: null, price: 4, unit: null } },
      { kind: "add", product: { name: "Bananas", localName: null, price: 30, unit: "bunch" } },
    ]);
  });

  it("finds nothing in small talk", () => {
    expect(changes("hello there")).toEqual([]);
  });
});
