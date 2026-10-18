import { describe, expect, it } from "vitest";
import { unitOf } from "@/domain/product";
import { perUnit, quantityWithUnit } from "./format";

describe("price units", () => {
  it("adds nothing for items, so shops without units look as before", () => {
    expect(perUnit("each")).toBe("");
    expect(perUnit("kg")).toBe(" / kg");
  });

  it("writes quantities with their unit", () => {
    expect(quantityWithUnit(3, "each")).toBe("3");
    expect(quantityWithUnit(2, "kg")).toBe("2 kg");
    expect(quantityWithUnit(1, "bunch")).toBe("1 bunch");
    expect(quantityWithUnit(2, "bunch")).toBe("2 bunches");
    expect(quantityWithUnit(2, "pack")).toBe("2 packs");
  });

  it("uses the product's unit, else the shop's default, else each", () => {
    expect(unitOf({ unit: "pack" }, "kg")).toBe("pack");
    expect(unitOf({}, "kg")).toBe("kg");
    expect(unitOf({})).toBe("each");
  });
});
