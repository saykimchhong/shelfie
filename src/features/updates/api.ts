import type { Currency, LabelLanguage } from "@/domain/store";
import { updatesResponseSchema, type ListedProduct, type UpdatesResponse } from "@/domain/updates";

export type UpdateRequest = {
  message: { text: string } | { audio: Blob };
  products: ListedProduct[];
  currency: Currency;
  labelLanguage: LabelLanguage;
  idToken: string;
  signal?: AbortSignal;
};

export async function requestUpdates({
  message,
  products,
  currency,
  labelLanguage,
  idToken,
  signal,
}: UpdateRequest): Promise<UpdatesResponse> {
  const body = new FormData();
  if ("text" in message) body.append("text", message.text);
  else body.append("audio", message.audio, "voice.wav");
  body.append("products", JSON.stringify(products));
  body.append("currency", currency);
  body.append("labelLanguage", labelLanguage);

  const response = await fetch("/api/updates", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body,
    signal,
  });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (json as { error?: unknown } | null)?.error;
    throw new Error(typeof error === "string" ? error : "Couldn't read that. Try again.");
  }
  return updatesResponseSchema.parse(json);
}
