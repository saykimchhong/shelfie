import { describe, expect, it } from "vitest";
import type { Product } from "@/domain/product";
import { addOne, formatQuantity, removeOne } from "./quantity";
import { matchesSearch, showsSearch } from "./search";

const product = (name: string, extra: Partial<Product> = {}): Product => ({
  id: name,
  name,
  price: 1,
  inStock: true,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const rice = product("Hom Mali Rice 5kg", { localName: "ข้าวหอมมะลิ", category: "Rice", shelf: "Dry goods" });

describe("matchesSearch", () => {
  it("finds words anywhere in the name, label name, category or shelf", () => {
    expect(matchesSearch(rice, "rice")).toBe(true);
    expect(matchesSearch(rice, "MALI 5KG")).toBe(true);
    expect(matchesSearch(rice, "dry")).toBe(true);
    expect(matchesSearch(rice, "rice noodles")).toBe(false);
  });

  it("matches part of a Thai or Khmer word, written without spaces", () => {
    expect(matchesSearch(rice, "ข้าว")).toBe(true);
    expect(matchesSearch(product("Fish Sauce", { localName: "ទឹកត្រី" }), "ត្រី")).toBe(true);
  });

  it("shows everything for an empty search", () => {
    expect(matchesSearch(rice, "   ")).toBe(true);
  });
});

describe("showsSearch", () => {
  it("appears sooner for grocery-style shops", () => {
    expect([showsSearch(8, true), showsSearch(8, false), showsSearch(16, false)]).toEqual([true, false, true]);
  });
});

describe("quantity steps", () => {
  it("weighs in half kilos after a first whole one", () => {
    expect(addOne(0, "kg")).toBe(1);
    expect(addOne(1, "kg")).toBe(1.5);
    expect(removeOne(1, "kg")).toBe(0.5);
    expect(removeOne(0.5, "kg")).toBe(0);
  });

  it("counts everything else one by one", () => {
    expect([addOne(0, "each"), addOne(2, "bunch"), removeOne(1, "pack")]).toEqual([1, 3, 0]);
  });

  it("formats whole and half quantities", () => {
    expect([formatQuantity(2), formatQuantity(1.5)]).toEqual(["2", "1.5"]);
  });
});
