import "server-only";
import type { ListedProduct, ProductChange, UpdatesResponse } from "@/domain/updates";
import { geminiThinkingLevel } from "../adk";
import { extractionProvider } from "../extraction";
import { mockRead } from "./mock";
import { readUpdate, toChanges, type ChatMemory, type ShopSettings, type UpdateMessage } from "./reader";

export type UpdateInput = ShopSettings & ChatMemory & { message: UpdateMessage; products: ListedProduct[] };

export class VoiceNeedsAiError extends Error {
  constructor() {
    super("Voice needs the real AI. Type it instead.");
  }
}

// Used when the AI sends no words back.
const fallbackReply = (changes: readonly ProductChange[]) =>
  changes.length > 0
    ? "Check these changes, then tap Save."
    : "I didn't find anything to change. Name the product and what changed, or ask me about your products.";

export async function readUpdates({ message, products, history, waiting, ...settings }: UpdateInput): Promise<UpdatesResponse> {
  const provider = extractionProvider();
  if (provider === "mock") {
    if (!("text" in message)) throw new VoiceNeedsAiError();
    const output = mockRead(message.text, products);
    const changes = toChanges(output, products, waiting);
    return { provider, heard: null, reply: output.reply || fallbackReply(changes), changes };
  }
  const { heard, reply, changes } = await readUpdate(message, products, settings, {
    thinkingLevel: geminiThinkingLevel(),
    history,
    waiting,
  });
  return { provider, heard, reply: reply || fallbackReply(changes), changes };
}
