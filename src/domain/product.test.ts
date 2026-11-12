import { describe, expect, it } from "vitest";
import { hasOptions, parseOptions } from "./product";

describe("parseOptions", () => {
  it("splits on commas or new lines, trims and drops repeats", () => {
    expect(parseOptions(" S, M ,l,\nXL, m,, ")).toEqual(["S", "M", "l", "XL"]);
    expect(parseOptions("")).toEqual([]);
  });

  it("caps the list and each value", () => {
    expect(parseOptions(Array.from({ length: 30 }, (_, i) => String(i)).join(","))).toHaveLength(20);
    expect(parseOptions("x".repeat(40))[0]).toHaveLength(24);
  });
});

describe("hasOptions", () => {
  it("knows which products need a choice", () => {
    expect(hasOptions({ sizes: ["S"] })).toBe(true);
    expect(hasOptions({ sizes: [], colors: undefined })).toBe(false);
  });
});
