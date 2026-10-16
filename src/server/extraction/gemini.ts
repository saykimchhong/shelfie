import "server-only";
import {
  createPartFromBase64,
  createPartFromUri,
  createUserContent,
  FileState,
  GoogleGenAI,
  type Part,
} from "@google/genai";
import { z } from "zod";
import { extractionSchema, type Extraction } from "@/domain/extraction";
import type { Currency, LabelLanguage } from "@/domain/store";
import { serverEnv } from "../env";
import type { ExtractInput } from "./types";

// Videos under this size go inline (one round trip). Bigger ones go through the
// Files API, which needs an upload + a wait while Gemini processes the video.
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024;
const PROCESSING_TIMEOUT_MS = 120_000;

const LANGUAGE_NAMES: Record<LabelLanguage, string> = {
  km: "Khmer",
  si: "Sinhala",
  ta: "Tamil",
  th: "Thai",
  en: "English",
};

// Gemini accepts a JSON Schema subset; drop the meta key it doesn't need.
const { $schema: _schema, ...responseJsonSchema } = z.toJSONSchema(extractionSchema);

let client: GoogleGenAI | undefined;

function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  return client;
}

function buildPrompt(currency: Currency, labelLanguage: LabelLanguage): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You are cataloguing the products in a small shop from a video the owner recorded on their phone.
The owner walks past the shelves and may say prices out loud, often mixing ${language} and English, with numbers in either language.

List every distinct product for sale that is visible in the video:
- Match each spoken price to the product on screen at the moment it is said. Prices are in ${currency}.
- If no price is said for a product, set price to null. Never guess or invent a price.
- Labels are mostly in ${language}. Copy local-script names exactly as printed into localName.
- The same product seen more than once is one item. Different sizes or flavours are separate items.
- Ignore people, hands, furniture and anything that is not for sale.
- Keep the order in which products first appear.`;
}

async function videoPart(video: Blob, mimeType: string): Promise<{ part: Part; fileName?: string }> {
  if (video.size <= INLINE_LIMIT_BYTES) {
    const base64 = Buffer.from(await video.arrayBuffer()).toString("base64");
    return { part: createPartFromBase64(base64, mimeType) };
  }

  const ai = gemini();
  let file = await ai.files.upload({ file: video, config: { mimeType, displayName: "shelf-video" } });
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (file.state === FileState.PROCESSING) {
    if (Date.now() > deadline) throw new Error("Gemini took too long to process the video");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name! });
  }

  if (file.state !== FileState.ACTIVE || !file.uri) {
    throw new Error(`Gemini could not process the video (${file.state ?? "unknown state"})`);
  }

  return { part: createPartFromUri(file.uri, file.mimeType ?? mimeType), fileName: file.name };
}

export async function geminiExtract(input: ExtractInput): Promise<Extraction> {
  const ai = gemini();
  const { part, fileName } = await videoPart(input.video, input.mimeType);

  try {
    const response = await ai.models.generateContent({
      model: serverEnv().GEMINI_MODEL,
      contents: createUserContent([part, buildPrompt(input.currency, input.labelLanguage)]),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return extractionSchema.parse(JSON.parse(response.text ?? "{}"));
  } finally {
    if (fileName) {
      // Uploaded files expire on their own after 48h; this just tidies up early.
      ai.files.delete({ name: fileName }).catch(() => {});
    }
  }
}
