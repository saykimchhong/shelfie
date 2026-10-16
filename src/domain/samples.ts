// Realistic sample shops, one per label language. Used by the mock AI
// (server/extraction/mock.ts) and the template gallery (/templates), so the
// whole flow can be reviewed without Gemini or real data.
import type { Product } from "./product";
import type { Currency, LabelLanguage, PublicStore } from "./store";
import { DEFAULT_THEME, type Theme } from "./theme";

type SampleItem = {
  name: string;
  localName: string | null;
  // Base price in USD; converted per currency with a sensible rounding step.
  usd: number;
  category: string;
};

const CATALOG: Record<LabelLanguage, SampleItem[]> = {
  en: [
    { name: "Free-range Eggs (10)", localName: null, usd: 3.5, category: "Fresh" },
    { name: "Whole Milk 1L", localName: null, usd: 1.75, category: "Fresh" },
    { name: "Sourdough Loaf", localName: null, usd: 4.25, category: "Bakery" },
    { name: "Wildflower Honey 500g", localName: null, usd: 7.5, category: "Pantry" },
    { name: "Ground Coffee 250g", localName: null, usd: 6, category: "Drinks" },
    { name: "Bananas (bunch)", localName: null, usd: 1.5, category: "Fresh" },
    { name: "Dark Chocolate 70%", localName: null, usd: 2.75, category: "Snacks" },
    { name: "Olive Oil 500ml", localName: null, usd: 8, category: "Pantry" },
  ],
  km: [
    { name: "Jasmine Rice 5kg", localName: "អង្ករផ្កាម្លិះ", usd: 6.5, category: "Rice" },
    { name: "Fish Sauce 700ml", localName: "ទឹកត្រី", usd: 1.5, category: "Sauces" },
    { name: "Palm Sugar 500g", localName: "ស្ករត្នោត", usd: 2, category: "Pantry" },
    { name: "Kampot Pepper 100g", localName: "ម្រេចកំពត", usd: 4.5, category: "Spices" },
    { name: "Instant Noodles (5 pack)", localName: "មីកញ្ចប់", usd: 1.25, category: "Snacks" },
    { name: "Cooking Oil 1L", localName: "ប្រេងឆា", usd: 2.25, category: "Pantry" },
    { name: "Iced Coffee", localName: "កាហ្វេទឹកកក", usd: 1, category: "Drinks" },
    { name: "Prahok 250g", localName: "ប្រហុក", usd: 2.5, category: "Sauces" },
  ],
  si: [
    { name: "Keeri Samba Rice 5kg", localName: "කීරි සම්බා සහල්", usd: 6, category: "Rice" },
    { name: "Coconut Oil 1L", localName: "පොල්තෙල්", usd: 3, category: "Pantry" },
    { name: "Ceylon Tea 200g", localName: "තේ කොළ", usd: 2.5, category: "Drinks" },
    { name: "Red Lentils 1kg", localName: "පරිප්පු", usd: 1.75, category: "Pantry" },
    { name: "Fresh Coconut", localName: "පොල්", usd: 0.5, category: "Fresh" },
    { name: "Sugar 1kg", localName: "සීනි", usd: 1, category: "Pantry" },
    { name: "Cream Crackers", localName: null, usd: 1.25, category: "Snacks" },
    { name: "Kithul Treacle 350ml", localName: "කිතුල් පැණි", usd: 4, category: "Pantry" },
  ],
  ta: [
    { name: "Samba Rice 5kg", localName: "சம்பா அரிசி", usd: 6, category: "Rice" },
    { name: "Coconut Oil 1L", localName: "தேங்காய் எண்ணெய்", usd: 3, category: "Pantry" },
    { name: "Tea Leaves 200g", localName: "தேயிலை", usd: 2.5, category: "Drinks" },
    { name: "Red Lentils 1kg", localName: "பருப்பு", usd: 1.75, category: "Pantry" },
    { name: "Turmeric Powder 100g", localName: "மஞ்சள் தூள்", usd: 1.25, category: "Spices" },
    { name: "Sugar 1kg", localName: "சர்க்கரை", usd: 1, category: "Pantry" },
    { name: "Murukku", localName: "முறுக்கு", usd: 1.5, category: "Snacks" },
    { name: "Jaffna Mango", localName: "மாம்பழம்", usd: 0.75, category: "Fresh" },
  ],
  th: [
    { name: "Hom Mali Rice 5kg", localName: "ข้าวหอมมะลิ", usd: 7, category: "Rice" },
    { name: "Fish Sauce 700ml", localName: "น้ำปลา", usd: 1.5, category: "Sauces" },
    { name: "Instant Noodles", localName: "มาม่า", usd: 0.25, category: "Snacks" },
    { name: "Coconut Milk 400ml", localName: "กะทิ", usd: 1.25, category: "Pantry" },
    { name: "Thai Tea Mix 400g", localName: "ชาไทย", usd: 3.5, category: "Drinks" },
    { name: "Dried Chili 100g", localName: "พริกแห้ง", usd: 1.5, category: "Spices" },
    { name: "Palm Sugar 500g", localName: "น้ำตาลปี๊บ", usd: 1.75, category: "Pantry" },
    { name: "Shrimp Paste", localName: "กะปิ", usd: 2, category: "Sauces" },
  ],
};

