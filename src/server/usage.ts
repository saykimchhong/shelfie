import "server-only";
import type { GenerateContentResponseUsageMetadata } from "@google/genai";

// Token counts for one AI call or one workflow, for the "ai usage" log line.

export type Usage = {
  calls: number;
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  cachedTokens: number;
  totalTokens: number;
};

export const NO_USAGE: Usage = { calls: 0, promptTokens: 0, outputTokens: 0, thoughtTokens: 0, cachedTokens: 0, totalTokens: 0 };

export function addUsage(total: Usage, usage: GenerateContentResponseUsageMetadata | undefined): Usage {
  if (!usage) return total;
  return {
    calls: total.calls + 1,
    promptTokens: total.promptTokens + (usage.promptTokenCount ?? 0),
    outputTokens: total.outputTokens + (usage.candidatesTokenCount ?? 0),
    thoughtTokens: total.thoughtTokens + (usage.thoughtsTokenCount ?? 0),
    cachedTokens: total.cachedTokens + (usage.cachedContentTokenCount ?? 0),
    totalTokens: total.totalTokens + (usage.totalTokenCount ?? 0),
  };
}

// One JSON line per AI call, so the hosting logs can be filtered by "ai usage" and added up.
export function logUsage(name: string, model: string, usage: Usage, ms: number, extra: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ message: "ai usage", name, model, ...usage, ms: Math.round(ms), ...extra }));
}
