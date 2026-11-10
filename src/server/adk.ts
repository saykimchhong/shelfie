import "server-only";
import { createUserContent, ThinkingLevel } from "@google/genai";
import { Gemini, InMemoryRunner, LogLevel, setLogLevel, Workflow, type Event, type RunnableNode } from "@google/adk";
import { serverEnv } from "./env";
import { geminiApiKey } from "./gemini";

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
// `onEvent` sees every event, e.g. to add up token usage.
export async function runWorkflow<T>(
  name: string,
  entry: (run: RunNode) => Promise<T>,
  { onEvent }: { onEvent?: (event: Event) => void } = {},
): Promise<T> {
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
  for await (const event of runner.runEphemeral({ userId: "shelfie", newMessage: createUserContent(name) })) {
    onEvent?.(event);
  }

  if (!result) throw new Error(`Workflow ${name} ended without a result`);
  return result.value;
}
