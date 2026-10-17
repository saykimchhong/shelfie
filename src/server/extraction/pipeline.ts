import "server-only";
import type { RunnableNode } from "@google/adk";
import type { AgentEvent, AgentStep } from "@/domain/agents";
import type { Extraction, KnownProduct } from "@/domain/extraction";
import type { Currency } from "@/domain/store";
import { pluralize } from "@/lib/format";
import { runWorkflow, type RunNode } from "@/server/adk";
import { createChecker } from "./agents/checker";
import { createPriceMatcher, type Pricing } from "./agents/price-matcher";
import { shelfMatchInput, toMatchIds } from "./agents/shelf-matcher";
import { watchSchema, type Watch } from "./agents/watcher";

export type ReportStep = (event: AgentEvent) => void;

// The two AI steps. Mock mode and tests swap them for function nodes.
export type ShelfAgents = { watcher: RunnableNode; shelfMatcher: RunnableNode };

export type ShelfContext = { currency: Currency; known: KnownProduct[] };

type MatchIds = (string | null)[];

// Watcher → Price matcher → Shelf matcher (restock only) → Checker.
export function readShelf(agents: ShelfAgents, context: ShelfContext, report: ReportStep): Promise<Extraction> {
  const step = stepper(report);

  return runWorkflow("shelfReader", async (run) => {
    const watch = await step("watcher", async () => watchSchema.parse(await run(agents.watcher)), {
      summarize: summarizeWatch,
    });

    const pricing = await step("priceMatcher", () => run<Pricing>(createPriceMatcher(), watch), {
      summarize: summarizePricing,
    });

    const matchIds = await step("shelfMatcher", () => matchShelf(run, agents.shelfMatcher, watch, context.known), {
      summarize: summarizeMatches,
      // Without it, the review screen still matches known products by name.
      optional: { skip: context.known.length === 0, fallback: () => watch.products.map(() => null) },
    });

    return step("checker", () => run<Extraction>(createChecker(context), { pricing, matchIds }), {
      summarize: summarizeCheck,
    });
  });
}

async function matchShelf(run: RunNode, shelfMatcher: RunnableNode, watch: Watch, known: KnownProduct[]) {
  const output = await run(shelfMatcher, shelfMatchInput(watch.products, known));
  return toMatchIds(output, watch.products.length, known);
}

type StepOptions<T> = {
  summarize: (output: T) => string;
  // An optional step can be skipped, and its failure isn't fatal: the
  // pipeline carries on with the fallback.
  optional?: { skip: boolean; fallback: () => T };
};

function stepper(report: ReportStep) {
  return async function step<T>(name: AgentStep, work: () => Promise<T>, { summarize, optional }: StepOptions<T>) {
    if (optional?.skip) {
      report({ step: name, status: "skipped" });
      return optional.fallback();
    }

    report({ step: name, status: "running" });
    try {
      const output = await work();
      report({ step: name, status: "done", summary: summarize(output) });
      return output;
    } catch (error) {
      report({ step: name, status: "failed" });
      if (!optional) throw error;
      console.error(`Agent step ${name} failed`, error);
      return optional.fallback();
    }
  };
}

function summarizeWatch(watch: Watch): string {
  return `Found ${pluralize(watch.products.length, "product")}, heard ${pluralize(watch.prices.length, "price")}`;
}

function summarizePricing(pricing: Pricing): string {
  const paired = pricing.products.filter((product) => product.price !== null).length;
  const summary = `Paired ${pluralize(paired, "price")}`;
  return pricing.unpaired.length > 0 ? `${summary}, ${pricing.unpaired.length} unclear` : summary;
}

function summarizeMatches(matchIds: MatchIds): string {
  return `${matchIds.filter(Boolean).length} already in your shop`;
}

function summarizeCheck(extraction: Extraction): string {
  const flagged = extraction.products.filter((product) => product.note !== null).length;
  return flagged > 0 ? `${flagged} to double-check` : "All clear";
}
