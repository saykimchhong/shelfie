// Times the real Watcher per thinking level and compares each reading with the
// video's fixture (else the first reading).
//
//   npm run bench:watch -- sample-vdo/shoes-store.mp4 --levels default,low --runs 2 [--restock]
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { Event } from "@google/adk";
import { ThinkingLevel } from "@google/genai";
import { currencySchema, labelLanguageSchema } from "@/domain/store";
import { runWorkflow } from "@/server/adk";
import { createShelfMatcher, shelfMatchInput, toMatchIds } from "@/server/extraction/agents/shelf-matcher";
import { createWatcher, type Watch } from "@/server/extraction/agents/watcher";
import { compareWatch, type Agreement } from "@/server/extraction/benchmark";
import { watchRecordingSchema } from "@/server/extraction/recording";
import { serverEnv } from "@/server/env";

const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const LEVELS: Record<string, ThinkingLevel | undefined> = {
  default: undefined,
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    currency: { type: "string", default: "USD" },
    language: { type: "string", default: "en" },
    levels: { type: "string", default: "default,low" },
    runs: { type: "string", default: "2" },
    restock: { type: "boolean", default: false },
    out: { type: "string" },
  },
});

const envFile = [".env.local", ".env"].find((file) => existsSync(file));
if (!envFile) throw new Error("Put GEMINI_API_KEY in .env.local or .env");
process.loadEnvFile(envFile);

const videoPath = (positionals[0] ?? "sample-vdo/shoes-store.mp4").replaceAll("\\", "/");
const mimeType = VIDEO_TYPES[path.extname(videoPath).toLowerCase()];
if (!mimeType) throw new Error(`Unsupported video type: ${videoPath}`);

const levels = values.levels.split(",").map((level) => level.trim());
for (const level of levels) if (!(level in LEVELS)) throw new Error(`Unknown level "${level}": ${Object.keys(LEVELS).join(", ")}`);
const runs = Number(values.runs);
const settings = {
  currency: currencySchema.parse(values.currency),
  labelLanguage: labelLanguageSchema.parse(values.language),
};

const bytes = await readFile(videoPath);
const blob = new Blob([bytes], { type: mimeType });

const fixturePath = `src/server/extraction/fixtures/${path.parse(videoPath).name}.watch.json`;
let reference: Watch | null = existsSync(fixturePath)
  ? watchRecordingSchema.parse(JSON.parse(await readFile(fixturePath, "utf8"))).watch
  : null;

type Tokens = { input: number; thinking: number; output: number };

type Result = {
  level: string;
  run: number;
  ok: boolean;
  error?: string;
  totalMs?: number;
  uploadMs?: number;
  modelMs?: number;
  tokens?: Tokens;
  agreement?: Omit<Agreement, "pairs">;
  shelf?: { ms: number; correct: number; of: number };
  watch?: Watch;
};

function tokenCounter(author: string) {
  const tokens: Tokens = { input: 0, thinking: 0, output: 0 };
  return {
    tokens,
    onEvent(event: Event) {
      const usage = event.usageMetadata;
      if (event.author !== author || !usage) return;
      tokens.input += usage.promptTokenCount ?? 0;
      tokens.thinking += usage.thoughtsTokenCount ?? 0;
      tokens.output += usage.candidatesTokenCount ?? 0;
    },
  };
}

async function watchOnce(level: string): Promise<{ watch: Watch; result: Partial<Result> }> {
  let timing = { uploadMs: 0, modelMs: 0 };
  const counter = tokenCounter("watcherModel");
  const watcher = createWatcher(
    settings,
    { blob, mimeType },
    { thinkingLevel: LEVELS[level], onTiming: (measured) => (timing = measured) },
  );
  const started = performance.now();
  const watch = await runWorkflow("benchWatch", (run) => run<Watch>(watcher), { onEvent: counter.onEvent });
  return { watch, result: { totalMs: Math.round(performance.now() - started), ...timing, tokens: counter.tokens } };
}

