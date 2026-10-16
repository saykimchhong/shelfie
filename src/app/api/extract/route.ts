import { connection } from "next/server";
import { knownProductsSchema, type ExtractionResponse, type KnownProduct } from "@/domain/extraction";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { AuthError, requireUser } from "@/server/auth";
import { extractionProvider, extractProducts, MAX_VIDEO_BYTES } from "@/server/extraction";

// GET  → { provider, needsVideo, maxVideoBytes }: lets the browser skip the
//        upload entirely in mock mode, and check size before uploading.
// POST multipart/form-data: video (file, real AI only), currency, labelLanguage,
//      durationSeconds?, known? (JSON KnownProduct[]: the filmed shelf's products)
//      Header: Authorization: Bearer <Firebase ID token>
//      → ExtractionResponse { provider, products }

export const maxDuration = 120;

export async function GET() {
  // Read the AI switch per request, not once at build (static prerender).
  await connection();
  const provider = extractionProvider();
  return Response.json({ provider, needsVideo: provider === "gemini", maxVideoBytes: MAX_VIDEO_BYTES });
}

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
  const known = parseKnown(form?.get("known"));
  const hasVideo = video instanceof Blob && video.size > 0;

  if (extractionProvider() === "gemini") {
    if (!hasVideo) return problem(400, "Attach a video file as `video`");
    if (!video.type.startsWith("video/")) return problem(415, `Expected a video, got ${video.type || "unknown"}`);
    if (video.size > MAX_VIDEO_BYTES) return problem(413, "Video is too large — keep it under 30 MB");
  }
  if (!currency.success) return problem(400, "Missing or unknown `currency`");
  if (!labelLanguage.success) return problem(400, "Unknown `labelLanguage`");
  if (!known) return problem(400, "`known` must be a JSON list of products");

  try {
    const { provider, extraction } = await extractProducts({
      video: hasVideo ? video : null,
      mimeType: hasVideo ? video.type : "",
      currency: currency.data,
      labelLanguage: labelLanguage.data,
      durationSeconds,
      known,
    });
    return Response.json({ provider, ...extraction } satisfies ExtractionResponse);
  } catch (error) {
    console.error("Extraction failed", error);
    return problem(502, "We couldn't read that video. Try again with steady, well-lit footage.");
  }
}

// Absent → no known products (a new shelf). null → present but invalid.
function parseKnown(value: FormDataEntryValue | null | undefined): KnownProduct[] | null {
  if (value == null) return [];
  if (typeof value !== "string") return null;
  try {
    const parsed = knownProductsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
