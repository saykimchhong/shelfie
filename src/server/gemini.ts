import "server-only";
import { createPartFromBase64, createPartFromUri, FileState, GoogleGenAI, type Part } from "@google/genai";
import { serverEnv } from "./env";

// Videos under this size go inline (one round trip). Bigger ones go through the
// Files API, which needs an upload + a wait while Gemini processes the video.
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024;
const PROCESSING_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;

let client: GoogleGenAI | undefined;

export function geminiApiKey(): string {
  const key = serverEnv().GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set (https://aistudio.google.com/apikey)");
  return key;
}

export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: geminiApiKey() });
  return client;
}

export type GeminiVideo = {
  part: Part;
  // Deletes an uploaded file early; Gemini also removes it after 48h.
  release: () => void;
};

export async function uploadVideo(video: Blob, mimeType: string): Promise<GeminiVideo> {
  if (video.size <= INLINE_LIMIT_BYTES) {
    const base64 = Buffer.from(await video.arrayBuffer()).toString("base64");
    return { part: createPartFromBase64(base64, mimeType), release: () => {} };
  }

  const ai = gemini();
  let file = await ai.files.upload({ file: video, config: { mimeType, displayName: "shelf-video" } });
  const name = file.name!;
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (file.state === FileState.PROCESSING) {
    if (Date.now() > deadline) throw new Error("Gemini took too long to process the video");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    file = await ai.files.get({ name });
  }

  if (file.state !== FileState.ACTIVE || !file.uri) {
    throw new Error(`Gemini could not process the video (${file.state ?? "unknown state"})`);
  }

  return {
    part: createPartFromUri(file.uri, file.mimeType ?? mimeType),
    release: () => void ai.files.delete({ name }).catch(() => {}),
  };
}
