import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "@/domain/agents";
import { feedRows } from "@/features/capture/agentFeed";
import { requestExtraction } from "@/features/capture/api";
import { GET, POST } from "./route";

// Real /api/extract (mock AI) → requestExtraction → activity feed; only auth is stubbed.

vi.mock("@/server/auth", () => ({
  AuthError: class AuthError extends Error {},
  requireUser: async () => ({ uid: "seller" }),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

vi.mock("@/server/extraction/mock", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/extraction/mock")>();
  return {
    ...actual,
    mockAgents: (input: Parameters<typeof actual.mockAgents>[0]) =>
      actual.mockAgents(input, { watcherMs: 0, shelfMatcherMs: 0 }),
  };
});

beforeEach(() => {
  vi.stubEnv("SHELFIE_AI", "mock");
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const request = new Request(new URL(url, "http://localhost"), init);
    return request.method === "POST" ? POST(request) : GET();
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function read(known: Parameters<typeof requestExtraction>[0]["known"]) {
  const steps: AgentEvent[] = [];
  const result = await requestExtraction({
    video: new File([], "shelf.mp4", { type: "video/mp4" }),
    currency: "THB",
    labelLanguage: "th",
    durationSeconds: 12,
    known,
    idToken: "token",
    onStep: (event) => steps.push(event),
  });
  return { result, steps };
}

describe("requestExtraction against /api/extract", () => {
  it("streams every agent's progress, then the products", async () => {
    const { result, steps } = await read([]);

    expect(result.provider).toBe("mock");
    expect(result.products).toHaveLength(7);
    expect(steps[0]).toEqual({ step: "watcher", status: "running" });
    // By the result, the feed has nothing left waiting or spinning.
    expect(feedRows(steps).map((row) => row.status)).toEqual(["done", "done", "skipped", "done"]);
  });

  it("logs where the time went, once per video", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await read([]);

    const lines = info.mock.calls.map(([line]) => String(line)).filter((line) => line.includes("extract timings"));
    expect(lines).toHaveLength(1);
    const timings = JSON.parse(lines[0]);
    expect(timings).toMatchObject({ provider: "mock", ok: true, products: 7 });
    expect(Object.keys(timings.steps)).toEqual(["watcher", "priceMatcher", "checker"]);
    expect(timings.totalMs).toBeGreaterThanOrEqual(timings.receivedMs);
    info.mockRestore();
  });

  it("shows the shelf matcher's summary when the shelf has products", async () => {
    const { steps } = await read([
      { id: "a", name: "Mama Tom Yum Noodles", price: 7 },
      { id: "b", name: "Singha Water 600ml", price: 10 },
    ]);

    const shelf = feedRows(steps)[2];
    expect(shelf.status).toBe("done");
    expect(shelf.line).toMatch(/already in your shop/);
  });
});
