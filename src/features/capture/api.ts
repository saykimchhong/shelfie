import { z } from "zod";
import type { AgentEvent } from "@/domain/agents";
import { extractStreamMessageSchema, type ExtractionResponse, type KnownProduct } from "@/domain/extraction";
import type { Currency, LabelLanguage } from "@/domain/store";
import { shrinkVideo } from "@/features/media/shrink";
import { readNdjson } from "@/lib/ndjson";

const configSchema = z.object({
  provider: z.enum(["mock", "gemini"]),
  needsVideo: z.boolean(),
  maxVideoBytes: z.number(),
});

async function extractionConfig(signal?: AbortSignal) {
  const response = await fetch("/api/extract", { signal });
  return configSchema.parse(await response.json());
}

// What the seller gave the AI. Photos are already shrunk for upload.
export type CaptureInput =
  | { source: "video"; video: File; durationSeconds?: number }
  | { source: "photos"; photos: Blob[] }
  | { source: "text"; text: string };

export async function requestExtraction(input: {
  capture: CaptureInput;
  currency: Currency;
  labelLanguage: LabelLanguage;
  // The shelf's current products; empty for a new shelf.
  known: KnownProduct[];
  idToken: string;
  signal?: AbortSignal;
  // Each agent's progress while the video is read, for the activity feed.
  onStep?: (event: AgentEvent) => void;
  // 0–1 while a video over the upload cap is made smaller on the phone.
  onShrink?: (progress: number) => void;
}): Promise<ExtractionResponse> {
  // The mock doesn't need the video (photos are grabbed from it right here in
  // the browser), so it's only uploaded when the real AI is on — and only if
  // it fits under the hosting platform's request limit.
  const started = performance.now();
  const { capture } = input;
  const body = new FormData();
  body.append("source", capture.source);
  if (capture.source === "video") {
    const video = await videoForUpload(capture.video, input);
    if (video) body.append("video", video);
    if (capture.durationSeconds) body.append("durationSeconds", String(capture.durationSeconds));
  } else if (capture.source === "photos") {
    capture.photos.forEach((photo, index) => body.append("photo", photo, `photo-${index + 1}`));
  } else {
    body.append("text", capture.text);
  }
  body.append("currency", input.currency);
  body.append("labelLanguage", input.labelLanguage);
  if (input.known.length > 0) body.append("known", JSON.stringify(input.known));

  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.idToken}` },
    body,
    signal: input.signal,
  });
  if (!response.ok || !response.body) {
    const json: unknown = await response.json().catch(() => null);
    const message = (json as { error?: string } | null)?.error;
    throw new Error(message ?? `Something went wrong (${response.status})`);
  }

  let firstStepAt: number | null = null;
  for await (const line of readNdjson(response.body)) {
    const message = extractStreamMessageSchema.parse(line);
    if (message.type === "step") {
      firstStepAt ??= performance.now();
      input.onStep?.(message.event);
    } else if (message.type === "error") throw new Error(message.error);
    else {
      // Before the first agent: prep, shrinking and upload.
      console.info("[capture] timings", {
        source: capture.source,
        beforeAgentsMs: Math.round((firstStepAt ?? started) - started),
        totalMs: Math.round(performance.now() - started),
      });
      return message.result;
    }
  }
  throw new Error("The connection closed before the products arrived. Try again.");
}

// The video to upload: none in mock mode, shrunk on the phone when it's over the cap.
async function videoForUpload(
  original: File,
  { signal, onShrink }: { signal?: AbortSignal; onShrink?: (progress: number) => void },
): Promise<Blob | null> {
  const config = await extractionConfig(signal);
  if (!config.needsVideo) return null;
  let video: Blob = original;
  if (video.size > config.maxVideoBytes) {
    onShrink?.(0);
    video = (await shrinkVideo(original, { maxBytes: config.maxVideoBytes, onProgress: onShrink, signal })) ?? original;
  }
  if (video.size > config.maxVideoBytes) {
    const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
    throw new Error(
      `This video is ${mb(video.size)} MB; the limit is ${mb(config.maxVideoBytes)} MB. Try a shorter clip or record in 720p.`,
    );
  }
  return video;
}
