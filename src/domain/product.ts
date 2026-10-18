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

// The unit a product's price is for: its own, else the shop's default.
export function unitOf(product: { unit?: PriceUnit }, shopDefault?: PriceUnit): PriceUnit {
  return product.unit ?? shopDefault ?? DEFAULT_PRICE_UNIT;
}

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
});

export type ProductInput = z.infer<typeof productInputSchema>;
