import { describe, expect, it } from "vitest";
import { AGENT_STEPS, type AgentEvent } from "@/domain/agents";
import { feedRows, formatDuration } from "./agentFeed";

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

  it("shows how long each finished step took", () => {
    const [watcher, priceMatcher] = feedRows([
      { step: "watcher", status: "done", ms: 6140 },
      { step: "priceMatcher", status: "running" },
    ]);
    expect(watcher.time).toBe("6.1 s");
    expect(priceMatcher.time).toBeNull();
  });
});

describe("formatDuration", () => {
  it("uses milliseconds under a second and seconds above", () => {
    expect(formatDuration(3)).toBe("3 ms");
    expect(formatDuration(999)).toBe("999 ms");
    expect(formatDuration(1000)).toBe("1.0 s");
    expect(formatDuration(12_480)).toBe("12.5 s");
  });
});