// Restock of the reference shelf: shared products should match their reference id.
async function matchShelf(level: string, watch: Watch, against: Watch, pairs: (number | null)[]) {
  const known = against.products.map((product, index) => ({
    id: `ref${index}`,
    name: product.name,
    localName: product.localName ?? undefined,
    price: null,
  }));
  const started = performance.now();
  const output = await runWorkflow("benchShelf", (run) =>
    run(createShelfMatcher({ thinkingLevel: LEVELS[level] }), shelfMatchInput(watch.products, known)),
  );
  const ms = Math.round(performance.now() - started);
  const matchIds = toMatchIds(output, watch.products.length, known);
  const correct = matchIds.filter((id, index) => id === (pairs[index] === null ? null : `ref${pairs[index]}`)).length;
  return { ms, correct, of: watch.products.length };
}

const seconds = (ms?: number) => (ms === undefined ? "-" : (ms / 1000).toFixed(1));
const ratio = (part: number, whole: number) => `${part}/${whole}`;

console.log(`Benchmarking ${videoPath} (${(bytes.length / 1024 / 1024).toFixed(1)} MB) with ${serverEnv().GEMINI_MODEL}`);
console.log(`Levels: ${levels.join(", ")} · ${runs} run(s) each · reference: ${reference ? fixturePath : "first reading"}\n`);
console.log(
  ["level", "run", "total s", "upload s", "model s", "in tok", "think tok", "out tok", "products", "match ref", "same price", "shelf"]
    .map((title) => title.padEnd(10))
    .join(""),
);

const results: Result[] = [];
for (const level of levels) {
  for (let run = 1; run <= runs; run++) {
    const result: Result = { level, run, ok: false };
    try {
      const { watch, result: measured } = await watchOnce(level);
      Object.assign(result, measured, { ok: true, watch });
      reference ??= watch;
      const { pairs, ...agreement } = compareWatch(watch, reference);
      result.agreement = agreement;
      if (values.restock) result.shelf = await matchShelf(level, watch, reference, pairs);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    results.push(result);

    const { tokens, agreement, shelf } = result;
    console.log(
      (result.ok
        ? [
            level,
            run,
            seconds(result.totalMs),
            seconds(result.uploadMs),
            seconds(result.modelMs),
            tokens?.input,
            tokens?.thinking,
            tokens?.output,
            agreement?.products,
            agreement ? ratio(agreement.matched, agreement.reference) : "-",
            agreement ? ratio(agreement.samePrice, agreement.matched) : "-",
            shelf ? `${ratio(shelf.correct, shelf.of)} ${seconds(shelf.ms)}s` : "-",
          ]
        : [level, run, `FAILED: ${result.error}`]
      )
        .map((cell) => String(cell ?? "-").padEnd(10))
        .join(""),
    );
  }
}

const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted.length === 0 ? undefined : sorted[Math.floor((sorted.length - 1) / 2)];
};

console.log("\nMedian per level:");
for (const level of levels) {
  const ok = results.filter((result) => result.level === level && result.ok);
  if (ok.length === 0) {
    console.log(`  ${level.padEnd(8)} all runs failed`);
    continue;
  }
  const total = median(ok.map((result) => result.totalMs!));
  const model = median(ok.map((result) => result.modelMs!));
  const thinking = median(ok.map((result) => result.tokens!.thinking));
  const matched = median(ok.map((result) => result.agreement!.matched));
  console.log(
    `  ${level.padEnd(8)} total ${seconds(total)} s · model ${seconds(model)} s · ${thinking} thinking tokens · matched ${matched}/${reference?.products.length ?? "?"} of the reference`,
  );
}

if (values.out) {
  await writeFile(values.out, `${JSON.stringify({ video: videoPath, model: serverEnv().GEMINI_MODEL, results }, null, 2)}\n`);
  console.log(`\nSaved to ${values.out}`);
}
