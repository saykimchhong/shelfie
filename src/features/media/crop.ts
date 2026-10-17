import type { FrameBox } from "@/domain/extraction";

// A square region of a source image, in source pixels.
export type Square = { sx: number; sy: number; side: number };

// Room left around the product, as a share of its size on each side.
const PADDING = 0.15;
// Tiny boxes still get a crop big enough to stay sharp at tile size.
const MIN_SHARE = 0.25;

// The square around a product's box, with room around it, kept inside the frame.
export function squareAround(width: number, height: number, box: FrameBox): Square {
  const frame = Math.min(width, height);
  const productSide = Math.max(box.width * width, box.height * height) * (1 + PADDING * 2);
  const side = Math.min(Math.max(productSide, frame * MIN_SHARE), frame);
  const centerX = (box.left + box.width / 2) * width;
  const centerY = (box.top + box.height / 2) * height;
  return {
    sx: clamp(centerX - side / 2, 0, width - side),
    sy: clamp(centerY - side / 2, 0, height - side),
    side,
  };
}

// How sharp an image is: the variance of its Laplacian (edge strength). Blur
// from a moving phone lowers it. `rgba` is canvas ImageData.
export function sharpness(rgba: ArrayLike<number>, width: number, height: number): number {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }

  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const laplacian = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      sum += laplacian;
      sumOfSquares += laplacian * laplacian;
      count++;
    }
  }
  return count > 0 ? sumOfSquares / count - (sum / count) ** 2 : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
