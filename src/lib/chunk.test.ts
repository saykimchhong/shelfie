import { describe, expect, it } from "vitest";
import { chunk } from "./chunk";

describe("chunk", () => {
  it("splits into groups of the given size, the last one shorter", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns no groups for no items", () => {
    expect(chunk([], 500)).toEqual([]);
  });

  it("keeps a list that fits in one group", () => {
    expect(chunk(["a", "b"], 500)).toEqual([["a", "b"]]);
  });

  it("rejects a size that would never finish", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
