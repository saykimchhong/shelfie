import "server-only";
import { createUserContent } from "@google/genai";
import { Gemini, InMemoryRunner, LogLevel, setLogLevel, Workflow, type RunnableNode } from "@google/adk";
import { serverEnv } from "./env";
import { geminiApiKey } from "./gemini";

// ADK logs a warning on every run that Workflow is experimental.
setLogLevel(LogLevel.ERROR);

export function geminiModel(): Gemini {
  return new Gemini({ model: serverEnv().GEMINI_MODEL, apiKey: geminiApiKey() });
}

// Runs one node (agent, function node…) and resolves to its output.
export type RunNode = <T>(node: RunnableNode, input?: unknown) => Promise<T>;

// Runs `entry` as an ADK workflow in a throwaway session and returns what it
// returns. Each `run(node, input)` inside it is a step of that workflow.
export async function runWorkflow<T>(name: string, entry: (run: RunNode) => Promise<T>): Promise<T> {
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
  for await (const _event of runner.runEphemeral({ userId: "shelfie", newMessage: createUserContent(name) }));

  if (!result) throw new Error(`Workflow ${name} ended without a result`);
  return result.value;
}
