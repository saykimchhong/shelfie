import { z } from "zod";
import { extractionResponseSchema, type ExtractionResponse } from "@/domain/extraction";
import type { Currency, LabelLanguage } from "@/domain/store";

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
  idToken: string;
  signal?: AbortSignal;
}): Promise<ExtractionResponse> {
  // The mock doesn't need the video (photos are grabbed from it right here in
  // the browser), so it's only uploaded when the real AI is on — and only if
  // it fits under the hosting platform's request limit.
  const config = await extractionConfig(input.signal);
  if (config.needsVideo && input.video.size > config.maxVideoBytes) {
    const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
    throw new Error(
      `This video is ${mb(input.video.size)} MB; the limit is ${mb(config.maxVideoBytes)} MB. Try a shorter clip or record in 720p.`,
    );
  }

  const body = new FormData();
  if (config.needsVideo) body.append("video", input.video);
  body.append("currency", input.currency);
  body.append("labelLanguage", input.labelLanguage);
  if (input.durationSeconds) body.append("durationSeconds", String(input.durationSeconds));

  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.idToken}` },
    body,
    signal: input.signal,
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (json as { error?: string } | null)?.error;
    throw new Error(message ?? `Something went wrong (${response.status})`);
  }
  return extractionResponseSchema.parse(json);
}
