import { describe, expect, it } from "vitest";
import { sampleCatalog, sampleStorefront } from "./samples";
import { aboutShop, SHOP_TYPE_INFO, SHOP_TYPES, shopTypeOf } from "./shop";
import { PALETTE_PRESETS } from "./theme";

describe("shop types", () => {
  it("suggest a color the picker shows as a swatch", () => {
    const presets: string[] = PALETTE_PRESETS.map((preset) => preset.accent);
    expect(SHOP_TYPES.filter((type) => !presets.includes(SHOP_TYPE_INFO[type].accent))).toEqual([]);
  });

  it("treat stores saved before shop types as general shops", () => {
    expect(shopTypeOf({})).toBe(SHOP_TYPE_INFO.shop);
    expect(aboutShop(undefined)).toBe("");
    expect(aboutShop("food")).toMatch(/^The shop is a food and drinks seller/);
  });
});

describe("samples by shop type", () => {
  it("show each kind of shop its own goods, local to the label language", () => {
    expect(sampleCatalog("th", "THB", "food").map((item) => item.localName)).toContain("ข้าวเหนียวมะม่วง");
    expect(sampleCatalog("si", "LKR", "food").map((item) => item.name)).toContain("Chicken Kottu");
    expect(sampleCatalog("en", "USD", "fashion").map((item) => item.category)).toContain("Shoes");
  });

  it("price market goods by weight or bunch", () => {
    expect(new Set(sampleCatalog("km", "USD", "market").map((item) => item.unit))).toEqual(new Set(["kg", "bunch"]));
  });

  it("keep the pantry for general shops and groceries, with its own shop name", () => {
    expect(sampleCatalog("en", "USD", "grocery")).toEqual(sampleCatalog("en", "USD"));
    expect(sampleStorefront("en", undefined, "food").store.name).toBe("Golden Spoon");
    expect(sampleStorefront("en").store.name).toBe("Corner Pantry");
  });
});
