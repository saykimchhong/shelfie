import "server-only";
import type { Extraction } from "@/domain/extraction";
import { serverEnv } from "../env";
import { geminiExtract } from "./gemini";
import { mockExtract } from "./mock";
import type { ExtractInput, ExtractionProvider } from "./types";

export type { ExtractInput, ExtractionProvider } from "./types";

// The one switch between mock and real AI: SHELFIE_AI in .env.local.
export async function extractProducts(
  input: ExtractInput,
): Promise<{ provider: ExtractionProvider; extraction: Extraction }> {
  const provider = serverEnv().SHELFIE_AI;
  const extraction = provider === "gemini" ? await geminiExtract(input) : await mockExtract(input);
  return { provider, extraction };
}
