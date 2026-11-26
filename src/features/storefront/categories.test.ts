import { describe, expect, it } from "vitest";
import { categoriesOf, categoryKey } from "./categories";

describe("categoriesOf", () => {
  it("merges categories that differ only in case, spaces or a plural s", () => {
    expect(categoriesOf([{ category: "Fruit" }, { category: "fruits" }, { category: " Fruits " }, { category: "Vegetables" }])).toEqual([
      "Fruit",
      "Vegetables",
    ]);
  });

  it("skips products without a category and keeps first-seen order", () => {
    expect(categoriesOf([{ category: "Drinks" }, {}, { category: "Snacks" }, { category: "drink" }])).toEqual(["Drinks", "Snacks"]);
  });
});

describe("categoryKey", () => {
  it("leaves short words and non-Latin scripts alone", () => {
    expect(categoryKey("Gas")).toBe("gas");
    expect(categoryKey("ผลไม้")).toBe("ผลไม้");
    expect(categoryKey("පලතුරු")).toBe("පලතුරු");
  });
});
