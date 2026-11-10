import { describe, expect, it } from "vitest";
import { isDarkColor } from "./palette";

describe("isDarkColor", () => {
  it("puts light text on dark backgrounds and dark text on light ones", () => {
    expect(["#0b0b0c", "#111a2e", "#25211e", "#c2410c"].map(isDarkColor)).toEqual([true, true, true, true]);
    expect(["#ffffff", "#fff8f2", "#e8f1fb", "#808080"].map(isDarkColor)).toEqual([false, false, false, false]);
    expect(isDarkColor("#555555")).toBe(true);
  });
});
