import { describe, expect, it } from "vitest";
import { toFrameBox } from "./watcher";

describe("toFrameBox", () => {
  it("turns Gemini's [ymin, xmin, ymax, xmax] on 0–1000 into frame fractions", () => {
    expect(toFrameBox([100, 250, 600, 750])).toEqual({ left: 0.25, top: 0.1, width: 0.5, height: 0.5 });
  });

  it("clamps to the frame", () => {
    expect(toFrameBox([-50, 900, 400, 1200])).toEqual({ left: 0.9, top: 0, width: 0.1, height: 0.4 });
  });

  it("drops missing or empty boxes", () => {
    expect(toFrameBox(null)).toBeNull();
    expect(toFrameBox([500, 500, 500, 700])).toBeNull();
    expect(toFrameBox([1, 2, 3])).toBeNull();
  });
});
