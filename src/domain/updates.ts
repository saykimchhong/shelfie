import { z } from "zod";
import { priceUnitSchema } from "./product";

// "Tell AI": the seller types or says what changed ("Coke is 25 now, Milo sold
// out"), the AI proposes product changes, and the seller confirms them.

export const MAX_UPDATE_TEXT = 500;
export const MAX_UPDATE_SECONDS = 60;
// 60 s of 16 kHz mono 16-bit WAV is about 1.9 MB.
export const MAX_UPDATE_AUDIO_BYTES = 2.5 * 1024 * 1024;
export const MAX_UPDATE_PRODUCTS = 500;

// A shop product as the AI sees it. `unit` is already resolved (unitOf).
export const listedProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  localName: z.string().optional(),
  price: z.number().nullable(),
  unit: priceUnitSchema,
  inStock: z.boolean(),
});

export type ListedProduct = z.infer<typeof listedProductSchema>;
export const listedProductsSchema = z.array(listedProductSchema).max(MAX_UPDATE_PRODUCTS);

const nameSchema = z.string().trim().min(1).max(120);

// Only the fields that change.
export const productEditSchema = z.object({
  name: nameSchema.optional(),
  localName: nameSchema.optional(),
  price: z.number().nonnegative().optional(),
  unit: priceUnitSchema.optional(),
  inStock: z.boolean().optional(),
});

export type ProductEdit = z.infer<typeof productEditSchema>;

export const newProductSchema = z.object({
  name: nameSchema,
  localName: nameSchema.nullable(),
  price: z.number().nonnegative().nullable(),
  unit: priceUnitSchema.nullable(),
});

export type NewProduct = z.infer<typeof newProductSchema>;

export const productChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("update"), id: z.string(), edit: productEditSchema }),
  z.object({ kind: z.literal("add"), product: newProductSchema }),
  z.object({ kind: z.literal("remove"), id: z.string() }),
]);

export type ProductChange = z.infer<typeof productChangeSchema>;

// What POST /api/updates returns.
export const updatesResponseSchema = z.object({
  provider: z.enum(["mock", "gemini"]),
  // A voice note written out, so the seller sees what the AI heard.
  heard: z.string().nullable(),
  changes: z.array(productChangeSchema),
});

export type UpdatesResponse = z.infer<typeof updatesResponseSchema>;
