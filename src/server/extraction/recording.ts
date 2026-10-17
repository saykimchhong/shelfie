import "server-only";
import { FunctionNode } from "@google/adk";
import { z } from "zod";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { watchSchema, type Watch } from "./agents/watcher";

// A Watcher result saved from a real video (`npm run record:watch`), so the
// rest of the pipeline can run again and again without calling Gemini.
export const watchRecordingSchema = z.object({
  video: z.string(),
  model: z.string(),
  recordedAt: z.string(),
  currency: currencySchema,
  labelLanguage: labelLanguageSchema,
  watch: watchSchema,
});

export type WatchRecording = z.infer<typeof watchRecordingSchema>;

export function replayWatcher(watch: Watch): FunctionNode<unknown, Watch> {
  return new FunctionNode("watcher", () => watch);
}
