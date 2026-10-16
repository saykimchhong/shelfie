import { extractionResponseSchema, type ExtractionResponse } from "@/domain/extraction";
import type { Currency, LabelLanguage } from "@/domain/store";

export async function requestExtraction(input: {
  video: File;
  currency: Currency;
  labelLanguage: LabelLanguage;
  durationSeconds?: number;
  idToken: string;
  signal?: AbortSignal;
}): Promise<ExtractionResponse> {
  const body = new FormData();
  body.append("video", input.video);
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
