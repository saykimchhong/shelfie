import "server-only";
import type { ThinkingLevel } from "@google/genai";
import type { Extraction } from "@/domain/extraction";
import type { ShotPick, ShotProduct } from "@/domain/photos";
import { geminiThinkingLevel } from "../adk";
import { serverEnv } from "../env";
import { findShots, type ShotFrame } from "./agents/photo-finder";
import { createListReader, createPhotoReader } from "./agents/readers";
import { createShelfMatcher } from "./agents/shelf-matcher";
import { createWatcher, type WatcherOptions } from "./agents/watcher";
import { mockAgents } from "./mock";
import { readShelf, type ReportStep, type ShelfAgents } from "./pipeline";
import type { ExtractInput, ExtractionProvider } from "./types";

export { MAX_VIDEO_BYTES, type ExtractInput, type ExtractionProvider } from "./types";
export type { ReportStep } from "./pipeline";
export type { ShotFrame } from "./agents/photo-finder";

// The one switch between mock and real AI: SHELFIE_AI in the environment.
export function extractionProvider(): ExtractionProvider {
  return serverEnv().SHELFIE_AI;
}

export async function extractProducts(
  input: ExtractInput,
  report: ReportStep = () => {},
  { onWatcherTiming }: { onWatcherTiming?: WatcherOptions["onTiming"] } = {},
): Promise<{ provider: ExtractionProvider; extraction: Extraction }> {
  const provider = extractionProvider();
  const agents = provider === "gemini" ? geminiAgents(input, onWatcherTiming) : mockAgents(input);
  return { provider, extraction: await readShelf(agents, input, report) };
}

function geminiAgents(input: ExtractInput, onTiming: WatcherOptions["onTiming"]): ShelfAgents {
  const thinkingLevel = geminiThinkingLevel();
  return { watcher: readerFor(input, thinkingLevel, onTiming), shelfMatcher: createShelfMatcher({ thinkingLevel }) };
}

function readerFor(input: ExtractInput, thinkingLevel: ThinkingLevel | undefined, onTiming: WatcherOptions["onTiming"]) {
  if (input.source === "photos") {
    if (!input.photos?.length) throw new Error("The real AI needs the photos");
    return createPhotoReader(input, input.photos, { thinkingLevel });
  }
  if (input.source === "text") {
    if (!input.text) throw new Error("The real AI needs the list");
    return createListReader(input, input.text, { thinkingLevel });
  }
  if (!input.video) throw new Error("The real AI needs the video");
  return createWatcher(input, { blob: input.video, mimeType: input.mimeType }, { thinkingLevel, onTiming });
}

export function findProductShots(products: readonly ShotProduct[], frames: readonly ShotFrame[]): Promise<ShotPick[]> {
  return findShots(products, frames, { thinkingLevel: geminiThinkingLevel() });
}
