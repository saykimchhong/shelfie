import { describe, expect, it } from "vitest";
import { sharpness, squareAround } from "./crop";

describe("squareAround", () => {
  it("centres a padded square on the product", () => {
    const square = squareAround(1000, 1000, { left: 0.4, top: 0.4, width: 0.2, height: 0.2 });
    expect(square.side).toBeCloseTo(260);
    expect(square.sx).toBeCloseTo(370);
    expect(square.sy).toBeCloseTo(370);
  });

  it("uses the longer side of the product", () => {
    const square = squareAround(1920, 1080, { left: 0.1, top: 0.2, width: 0.1, height: 0.5 });
    expect(square.side).toBeCloseTo(540 * 1.3);
  });

  it("stays inside the frame near an edge", () => {
    const square = squareAround(1920, 1080, { left: 0.9, top: 0.85, width: 0.1, height: 0.15 });
    expect(square.sx + square.side).toBeLessThanOrEqual(1920);
    expect(square.sy + square.side).toBeLessThanOrEqual(1080);
    expect(square.sx).toBeGreaterThanOrEqual(0);
  });

  it("never asks for more than the frame, or for a sliver", () => {
    expect(squareAround(1920, 1080, { left: 0, top: 0, width: 1, height: 1 }).side).toBe(1080);
    expect(squareAround(1000, 1000, { left: 0.5, top: 0.5, width: 0.01, height: 0.01 }).side).toBe(250);
  });
});

// A grayscale RGBA image from a function of (x, y).
function image(size: number, shade: (x: number, y: number) => number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = shade(x, y);
      rgba.set([value, value, value, 255], (y * size + x) * 4);
    }
  }
  return rgba;
}

describe("sharpness", () => {
  it("is zero for a flat image", () => {
    expect(sharpness(image(8, () => 128), 8, 8)).toBe(0);
  });

  it("scores crisp edges above a soft gradient", () => {
    const crisp = image(16, (x, y) => ((x + y) % 2 === 0 ? 255 : 0));
    const soft = image(16, (x) => x * 16);
    expect(sharpness(crisp, 16, 16)).toBeGreaterThan(sharpness(soft, 16, 16));
  });
});
