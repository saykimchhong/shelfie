// Reads a shelf video with the real Watcher once and saves the result as a
// fixture, then replays it through the rest of the pipeline.
//
//   npm run record:watch -- sample-vdo/shoes-store.mp4 --currency USD --language en
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { runWorkflow } from "@/server/adk";
import { createShelfMatcher } from "@/server/extraction/agents/shelf-matcher";
import { createWatcher, type Watch } from "@/server/extraction/agents/watcher";
import { readShelf } from "@/server/extraction/pipeline";
import { replayWatcher, type WatchRecording } from "@/server/extraction/recording";
import { serverEnv } from "@/server/env";

const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    currency: { type: "string", default: "USD" },
    language: { type: "string", default: "en" },
    out: { type: "string" },
  },
});

process.loadEnvFile(".env.local");

const videoPath = (positionals[0] ?? "sample-vdo/shoes-store.mp4").replaceAll("\\", "/");
const mimeType = VIDEO_TYPES[path.extname(videoPath).toLowerCase()];
if (!mimeType) throw new Error(`Unsupported video type: ${videoPath}`);

const outPath = values.out ?? `src/server/extraction/fixtures/${path.parse(videoPath).name}.watch.json`;
const settings = {
  currency: currencySchema.parse(values.currency),
  labelLanguage: labelLanguageSchema.parse(values.language),
};

console.log(`Reading ${videoPath} with ${serverEnv().GEMINI_MODEL}…`);
const blob = new Blob([await readFile(videoPath)], { type: mimeType });
const watch = await runWorkflow("recordWatch", (run) => run<Watch>(createWatcher(settings, { blob, mimeType })));

const recording: WatchRecording = {
  video: videoPath,
  model: serverEnv().GEMINI_MODEL,
  recordedAt: new Date().toISOString(),
  ...settings,
  watch,
};
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(recording, null, 2)}\n`);
console.log(`Saved to ${outPath}\n`);

const extraction = await readShelf(
  { watcher: replayWatcher(watch), shelfMatcher: createShelfMatcher() },
  { currency: settings.currency, known: [] },
  ({ step, status, summary }) => console.log(`${step.padEnd(13)} ${status.padEnd(8)} ${summary ?? ""}`),
);

console.log();
for (const product of extraction.products) {
  console.log(`- ${product.name} · ${product.price ?? "no price"}${product.note ? ` · ${product.note}` : ""}`);
}
