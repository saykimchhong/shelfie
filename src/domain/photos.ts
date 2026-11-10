import { z } from "zod";
import { frameBoxSchema } from "./extraction";

// POST /api/photos/find: stills per product → the best frame and a box in it.

export const SHOT_FRAMES = 3;
export const SHOT_SPREAD_SECONDS = 0.5;
export const MAX_SHOT_PRODUCTS = 60;
export const MAX_SHOT_FRAME_BYTES = 512 * 1024;

export const shotProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  localName: z.string().trim().max(120).nullable(),
  hint: frameBoxSchema.nullable(),
  frames: z.number().int().min(1).max(SHOT_FRAMES),
});

export type ShotProduct = z.infer<typeof shotProductSchema>;

export const shotProductsSchema = z.array(shotProductSchema).min(1).max(MAX_SHOT_PRODUCTS);

// frame: index among the product's frames; null when none shows it.
export const shotPickSchema = z.object({
  frame: z.number().int().min(0).nullable(),
  box: frameBoxSchema.nullable(),
});

export type ShotPick = z.infer<typeof shotPickSchema>;

export const shotPicksSchema = z.object({ picks: z.array(shotPickSchema) });
