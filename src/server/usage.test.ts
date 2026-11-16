import { afterEach, describe, expect, it, vi } from "vitest";
import { addUsage, logUsage, NO_USAGE } from "./usage";

describe("addUsage", () => {
  it("adds up the counts of every call", () => {
    const total = addUsage(
      addUsage(NO_USAGE, { promptTokenCount: 1000, candidatesTokenCount: 50, thoughtsTokenCount: 20, totalTokenCount: 1070 }),
      { promptTokenCount: 500, candidatesTokenCount: 10, cachedContentTokenCount: 400, totalTokenCount: 510 },
    );

    expect(total).toEqual({ calls: 2, promptTokens: 1500, outputTokens: 60, thoughtTokens: 20, cachedTokens: 400, totalTokens: 1580 });
  });

  it("ignores events without usage", () => {
    expect(addUsage(NO_USAGE, undefined)).toEqual(NO_USAGE);
  });
});

describe("logUsage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line that can be filtered and summed", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logUsage("updateReader", "gemini-3-flash-preview", { ...NO_USAGE, calls: 1, totalTokens: 900 }, 1234.6, { products: 12 });

    expect(JSON.parse(info.mock.calls[0][0])).toEqual({
      message: "ai usage",
      name: "updateReader",
      model: "gemini-3-flash-preview",
      calls: 1,
      promptTokens: 0,
      outputTokens: 0,
      thoughtTokens: 0,
      cachedTokens: 0,
      totalTokens: 900,
      ms: 1235,
      products: 12,
    });
  });
});