const PRICE_STEP: Record<Currency, { rate: number; step: number }> = {
  USD: { rate: 1, step: 0.25 },
  KHR: { rate: 4100, step: 100 },
  LKR: { rate: 300, step: 10 },
  THB: { rate: 36, step: 1 },
};

export function samplePrice(usd: number, currency: Currency): number {
  const { rate, step } = PRICE_STEP[currency];
  return Math.max(step, Math.round((usd * rate) / step) * step);
}

export type SampleProduct = { name: string; localName: string | null; price: number; category: string };

export function sampleCatalog(language: LabelLanguage, currency: Currency): SampleProduct[] {
  return CATALOG[language].map((item) => ({
    name: item.name,
    localName: item.localName,
    price: samplePrice(item.usd, currency),
    category: item.category,
  }));
}

const SAMPLE_SHOPS: Record<
  LabelLanguage,
  { name: string; tagline: string; description: string; currency: Currency }
> = {
  en: {
    name: "Corner Pantry",
    tagline: "Fresh basics, five minutes from you",
    description:
      "A small family pantry on the corner since 2009. Bread arrives every morning at 7, eggs come from a farm twenty minutes away, and we always keep a few treats by the till.\nOpen daily 7am–9pm · Free delivery on orders over $20",
    currency: "USD",
  },
  km: {
    name: "Sokha Mart",
    tagline: "Groceries & Kampot pepper · Phnom Penh",
    description: "Family shop since 1998.\nOpen 6am–9pm · Delivery around Toul Kork",
    currency: "USD",
  },
  si: {
    name: "Kamal Stores",
    tagline: "Your corner shop in Kandy",
    description: "Open 7am–8pm, closed Poya days.",
    currency: "LKR",
  },
  ta: {
    name: "Selvi Stores",
    tagline: "Daily needs · Jaffna",
    description: "Fresh Jaffna mangoes in season.",
    currency: "LKR",
  },
  th: {
    name: "Baan Suan Shop",
    tagline: "Thai pantry staples · Chiang Mai",
    description: "Open every day 8am–8pm near Nimman.",
    currency: "THB",
  },
};

// A complete storefront (store + products) for previews.
export function sampleStorefront(
  language: LabelLanguage,
  theme: Theme = DEFAULT_THEME,
): { store: PublicStore; products: Product[] } {
  const shop = SAMPLE_SHOPS[language];
  const store: PublicStore = {
    slug: "sample",
    name: shop.name,
    tagline: shop.tagline,
    description: shop.description,
    currency: shop.currency,
    labelLanguage: language,
    contact: { whatsapp: "+85512345678" },
    theme,
    published: true,
    createdAt: 0,
    updatedAt: 0,
  };
  const products: Product[] = sampleCatalog(language, shop.currency).map((item, index) => ({
    id: `sample-${index}`,
    name: item.name,
    localName: item.localName ?? undefined,
    // Show the "Ask" and "Sold out" states too.
    price: index === 6 ? null : item.price,
    category: item.category,
    inStock: index !== 4,
    position: index,
    createdAt: 0,
    updatedAt: 0,
  }));
  return { store, products };
}
