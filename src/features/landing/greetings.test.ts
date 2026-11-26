import { describe, expect, it } from "vitest";
import { GREETINGS, greetingIndexFor } from "./greetings";

describe("greetingIndexFor", () => {
  it("starts on the visitor's own language", () => {
    expect(GREETINGS[greetingIndexFor(["si-LK", "en-US"])].language).toBe("si");
    expect(GREETINGS[greetingIndexFor(["TH"])].language).toBe("th");
  });

  it("skips languages we don't speak and falls back to English", () => {
    expect(GREETINGS[greetingIndexFor(["fr-FR", "km"])].language).toBe("km");
    expect(greetingIndexFor(["fr-FR"])).toBe(0);
    expect(greetingIndexFor([])).toBe(0);
  });
});
