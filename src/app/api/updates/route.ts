import type { ZodType } from "zod";
import { shopTypeSchema } from "@/domain/shop";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import {
  chatHistorySchema,
  listedProductsSchema,
  MAX_UPDATE_AUDIO_BYTES,
  MAX_UPDATE_TEXT,
  waitingChangesSchema,
} from "@/domain/updates";
import { AuthError, requireUser } from "@/server/auth";
import { readUpdates, VoiceNeedsAiError, type UpdateInput } from "@/server/updates";

// POST multipart: text or audio (WAV), products (JSON ListedProduct[]), currency,
// labelLanguage, and the chat so far (history, waiting) → UpdatesResponse.
// Nothing is saved or remembered here: the browser keeps the chat and writes the changes.

export const maxDuration = 60;

export async function POST(request: Request) {
  const started = performance.now();
  try {
    await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) return problem(401, error.message);
    throw error;
  }

  const form = await request.formData().catch(() => null);
  const text = String(form?.get("text") ?? "").trim();
  const audio = form?.get("audio");
  const hasAudio = audio instanceof Blob && audio.size > 0;
  if (!text && !hasAudio) return problem(400, "Say or type what changed");
  if (text.length > MAX_UPDATE_TEXT) return problem(400, `Keep it under ${MAX_UPDATE_TEXT} characters`);
  if (hasAudio && (!audio.type.startsWith("audio/") || audio.size > MAX_UPDATE_AUDIO_BYTES)) {
    return problem(400, "`audio` must be a short voice note");
  }

  const products = parseJson(listedProductsSchema, form?.get("products"));
  const history = parseJson(chatHistorySchema, form?.get("history") ?? "[]");
  const waiting = parseJson(waitingChangesSchema, form?.get("waiting") ?? "[]");
  const currency = currencySchema.safeParse(form?.get("currency"));
  const labelLanguage = labelLanguageSchema.safeParse(form?.get("labelLanguage"));
  if (!products || !currency.success || !labelLanguage.success) {
    return problem(400, "Send `products`, `currency` and `labelLanguage`");
  }
  if (!history || !waiting) return problem(400, "`history` and `waiting` aren't readable");

  const input: UpdateInput = {
    message: hasAudio ? { audio } : { text },
    products,
    currency: currency.data,
    labelLanguage: labelLanguage.data,
    shopType: shopTypeSchema.safeParse(form?.get("shopType")).data,
    history,
    waiting,
  };
  try {
    const result = await readUpdates(input);
    console.info(
      JSON.stringify({
        message: "update reader timings",
        provider: result.provider,
        voice: hasAudio,
        products: products.length,
        turns: history.length,
        changes: result.changes.length,
        totalMs: Math.round(performance.now() - started),
      }),
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof VoiceNeedsAiError) return problem(501, error.message);
    console.error("Update reader failed", error);
    return problem(502, "Couldn't read that. Try again.");
  }
}

function parseJson<T>(schema: ZodType<T>, value: FormDataEntryValue | null | undefined): T | null {
  if (typeof value !== "string") return null;
  try {
    return schema.safeParse(JSON.parse(value)).data ?? null;
  } catch {
    return null;
  }
}

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
