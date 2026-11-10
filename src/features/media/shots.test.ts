import { describe, expect, it } from "vitest";
import { shotRequests, shotTimes, type ShotTarget } from "./shots";

describe("shotTimes", () => {
  it("offers the Watcher's moment and half a second either side", () => {
    expect(shotTimes(4)).toEqual([3.5, 4, 4.5]);
  });

  it("never asks for a moment before the video starts, or the same one twice", () => {
    expect(shotTimes(0.2)).toEqual([0, 0.2, 0.7]);
    expect(shotTimes(0)).toEqual([0, 0.5]);
  });
});

describe("shotRequests", () => {
  const watcherBox = { left: 0.1, top: 0.1, width: 0.2, height: 0.2 };
  const foundBox = { left: 0.5, top: 0.4, width: 0.3, height: 0.2 };
  const rice: ShotTarget = { name: "Rice", localName: null, seconds: 4, box: watcherBox };
  const sauce: ShotTarget = { name: "Fish Sauce", localName: null, seconds: 9, box: null };

  it("crops the picked frame exactly, with the finder's box", () => {
    expect(shotRequests([rice], [[3.5, 4, 4.5]], [{ frame: 2, box: foundBox }])).toEqual([
      { seconds: 4.5, box: foundBox, exact: true },
    ]);
  });

  it("falls back to the Watcher's moment for a product with no pick", () => {
    expect(
      shotRequests([rice, sauce], [[3.5, 4, 4.5], [8.5, 9, 9.5]], [{ frame: null, box: null }, null]),
    ).toEqual([
      { seconds: 4, box: watcherBox },
      { seconds: 9, box: null },
    ]);
  });

  it("ignores a pick for a frame that wasn't offered", () => {
    expect(shotRequests([rice], [[3.5, 4]], [{ frame: 2, box: foundBox }])).toEqual([{ seconds: 4, box: watcherBox }]);
  });
});
