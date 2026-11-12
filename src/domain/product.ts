import { z } from "zod";

export const SHELF_NAME_MAX = 40;

// What one price buys: Rs 600 each, per kg, per bunch, per pack. A product
// without a unit uses its shop's default (store.priceUnit), then "each", so
// shops that never set one look exactly as before. Keep in sync with
// firestore.rules.
export const PRICE_UNITS = ["each", "kg", "bunch", "pack"] as const;
export const priceUnitSchema = z.enum(PRICE_UNITS);
export type PriceUnit = z.infer<typeof priceUnitSchema>;
export const DEFAULT_PRICE_UNIT: PriceUnit = "each";

// How the AI picks a product's unit (part of its prompts). One shop can mix
// them: rice by the kg beside canned fish sold each.
export const PRICE_UNIT_GUIDE =
  'What one price buys. Use what the owner says or the label shows ("per kilo", "/kg", "a bunch") when there is one. ' +
  "Otherwise choose how shops normally sell that product: kg for things sold by weight (loose fruit, vegetables, meat, fish, rice or beans from a sack), " +
  "bunch for herbs and greens tied in bunches, pack for a multi-pack or bundle sold together, each for everything else.";

// The unit a product's price is for: its own, else the shop's default.
export function unitOf(product: { unit?: PriceUnit }, shopDefault?: PriceUnit): PriceUnit {
  return product.unit ?? shopDefault ?? DEFAULT_PRICE_UNIT;
}

// Sizes and colours a customer picks from, e.g. ["S", "M", "L"]. Same price
// for every choice. Keep the caps in sync with validProduct() in firestore.rules.
export const OPTIONS_MAX = 20;
export const OPTION_VALUE_MAX = 24;
const optionsSchema = z.array(z.string().trim().min(1).max(OPTION_VALUE_MAX)).max(OPTIONS_MAX);

export const productSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(120),
  // Name as printed on the label in Khmer / Sinhala / Tamil / Thai, when there is one.
  localName: z.string().trim().max(120).optional(),
  // null = the seller hasn't set a price yet; storefront shows "Ask".
  price: z.number().nonnegative().nullable(),
  // Missing → the shop's default unit (see unitOf).
  unit: priceUnitSchema.optional(),
  category: z.string().trim().max(40).optional(),
  // The shelf or section it sits on, e.g. "Drinks". One video covers one shelf,
  // so restocking a shelf only touches that shelf's products.
  shelf: z.string().trim().max(SHELF_NAME_MAX).optional(),
  inStock: z.boolean(),
  imageUrl: z.url().optional(),
  sizes: optionsSchema.optional(),
  colors: optionsSchema.optional(),
  // Sort order on the shelf; extraction keeps the order things appear in the video.
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Product = z.infer<typeof productSchema>;

export const productInputSchema = productSchema.pick({
  name: true,
  localName: true,
  price: true,
  unit: true,
  category: true,
  shelf: true,
  inStock: true,
  imageUrl: true,
  sizes: true,
  colors: true,
});

export type ProductInput = z.infer<typeof productInputSchema>;

// "S, M, L" → ["S", "M", "L"]: trimmed, no repeats, capped.
export function parseOptions(text: string): string[] {
  const values = text
    .split(/[,\n]+/)
    .map((value) => value.trim().replace(/\s+/g, " ").slice(0, OPTION_VALUE_MAX))
    .filter(Boolean);
  const firstSpelling = new Map<string, string>();
  for (const value of values) if (!firstSpelling.has(value.toLocaleLowerCase())) firstSpelling.set(value.toLocaleLowerCase(), value);
  return [...firstSpelling.values()].slice(0, OPTIONS_MAX);
}

export function hasOptions(product: Pick<Product, "sizes" | "colors">): boolean {
  return Boolean(product.sizes?.length || product.colors?.length);
}

// What the customer picked.
export type Variant = { size?: string; color?: string };
