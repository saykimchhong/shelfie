import type { Product } from "@/domain/product";
import { sampleStorefront } from "@/domain/samples";
import { SHOP_TYPE_INFO } from "@/domain/shop";

// The landing page's example: a Sri Lankan fruit stall with real photos.
const FRUIT: { id: string; name: string; localName: string; price: number; unit: Product["unit"] }[] = [
  { id: "mango", name: "Mango", localName: "අඹ", price: 600, unit: "kg" },
  { id: "pineapple", name: "Pineapple", localName: "අන්නාසි", price: 450, unit: "each" },
  { id: "papaya", name: "Papaya", localName: "පැපොල්", price: 300, unit: "kg" },
  { id: "bananas", name: "Bananas", localName: "කෙසෙල්", price: 250, unit: "kg" },
  { id: "dragon-fruit", name: "Dragon fruit", localName: "ඩ්‍රැගන් ෆෲට්", price: 900, unit: "kg" },
  { id: "lychee", name: "Lychee", localName: "ලිච්චි", price: 1200, unit: "kg" },
];

export function exampleFruitStall() {
  const sample = sampleStorefront("si", { template: "grid", accent: SHOP_TYPE_INFO.market.accent }, "market");
  const store = {
    ...sample.store,
    name: "Nimal's Fruit Stall",
    tagline: "Fresh fruit every morning, Colombo",
    description: undefined,
    // No opening hours, so the example never shows as "Closed".
    hours: undefined,
    priceUnit: "kg" as const,
  };
  const products: Product[] = FRUIT.map((fruit, position) => ({
    ...fruit,
    inStock: true,
    imageUrl: `/landing/${fruit.id}.jpg`,
    position,
    createdAt: 0,
    updatedAt: 0,
  }));
  return { store, products };
}
