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

export async function requestExtraction(input: {
  video: File;
  currency: Currency;
  labelLanguage: LabelLanguage;
  durationSeconds?: number;
  // The filmed shelf's current products; empty for a new shelf.
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
  const config = await extractionConfig(input.signal);
  let video = input.video;
  if (config.needsVideo && video.size > config.maxVideoBytes) {
    input.onShrink?.(0);
    video = (await shrinkVideo(video, { maxBytes: config.maxVideoBytes, onProgress: input.onShrink, signal: input.signal })) ?? video;
  }
  if (config.needsVideo && video.size > config.maxVideoBytes) {
    const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
    throw new Error(
      `This video is ${mb(video.size)} MB; the limit is ${mb(config.maxVideoBytes)} MB. Try a shorter clip or record in 720p.`,
    );
  }

  const body = new FormData();
  if (config.needsVideo) body.append("video", video);
  body.append("currency", input.currency);
  body.append("labelLanguage", input.labelLanguage);
  if (input.durationSeconds) body.append("durationSeconds", String(input.durationSeconds));
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

  for await (const line of readNdjson(response.body)) {
    const message = extractStreamMessageSchema.parse(line);
    if (message.type === "step") input.onStep?.(message.event);
    else if (message.type === "error") throw new Error(message.error);
    else return message.result;
  }
  throw new Error("The connection closed before the products arrived. Try again.");
}
