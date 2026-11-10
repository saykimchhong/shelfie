// Realistic sample shops, one per label language. Used by the mock AI
// (server/extraction/mock.ts) and the template gallery (/templates), so the
// whole flow can be reviewed without Gemini or real data.
import type { OpeningHours } from "./hours";
import type { PriceUnit, Product } from "./product";
import type { ShopType } from "./shop";
import type { Currency, LabelLanguage, PublicStore } from "./store";
import { DEFAULT_THEME, type Theme } from "./theme";

type SampleItem = {
  name: string;
  localName: string | null;
  // Base price in USD; converted per currency with a sensible rounding step.
  usd: number;
  category: string;
  // Missing = the shop's own unit.
  unit?: PriceUnit;
};

type Item = [name: string, localName: string | null, usd: number, category: string, unit?: PriceUnit];
const items = (list: Item[]): SampleItem[] =>
  list.map(([name, localName, usd, category, unit]) => ({ name, localName, usd, category, unit }));

// What each kind of shop really sells, in each label language: a Sri Lankan
// café previews kottu and hoppers, a Thai one pad thai.
const TYPE_CATALOG: Partial<Record<ShopType, Record<LabelLanguage, SampleItem[]>>> = {
  food: {
    en: items([
      ["Iced Latte", null, 3.5, "Coffee"],
      ["Flat White", null, 3.25, "Coffee"],
      ["Chicken Rice Bowl", null, 6.5, "Mains"],
      ["Beef Noodle Soup", null, 7, "Mains"],
      ["Avocado Toast", null, 5.5, "Breakfast"],
      ["Fresh Orange Juice", null, 3, "Drinks"],
    ]),
    km: items([
      ["Kuy Teav Noodle Soup", "គុយទាវ", 2.5, "Noodles"],
      ["Beef Lok Lak", "ឡុកឡាក់សាច់គោ", 4.5, "Mains"],
      ["Fish Amok", "អាម៉ុកត្រី", 5, "Mains"],
      ["Fried Rice", "បាយឆា", 2.5, "Rice"],
      ["Iced Coffee", "កាហ្វេទឹកកក", 1.5, "Drinks"],
      ["Sugarcane Juice", "ទឹកអំពៅ", 1, "Drinks"],
    ]),
    si: items([
      ["Chicken Kottu", "චිකන් කොත්තු", 3, "Kottu"],
      ["Rice & Curry", "බත් සහ කරි", 2.5, "Rice"],
      ["Egg Hopper", "බිත්තර ආප්ප", 0.5, "Hoppers"],
      ["String Hoppers (10)", "ඉඳිආප්ප", 1.25, "Hoppers"],
      ["Fish Bun", "මාළු පාන්", 0.5, "Short eats"],
      ["Milk Tea", "කිරි තේ", 0.5, "Drinks"],
    ]),
    ta: items([
      ["Chicken Kothu", "சிக்கன் கொத்து", 3, "Kothu"],
      ["Masala Dosa", "மசாலா தோசை", 2, "Dosa"],
      ["Idli (2)", "இட்லி", 1, "Breakfast"],
      ["Vadai", "வடை", 0.5, "Short eats"],
      ["Rice & Curry", "சோறும் கறியும்", 2.5, "Rice"],
      ["Milk Tea", "பால் தேநீர்", 0.5, "Drinks"],
    ]),
    th: items([
      ["Pad Thai", "ผัดไทย", 2, "Noodles"],
      ["Basil Pork with Fried Egg", "กะเพราหมูไข่ดาว", 2, "Rice"],
      ["Chicken Rice", "ข้าวมันไก่", 1.5, "Rice"],
      ["Tom Yum Soup", "ต้มยำ", 3, "Soups"],
      ["Thai Iced Tea", "ชาไทยเย็น", 1.25, "Drinks"],
      ["Mango Sticky Rice", "ข้าวเหนียวมะม่วง", 2.5, "Desserts"],
    ]),
  },
  market: {
    en: items([
      ["Mangoes", null, 3, "Fruit", "kg"],
      ["Tomatoes", null, 2, "Vegetables", "kg"],
      ["Bananas", null, 1.5, "Fruit", "bunch"],
      ["Spinach", null, 1, "Vegetables", "bunch"],
      ["Chicken Breast", null, 7, "Meat", "kg"],
      ["Fresh Prawns", null, 14, "Seafood", "kg"],
    ]),
    km: items([
      ["Mango", "ស្វាយ", 2, "Fruit", "kg"],
      ["Tomato", "ប៉េងប៉ោះ", 1.25, "Vegetables", "kg"],
      ["Morning Glory", "ត្រកួន", 0.5, "Vegetables", "bunch"],
      ["Banana", "ចេក", 1, "Fruit", "bunch"],
      ["Pork", "សាច់ជ្រូក", 5.5, "Meat", "kg"],
      ["Fish", "ត្រី", 4, "Seafood", "kg"],
    ]),
    si: items([
      ["Mango", "අඹ", 1.5, "Fruit", "kg"],
      ["Tomato", "තක්කාලි", 1.25, "Vegetables", "kg"],
      ["Carrot", "කැරට්", 1, "Vegetables", "kg"],
      ["Banana", "කෙසෙල්", 1, "Fruit", "bunch"],
      ["Chicken", "කුකුළු මස්", 4, "Meat", "kg"],
      ["Fish", "මාළු", 5, "Seafood", "kg"],
    ]),
    ta: items([
      ["Mango", "மாம்பழம்", 1.5, "Fruit", "kg"],
      ["Tomato", "தக்காளி", 1.25, "Vegetables", "kg"],
      ["Onion", "வெங்காயம்", 1, "Vegetables", "kg"],
      ["Banana", "வாழைப்பழம்", 1, "Fruit", "bunch"],
      ["Chicken", "கோழி இறைச்சி", 4, "Meat", "kg"],
      ["Fish", "மீன்", 5, "Seafood", "kg"],
    ]),
    th: items([
      ["Mango", "มะม่วง", 2, "Fruit", "kg"],
      ["Tomato", "มะเขือเทศ", 1.25, "Vegetables", "kg"],
      ["Morning Glory", "ผักบุ้ง", 0.5, "Vegetables", "bunch"],
      ["Banana", "กล้วย", 1, "Fruit", "bunch"],
      ["Pork", "หมู", 5, "Meat", "kg"],
      ["Shrimp", "กุ้ง", 10, "Seafood", "kg"],
    ]),
  },
};

