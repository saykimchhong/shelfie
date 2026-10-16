import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(120),
  // Name as printed on the label in Khmer / Sinhala / Tamil / Thai, when there is one.
  localName: z.string().trim().max(120).optional(),
  // null = the seller hasn't set a price yet; storefront shows "Ask".
  price: z.number().nonnegative().nullable(),
  category: z.string().trim().max(40).optional(),
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
  category: true,
  inStock: true,
  imageUrl: true,
});

export type ProductInput = z.infer<typeof productInputSchema>;
