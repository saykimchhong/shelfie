import { connection } from "next/server";
import type { AgentStep } from "@/domain/agents";
import {
  captureSourceSchema,
  knownProductsSchema,
  MAX_CAPTURE_PHOTO_BYTES,
  MAX_CAPTURE_PHOTOS,
  MAX_CAPTURE_TEXT,
  type CaptureSource,
  type ExtractStreamMessage,
  type KnownProduct,
} from "@/domain/extraction";
import { shopTypeSchema } from "@/domain/shop";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { NDJSON_CONTENT_TYPE, ndjsonStream } from "@/lib/ndjson";
import { AuthError, requireUser } from "@/server/auth";
import { extractionProvider, extractProducts, MAX_VIDEO_BYTES } from "@/server/extraction";

// GET  → { provider, needsVideo, maxVideoBytes }: lets the browser skip the
//        upload entirely in mock mode, and check size before uploading.
// POST multipart/form-data: source? (video|photos|text, default video),
//      video (file, real AI only) | photo × 1–10 (images) | text,
//      currency, labelLanguage, durationSeconds?, known? (JSON KnownProduct[]: the shelf's products)
//      Header: Authorization: Bearer <Firebase ID token>
//      → 4xx JSON { error } when the request is invalid, otherwise an NDJSON
//        stream of ExtractStreamMessage: a "step" per agent update, then
//        "result" (ExtractionResponse) or "error".

export const maxDuration = 120;

export async function GET() {
  // Read the AI switch per request, not once at build (static prerender).
  await connection();
  const provider = extractionProvider();
  return Response.json({ provider, needsVideo: provider === "gemini", maxVideoBytes: MAX_VIDEO_BYTES });
}

export async function POST(request: Request) {
  const started = performance.now();
  try {
    await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) return problem(401, error.message);
    throw error;
  }

  const form = await request.formData().catch(() => null);
  // Mostly the phone's upload: the body is only fully read here.
  const receivedMs = Math.round(performance.now() - started);
  const source = captureSourceSchema.safeParse(form?.get("source") ?? "video");
  const video = form?.get("video");
  const photos = (form?.getAll("photo") ?? []).filter((photo): photo is File => photo instanceof Blob && photo.size > 0);
  const text = String(form?.get("text") ?? "").trim();
  const currency = currencySchema.safeParse(form?.get("currency"));
  const labelLanguage = labelLanguageSchema.safeParse(form?.get("labelLanguage") ?? "en");
  // Optional: steers the AI ("a food stall"); an unknown value is just ignored.
  const shopType = shopTypeSchema.safeParse(form?.get("shopType")).data;
  const durationSeconds = Number(form?.get("durationSeconds")) || undefined;
  const known = parseKnown(form?.get("known"));
  const hasVideo = video instanceof Blob && video.size > 0;

  if (!source.success) return problem(400, "Unknown `source`");
  if (source.data === "photos") {
    if (photos.length === 0 || photos.length > MAX_CAPTURE_PHOTOS) {
      return problem(400, `Attach 1 to ${MAX_CAPTURE_PHOTOS} photos as \`photo\``);
    }
    if (photos.some((photo) => !photo.type.startsWith("image/") || photo.size > MAX_CAPTURE_PHOTO_BYTES)) {
      return problem(400, "Each `photo` must be an image under 2 MB");
    }
  }
  if (source.data === "text" && (!text || text.length > MAX_CAPTURE_TEXT)) {
    return problem(400, `Send the list as \`text\`, up to ${MAX_CAPTURE_TEXT} characters`);
  }
  if (source.data === "video" && extractionProvider() === "gemini") {
    if (!hasVideo) return problem(400, "Attach a video file as `video`");
    if (!video.type.startsWith("video/")) return problem(415, `Expected a video, got ${video.type || "unknown"}`);
    if (video.size > MAX_VIDEO_BYTES) return problem(413, "Video is too large — keep it under 30 MB");
  }
  if (!currency.success) return problem(400, "Missing or unknown `currency`");
  if (!labelLanguage.success) return problem(400, "Unknown `labelLanguage`");
  if (!known) return problem(400, "`known` must be a JSON list of products");

  const input = {
    source: source.data,
    photos,
    text,
    video: hasVideo ? video : null,
    mimeType: hasVideo ? video.type : "",
    currency: currency.data,
    labelLanguage: labelLanguage.data,
    shopType,
    durationSeconds,
    known,
  };

  // One JSON log line per video.
  const timings: Timings = {
    source: source.data,
    receivedMs,
    videoBytes: hasVideo ? video.size : 0,
    photoBytes: photos.reduce((sum, photo) => sum + photo.size, 0),
    steps: {},
  };

  const stream = ndjsonStream<ExtractStreamMessage>(async (send) => {
    let ok = false;
    try {
      const { provider, extraction } = await extractProducts(
        input,
        (event) => {
          if (event.ms !== undefined) timings.steps[event.step] = event.ms;
          send({ type: "step", event });
        },
        { onWatcherTiming: ({ uploadMs, modelMs }) => Object.assign(timings, { geminiUploadMs: uploadMs, modelMs }) },
      );
      send({ type: "result", result: { provider, ...extraction } });
      timings.products = extraction.products.length;
      ok = true;
    } catch (error) {
      console.error("Extraction failed", error);
      send({ type: "error", error: FAILED[source.data] });
    } finally {
      const totalMs = Math.round(performance.now() - started);
      console.info(JSON.stringify({ message: "extract timings", provider: extractionProvider(), ok, ...timings, totalMs }));
    }
  });

  return new Response(stream, { headers: { "Content-Type": NDJSON_CONTENT_TYPE, "Cache-Control": "no-store" } });
}

const FAILED: Record<CaptureSource, string> = {
  video: "We couldn't read that video. Try again with steady, well-lit footage.",
  photos: "We couldn't read those photos. Try again with sharp, well-lit photos.",
  text: "We couldn't read that list. Try one product per line, with its price.",
};

type Timings = {
  source: CaptureSource;
  receivedMs: number;
  videoBytes: number;
  photoBytes: number;
  // Real AI only.
  geminiUploadMs?: number;
  modelMs?: number;
  steps: Partial<Record<AgentStep, number>>;
  products?: number;
};

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
