import { describe, expect, it } from "vitest";
import { TAGLINES, taglineIndexFor } from "./taglines";

describe("taglineIndexFor", () => {
  it("starts on the visitor's own language", () => {
    expect(TAGLINES[taglineIndexFor(["si-LK", "en-US"])].language).toBe("si");
    expect(TAGLINES[taglineIndexFor(["TH"])].language).toBe("th");
  });

  it("skips languages we don't speak and falls back to English", () => {
    expect(TAGLINES[taglineIndexFor(["fr-FR", "km"])].language).toBe("km");
    expect(taglineIndexFor(["fr-FR"])).toBe(0);
    expect(taglineIndexFor([])).toBe(0);
  });
});
