import { FunctionNode } from "@google/adk";
import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@/domain/agents";
import { extractionSchema, type KnownProduct } from "@/domain/extraction";
import type { ShelfMatch, ShelfMatchInput } from "./agents/shelf-matcher";
import recorded from "./fixtures/shoes-store.watch.json";
import { readShelf, type ShelfAgents } from "./pipeline";
import { replayWatcher, watchRecordingSchema } from "./recording";

// The real Watcher's output for sample-vdo/shoes-store.mp4, recorded once with
// `npm run record:watch`. Everything after the Watcher runs for real.
const { watch, currency } = watchRecordingSchema.parse(recorded);

const matchByName = new FunctionNode("shelfMatcher", (_ctx, { seen, listed }: ShelfMatchInput): ShelfMatch => ({
  matches: seen.map(({ index, name }) => ({ index, matchId: listed.find((item) => item.name === name)?.id ?? null })),
}));

const failing = new FunctionNode("shelfMatcher", () => {
  throw new Error("model down");
});

async function read(agents: Partial<ShelfAgents>, known: KnownProduct[] = []) {
  const events: AgentEvent[] = [];
  const extraction = await readShelf(
    { watcher: replayWatcher(watch), shelfMatcher: matchByName, ...agents },
    { currency, known },
    (event) => events.push(event),
  );
  return { products: extractionSchema.parse(extraction).products, events };
}

const statuses = (events: AgentEvent[]) => events.map(({ step, status }) => `${step}:${status}`);

describe("readShelf on the recorded shoe store", () => {
  it("turns every product the Watcher saw into a review product", async () => {
    const { products, events } = await read({});

    expect(products.map((product) => product.name)).toEqual(watch.products.map((product) => product.name));
    expect(products.every((product) => product.matchId === null)).toBe(true);
    expect(products.every((product) => product.box !== null)).toBe(true);
    expect(events.find(({ step, status }) => step === "watcher" && status === "done")?.summary).toMatch(
      `Found ${watch.products.length} products`,
    );
    expect(statuses(events)).toContain("shelfMatcher:skipped");
  });

  it("flags new products whose price wasn't said", async () => {
    const { products } = await read({});
    const unpriced = products.filter((product) => product.price === null);
    expect(unpriced.every((product) => product.note === "Price not said")).toBe(true);
  });

  it("recognises products the shop already sells on a restock", async () => {
    const known = watch.products.slice(0, 2).map((product, index) => ({ id: `p${index}`, name: product.name, price: 80 }));
    const { products, events } = await read({}, known);

    expect(products.slice(0, 3).map((product) => product.matchId)).toEqual(["p0", "p1", null]);
    // A known product keeps its price when none is said, so there's nothing to flag.
    expect(products[0].note).not.toBe("Price not said");
    expect(events).toContainEqual({ step: "shelfMatcher", status: "done", summary: "2 already in your shop" });
  });

  it("carries on without matches when the Shelf matcher fails", async () => {
    const known = [{ id: "p0", name: watch.products[0].name, price: 80 }];
    const { products, events } = await read({ shelfMatcher: failing }, known);

    expect(products.every((product) => product.matchId === null)).toBe(true);
    expect(statuses(events)).toEqual([
      "watcher:running",
      "watcher:done",
      "priceMatcher:running",
      "priceMatcher:done",
      "shelfMatcher:running",
      "shelfMatcher:failed",
      "checker:running",
      "checker:done",
    ]);
  });

  it("fails the run when the Watcher fails", async () => {
    const events: AgentEvent[] = [];
    const brokenWatcher = new FunctionNode("watcher", () => {
      throw new Error("video unreadable");
    });

    await expect(
      readShelf({ watcher: brokenWatcher, shelfMatcher: matchByName }, { currency, known: [] }, (event) =>
        events.push(event),
      ),
    ).rejects.toThrow("video unreadable");
    expect(statuses(events)).toEqual(["watcher:running", "watcher:failed"]);
  });
});
