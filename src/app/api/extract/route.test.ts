import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "@/domain/agents";
import { feedRows } from "@/features/capture/agentFeed";
import { requestExtraction, type CaptureInput } from "@/features/capture/api";
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

const video: CaptureInput = { source: "video", video: new File([], "shelf.mp4", { type: "video/mp4" }), durationSeconds: 12 };
const photo = (name: string) => new File([name], `${name}.webp`, { type: "image/webp" });

async function read(known: Parameters<typeof requestExtraction>[0]["known"], capture: CaptureInput = video) {
  const steps: AgentEvent[] = [];
  const result = await requestExtraction({
    capture,
    currency: "THB",
    labelLanguage: "th",
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

  it("reads photos: each product points at one of them", async () => {
    const { result, steps } = await read([], { source: "photos", photos: [photo("shelf-1"), photo("shelf-2")] });

    expect(result.products).toHaveLength(7);
    expect(result.products.every((product) => [0, 1].includes(product.seenAtSeconds) && product.box)).toBe(true);
    expect(feedRows(steps, "photos")[0]).toMatchObject({ label: "Reading your photos", status: "done" });
    expect(steps[1].summary).toMatch(/read \d+ prices/);
  });

  it("reads a typed list, flagging lines without a price", async () => {
    const { result } = await read([], { source: "text", text: "Coke 1.5L - 25\nMilo 400g 95 baht\nToothpaste" });

    expect(result.products.map(({ name, price, note }) => [name, price, note])).toEqual([
      ["Coke 1.5L", 25, null],
      ["Milo 400g", 95, null],
      ["Toothpaste", null, "No price given"],
    ]);
    expect(result.products.every((product) => product.box === null)).toBe(true);
  });

  it.each([
    ["no photos", { source: "photos" }],
    ["too many photos", { source: "photos", photo: Array.from({ length: 11 }, (_, index) => photo(`p${index}`)) }],
    ["a photo that isn't an image", { source: "photos", photo: [new File(["x"], "x.txt", { type: "text/plain" })] }],
    ["an empty list", { source: "text", text: "  " }],
    ["an unknown source", { source: "fax" }],
  ])("rejects %s", async (_, fields: { source: string; photo?: File[]; text?: string }) => {
    const body = new FormData();
    body.append("currency", "THB");
    body.append("source", fields.source);
    fields.photo?.forEach((file) => body.append("photo", file));
    if (fields.text !== undefined) body.append("text", fields.text);
    const response = await POST(new Request("http://localhost/api/extract", { method: "POST", body }));
    expect(response.status).toBe(400);
  });
});