// Fashion and bakery names are usually written in English everywhere.
const FASHION = items([
  ["Leather Loafers", null, 45, "Shoes"],
  ["Canvas Sneakers", null, 35, "Shoes"],
  ["Linen Shirt", null, 25, "Tops"],
  ["Cotton Summer Dress", null, 30, "Dresses"],
  ["Woven Tote Bag", null, 20, "Bags"],
  ["Silk Scarf", null, 15, "Accessories"],
]);

const BAKERY = items([
  ["Chocolate Cake (whole)", null, 18, "Cakes"],
  ["Butter Croissant", null, 2, "Pastries"],
  ["Banana Bread", null, 6, "Breads"],
  ["Cupcakes (6)", null, 9, "Cakes"],
  ["Sourdough Loaf", null, 5, "Breads"],
  ["Custom Birthday Cake", null, 30, "Made to order"],
]);

function catalogFor(language: LabelLanguage, shopType?: ShopType): SampleItem[] {
  if (shopType === "fashion") return FASHION;
  if (shopType === "bakery") return BAKERY;
  return (shopType && TYPE_CATALOG[shopType]?.[language]) || CATALOG[language];
}

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

export type SampleProduct = {
  name: string;
  localName: string | null;
  price: number;
  category: string;
  unit?: PriceUnit;
};

// General shops and groceries get the pantry; other types their own goods.
export function sampleCatalog(language: LabelLanguage, currency: Currency, shopType?: ShopType): SampleProduct[] {
  return catalogFor(language, shopType).map((item) => ({
    name: item.name,
    localName: item.localName,
    price: samplePrice(item.usd, currency),
    category: item.category,
    unit: item.unit,
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

type ShopIdentity = { name: string; tagline: string; description: string };

// Who the sample shop is, for types that aren't a corner pantry.
const TYPE_SHOPS: Partial<Record<ShopType, ShopIdentity>> = {
  food: {
    name: "Golden Spoon",
    tagline: "Street food & fresh drinks",
    description: "Cooked to order from 7am. Order ahead and skip the queue.\nOpen daily 7am–9pm",
  },
  fashion: {
    name: "Lotus Wear",
    tagline: "Shoes, clothes & bags",
    description: "Handpicked styles, new pieces every week.\nAsk for your size · Delivery available",
  },
  market: {
    name: "Green Basket",
    tagline: "Fresh from the farm every morning",
    description: "Fruit and vegetables picked at dawn, meat and fish from trusted suppliers. Prices change daily.",
  },
  bakery: {
    name: "Sweet Crumbs",
    tagline: "Cakes & bakes, made to order",
    description: "Everything baked fresh each morning. Custom cakes need two days' notice.",
  },
};

const SAMPLE_HOURS: OpeningHours = { open: "07:00", close: "21:00", closedDays: [] };

const SAMPLE_TIME_ZONE: Record<LabelLanguage, string> = {
  en: "Asia/Phnom_Penh",
  km: "Asia/Phnom_Penh",
  si: "Asia/Colombo",
  ta: "Asia/Colombo",
  th: "Asia/Bangkok",
};

// A complete storefront (store + products) for previews.
export function sampleStorefront(
  language: LabelLanguage,
  theme: Theme = DEFAULT_THEME,
  shopType?: ShopType,
): { store: PublicStore; products: Product[] } {
  const shop = SAMPLE_SHOPS[language];
  const identity = (shopType && TYPE_SHOPS[shopType]) || shop;
  const store: PublicStore = {
    slug: "sample",
    name: identity.name,
    tagline: identity.tagline,
    description: identity.description,
    currency: shop.currency,
    labelLanguage: language,
    contact: { whatsapp: "+85512345678" },
    theme,
    shopType,
    hours: SAMPLE_HOURS,
    timeZone: SAMPLE_TIME_ZONE[language],
    published: true,
    createdAt: 0,
    updatedAt: 0,
  };
  const products: Product[] = sampleCatalog(language, shop.currency, shopType).map((item, index) => ({
    id: `sample-${index}`,
    name: item.name,
    localName: item.localName ?? undefined,
    unit: item.unit,
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
