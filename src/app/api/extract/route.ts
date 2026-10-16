import type { ExtractionResponse } from "@/domain/extraction";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { AuthError, requireUser } from "@/server/auth";
import { extractProducts } from "@/server/extraction";

// POST multipart/form-data: video (file), currency, labelLanguage, durationSeconds?
// Header: Authorization: Bearer <Firebase ID token>
// → ExtractionResponse { provider, products }. Mock or Gemini per SHELFIE_AI.

export const maxDuration = 120;

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) return problem(401, error.message);
    throw error;
  }

  const form = await request.formData().catch(() => null);
  const video = form?.get("video");
  const currency = currencySchema.safeParse(form?.get("currency"));
  const labelLanguage = labelLanguageSchema.safeParse(form?.get("labelLanguage") ?? "en");
  const durationSeconds = Number(form?.get("durationSeconds")) || undefined;

  if (!(video instanceof Blob) || video.size === 0) return problem(400, "Attach a video file as `video`");
  if (!video.type.startsWith("video/")) return problem(415, `Expected a video, got ${video.type || "unknown"}`);
  if (video.size > MAX_VIDEO_BYTES) return problem(413, "Video is too large — keep it under 100 MB (about 2 minutes)");
  if (!currency.success) return problem(400, "Missing or unknown `currency`");
  if (!labelLanguage.success) return problem(400, "Unknown `labelLanguage`");

  try {
    const { provider, extraction } = await extractProducts({
      video,
      mimeType: video.type,
      currency: currency.data,
      labelLanguage: labelLanguage.data,
      durationSeconds,
    });
    return Response.json({ provider, ...extraction } satisfies ExtractionResponse);
  } catch (error) {
    console.error("Extraction failed", error);
    return problem(502, "We couldn't read that video. Try again with steady, well-lit footage.");
  }
}

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
