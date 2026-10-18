import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    // "mock" returns realistic sample products without calling Gemini (free,
    // instant, no key). Switch to "gemini" when the AI backend is ready.
    SHELFIE_AI: z.enum(["mock", "gemini"]).default("mock"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-3-flash-preview"),
    // Optional: the image model for "AI photo" (src/server/photos.ts has fallbacks).
    GEMINI_IMAGE_MODEL: z.string().min(1).optional(),
  })
  .refine((env) => env.SHELFIE_AI !== "gemini" || !!env.GEMINI_API_KEY, {
    message: "SHELFIE_AI=gemini needs GEMINI_API_KEY (https://aistudio.google.com/apikey)",
    path: ["GEMINI_API_KEY"],
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    SHELFIE_AI: process.env.SHELFIE_AI || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL || undefined,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server env (.env.local).\n${z.prettifyError(parsed.error)}`);
  }

  cached = parsed.data;
  return cached;
}
