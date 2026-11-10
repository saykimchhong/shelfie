import "server-only";
import type { ListedProduct, UpdatesResponse } from "@/domain/updates";
import { geminiThinkingLevel } from "../adk";
import { extractionProvider } from "../extraction";
import { mockRead } from "./mock";
import { readUpdate, toChanges, type ShopSettings, type UpdateMessage } from "./reader";

export type UpdateInput = ShopSettings & { message: UpdateMessage; products: ListedProduct[] };

export class VoiceNeedsAiError extends Error {
  constructor() {
    super("Voice needs the real AI. Type it instead.");
  }
}

export async function readUpdates({ message, products, ...settings }: UpdateInput): Promise<UpdatesResponse> {
  const provider = extractionProvider();
  if (provider === "mock") {
    if (!("text" in message)) throw new VoiceNeedsAiError();
    return { provider, heard: null, changes: toChanges(mockRead(message.text, products), products) };
  }
  const { heard, changes } = await readUpdate(message, products, settings, { thinkingLevel: geminiThinkingLevel() });
  return { provider, heard, changes };
}
