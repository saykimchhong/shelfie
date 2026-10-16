import "server-only";
import type { Extraction } from "@/domain/extraction";
import { serverEnv } from "../env";
import { geminiExtract } from "./gemini";
import { mockExtract } from "./mock";
import type { ExtractInput, ExtractionProvider } from "./types";

export { MAX_VIDEO_BYTES, type ExtractInput, type ExtractionProvider } from "./types";

// The one switch between mock and real AI: SHELFIE_AI in the environment.
export function extractionProvider(): ExtractionProvider {
  return serverEnv().SHELFIE_AI;
}

export async function extractProducts(
  input: ExtractInput,
): Promise<{ provider: ExtractionProvider; extraction: Extraction }> {
  const provider = extractionProvider();
  if (provider === "gemini") {
    if (!input.video) throw new Error("The real AI needs the video");
    return { provider, extraction: await geminiExtract({ ...input, video: input.video }) };
  }
  return { provider, extraction: await mockExtract(input) };
}
