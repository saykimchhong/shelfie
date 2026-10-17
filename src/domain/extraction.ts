import { z } from "zod";
import { agentEventSchema } from "./agents";

// Where a product sits in its video frame, as fractions (0–1) of the frame.
export const frameBoxSchema = z.object({
  left: z.number().min(0).max(1),
  top: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export type FrameBox = z.infer<typeof frameBoxSchema>;

// One product the pipeline read from the video, ready for the seller to review.
export const extractedProductSchema = z.object({
  name: z.string(),
  localName: z.string().nullable(),
  // null = no price was said; a known product then keeps its current price.
  price: z.number().nullable(),
  category: z.string().nullable(),
  // When the product is clearest, and where it is in that frame (for its photo).
  seenAtSeconds: z.number(),
  box: frameBoxSchema.nullable(),
  // When the price was said, so the seller can check it.
  priceSaidAt: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  // The shop's existing product this is, or null when it's new.
  matchId: z.string().nullable(),
  // Why the seller should double-check it, in a few words.
  note: z.string().nullable(),
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

// POST /api/extract streams one JSON message per line: a step event as each
// agent starts and finishes, then the result or an error.
export const extractStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), event: agentEventSchema }),
  z.object({ type: z.literal("result"), result: extractionResponseSchema }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);

export type ExtractStreamMessage = z.infer<typeof extractStreamMessageSchema>;

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
