import { z } from "zod";

// The exact shape we ask Gemini to return. Descriptions are part of the prompt.
export const extractedProductSchema = z.object({
  name: z
    .string()
    .describe("Short English name a customer would search for: brand + product + size if visible."),
  localName: z
    .string()
    .nullable()
    .describe("Name exactly as printed on the label in Khmer, Sinhala, Tamil or Thai script. null if none."),
  price: z
    .number()
    .nullable()
    .describe("Price the seller says out loud for this product, in the store currency. null if not said."),
  category: z.string().nullable().describe("One or two English words, e.g. Rice, Snacks, Soap."),
  seenAtSeconds: z.number().describe("Seconds from the start of the video where the product is clearest."),
  confidence: z.number().min(0).max(1).describe("0 to 1: how sure you are about the name and price."),
  matchId: z
    .string()
    .nullable()
    .describe("id of the shop's existing product this is, from the list in the prompt. null if it is new."),
  note: z
    .string()
    .nullable()
    .describe("Only if the seller should double-check: a few words, e.g. 'Price not said'. Otherwise null."),
});

export const extractionSchema = z.object({
  products: z.array(extractedProductSchema),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>;
export type Extraction = z.infer<typeof extractionSchema>;

// What POST /api/extract returns: the extraction plus which AI produced it,
// so the UI can label mock results honestly.
export const extractionResponseSchema = extractionSchema.extend({
  provider: z.enum(["mock", "gemini"]),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

// Products the shop already has on the filmed shelf, sent with the video so the
// AI can recognise them (matchId) instead of listing them again as new.
export const knownProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  localName: z.string().optional(),
  price: z.number().nullable(),
});

export type KnownProduct = z.infer<typeof knownProductSchema>;

// Far more than one shelf holds; keeps the prompt and the request small.
export const MAX_KNOWN_PRODUCTS = 500;
export const knownProductsSchema = z.array(knownProductSchema).max(MAX_KNOWN_PRODUCTS);

// Below this, the review screen should flag the item for the seller to check.
export const LOW_CONFIDENCE = 0.6;
