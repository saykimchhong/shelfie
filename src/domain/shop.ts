import { z } from "zod";
import type { PriceUnit } from "./product";
import type { Template } from "./theme";

// What kind of business the store is. It suggests a layout and price unit,
// switches on what that business needs, and tells the AI what it's reading.
// Keep in sync with validStore() in firestore.rules.
export const SHOP_TYPES = ["shop", "food", "grocery", "fashion", "market", "bakery"] as const;
export const shopTypeSchema = z.enum(SHOP_TYPES);
export type ShopType = z.infer<typeof shopTypeSchema>;
export const DEFAULT_SHOP_TYPE: ShopType = "shop";

export type ShopTypeInfo = {
  name: string;
  // For tight spots, e.g. the /templates switch.
  short: string;
  examples: string;
  template: Template;
  priceUnit: PriceUnit;
  // Suggested accent (one of PALETTE_PRESETS).
  accent: string;
  // Storefront with no products yet.
  emptyTitle: string;
  // Placeholder for the note each cart item can carry; null = no notes.
  noteHint: string | null;
  // Ask when the customer wants it: as soon as possible, or a day and time.
  orderTime: boolean;
  // Lots of small items: the storefront shows search sooner.
  manyItems: boolean;
  // For AI prompts: what this shop sells.
  sells: string;
};

export const SHOP_TYPE_INFO: Record<ShopType, ShopTypeInfo> = {
  shop: {
    name: "General shop",
    short: "General",
    examples: "Phones, gifts, household",
    template: "grid",
    priceUnit: "each",
    accent: "#f26430",
    emptyTitle: "Products coming soon",
    noteHint: null,
    orderTime: false,
    manyItems: false,
    sells: "a general shop",
  },
  food: {
    name: "Food & drinks",
    short: "Food",
    examples: "Stall, café, juice bar",
    template: "menu",
    priceUnit: "each",
    accent: "#e03131",
    emptyTitle: "Menu coming soon",
    noteHint: "Note, e.g. less spicy, no ice",
    orderTime: true,
    manyItems: false,
    sells: "a food and drinks seller (stall, café or restaurant): its products are dishes and drinks, often listed on a menu",
  },
  grocery: {
    name: "Grocery",
    short: "Grocery",
    examples: "Mini-mart, pharmacy",
    template: "compact",
    priceUnit: "each",
    accent: "#0f9f8e",
    emptyTitle: "Shelves coming soon",
    noteHint: null,
    orderTime: false,
    manyItems: true,
    sells: "a grocery or mini-mart: its products are packaged goods with a brand and size",
  },
  fashion: {
    name: "Fashion",
    short: "Fashion",
    examples: "Clothes, shoes, bags",
    template: "showcase",
    priceUnit: "each",
    accent: "#334155",
    emptyTitle: "New collection coming soon",
    noteHint: "Note, e.g. gift wrap please",
    orderTime: false,
    manyItems: false,
    sells: "a fashion shop: its products are clothes, shoes or accessories, so names include colour and style",
  },
  market: {
    name: "Fresh market",
    short: "Market",
    examples: "Fruit, veg, meat, fish",
    template: "list",
    priceUnit: "kg",
    accent: "#2f9e44",
    emptyTitle: "Fresh stock coming soon",
    noteHint: "Note, e.g. ripe ones please",
    orderTime: false,
    manyItems: true,
    sells: "a fresh market stall: its products are fruit, vegetables, meat or fish, usually priced per kg",
  },
  bakery: {
    name: "Bakery & cakes",
    short: "Bakery",
    examples: "Cakes, bread, home cooking",
    template: "grid",
    priceUnit: "each",
    accent: "#d6336c",
    emptyTitle: "Fresh bakes coming soon",
    noteHint: "Note, e.g. Happy birthday Mia",
    orderTime: true,
    manyItems: false,
    sells: "a bakery or home kitchen: its products are cakes, bread and snacks, often made to order",
  },
};

// One sentence for AI prompts; empty when the seller hasn't picked a type.
export function aboutShop(shopType: ShopType | undefined): string {
  return shopType ? `The shop is ${SHOP_TYPE_INFO[shopType].sells}.\n` : "";
}

export function shopTypeOf(store: { shopType?: ShopType }): ShopTypeInfo {
  return SHOP_TYPE_INFO[store.shopType ?? DEFAULT_SHOP_TYPE];
}
