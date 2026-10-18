import { describe, expect, it } from "vitest";
import { AGENT_STEPS, type AgentEvent } from "@/domain/agents";
import { feedRows } from "./agentFeed";

describe("feedRows", () => {
  it("lists every step in pipeline order, waiting before any event", () => {
    const rows = feedRows([]);
    expect(rows.map((row) => row.step)).toEqual([...AGENT_STEPS]);
    expect(rows.every((row) => row.status === "waiting")).toBe(true);
  });

  it("keeps the latest event per step and shows its summary", () => {
    const events: AgentEvent[] = [
      { step: "watcher", status: "running" },
      { step: "watcher", status: "done", summary: "Found 7 products, heard 6 prices" },
      { step: "priceMatcher", status: "running" },
    ];
    const [watcher, priceMatcher, shelfMatcher] = feedRows(events);
    expect(watcher).toMatchObject({ status: "done", line: "Found 7 products, heard 6 prices" });
    expect(priceMatcher).toMatchObject({ status: "running", line: "Pairing prices with products" });
    expect(shelfMatcher.status).toBe("waiting");
  });

  it("explains a skipped shelf matcher as a new shelf", () => {
    const shelf = feedRows([{ step: "shelfMatcher", status: "skipped" }])[2];
    expect(shelf).toMatchObject({ status: "skipped", line: "New shelf, nothing to compare" });
  });

  it("gives a failed step its own line, even with a summary", () => {
    const shelf = feedRows([{ step: "shelfMatcher", status: "failed", summary: "ignored" }])[2];
    expect(shelf).toMatchObject({ status: "failed", line: "The review will match by name" });
  });

  it("falls back to a plain line when a done step has no summary", () => {
    expect(feedRows([{ step: "checker", status: "done" }])[3].line).toBe("Done");
  });
});
