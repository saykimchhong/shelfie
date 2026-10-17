import "server-only";
import type { Extraction } from "@/domain/extraction";
import { serverEnv } from "../env";
import { createShelfMatcher } from "./agents/shelf-matcher";
import { createWatcher } from "./agents/watcher";
import { mockAgents } from "./mock";
import { readShelf, type ReportStep, type ShelfAgents } from "./pipeline";
import type { ExtractInput, ExtractionProvider } from "./types";

export { MAX_VIDEO_BYTES, type ExtractInput, type ExtractionProvider } from "./types";
export type { ReportStep } from "./pipeline";

// The one switch between mock and real AI: SHELFIE_AI in the environment.
export function extractionProvider(): ExtractionProvider {
  return serverEnv().SHELFIE_AI;
}

export async function extractProducts(
  input: ExtractInput,
  report: ReportStep = () => {},
): Promise<{ provider: ExtractionProvider; extraction: Extraction }> {
  const provider = extractionProvider();
  const agents = provider === "gemini" ? geminiAgents(input) : mockAgents(input);
  return { provider, extraction: await readShelf(agents, input, report) };
}

function geminiAgents(input: ExtractInput): ShelfAgents {
  if (!input.video) throw new Error("The real AI needs the video");
  return {
    watcher: createWatcher(input, { blob: input.video, mimeType: input.mimeType }),
    shelfMatcher: createShelfMatcher(),
  };
}
