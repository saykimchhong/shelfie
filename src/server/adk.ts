import "server-only";
import { createUserContent, ThinkingLevel } from "@google/genai";
import { Gemini, InMemoryRunner, LogLevel, setLogLevel, Workflow, type Event, type RunnableNode } from "@google/adk";
import { serverEnv } from "./env";
import { geminiApiKey } from "./gemini";
import { addUsage, logUsage, NO_USAGE, type Usage } from "./usage";

// ADK logs a warning on every run that Workflow is experimental.
setLogLevel(LogLevel.ERROR);

export function geminiModel(): Gemini {
  return new Gemini({ model: serverEnv().GEMINI_MODEL, apiKey: geminiApiKey() });
}

const THINKING_LEVELS = {
  default: undefined,
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
} as const;

// GEMINI_THINKING for the shelf-reading agents; undefined = the model's default.
export function geminiThinkingLevel(): ThinkingLevel | undefined {
  return THINKING_LEVELS[serverEnv().GEMINI_THINKING];
}

// Runs one node (agent, function node…) and resolves to its output.
export type RunNode = <T>(node: RunnableNode, input?: unknown) => Promise<T>;

// Runs `entry` as an ADK workflow in a throwaway session and returns what it
// returns. Each `run(node, input)` inside it is a step of that workflow.
// Token usage over all its calls is logged as one "ai usage" line.
export async function runWorkflow<T>(
  name: string,
  entry: (run: RunNode) => Promise<T>,
  { onEvent, onUsage }: { onEvent?: (event: Event) => void; onUsage?: (usage: Usage) => void } = {},
): Promise<T> {
  const started = performance.now();
  let usage = NO_USAGE;
  let result: { value: T } | undefined;
  const workflow = new Workflow({
    name,
    dynamicEntry: async (ctx) => {
      const run: RunNode = async <O>(node: RunnableNode, input?: unknown) =>
        (await ctx.runNode(node, input)).output as O;
      result = { value: await entry(run) };
      return result.value;
    },
  });

  const runner = new InMemoryRunner({ agent: workflow, appName: "shelfie" });
  // Reading the events is what drives the run.
  try {
    for await (const event of runner.runEphemeral({ userId: "shelfie", newMessage: createUserContent(name) })) {
      if (!event.partial) usage = addUsage(usage, event.usageMetadata);
      onEvent?.(event);
    }
  } finally {
    logUsage(name, serverEnv().GEMINI_MODEL, usage, performance.now() - started, { ok: !!result });
    onUsage?.(usage);
  }

  if (!result) throw new Error(`Workflow ${name} ended without a result`);
  return result.value;
}
