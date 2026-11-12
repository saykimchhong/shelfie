import "server-only";
import sharp from "sharp";
import type { Product } from "@/domain/product";

// The picture WhatsApp, LINE and Facebook show beside a shared store link:
// up to three product photos on the store's background. No words, so it
// needs no fonts: the apps print the shop's name themselves, in any script.
export const SHARE_IMAGE = { width: 1200, height: 630 } as const;
export const SHARE_IMAGE_BACKGROUND = "#fff8f2";

const MAX_PHOTOS = 3;
const MARGIN = 48;
const GAP = 24;
const RADIUS = 32;
const PHOTO_HOST = "firebasestorage.googleapis.com";
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;

// Our own uploads only: the server never fetches an address a seller typed.
function isOurPhoto(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname === PHOTO_HOST;
  } catch {
    return false;
  }
}

// The first few photos on the shelf, things in stock before things sold out.
export function sharePhotos(products: readonly Product[]): string[] {
  const withPhoto = products.filter((product) => product.imageUrl && isOurPhoto(product.imageUrl));
  return [...withPhoto.filter((product) => product.inStock), ...withPhoto.filter((product) => !product.inStock)]
    .slice(0, MAX_PHOTOS)
    .map((product) => product.imageUrl!);
}

// Square tiles in one centered row, as large as the picture allows.
export function shareTiles(count: number): { left: number; top: number; size: number }[] {
  const { width, height } = SHARE_IMAGE;
  const size = Math.min(height - 2 * MARGIN, Math.floor((width - 2 * MARGIN - (count - 1) * GAP) / count));
  const left = Math.round((width - count * size - (count - 1) * GAP) / 2);
  const top = Math.round((height - size) / 2);
  return Array.from({ length: count }, (_, index) => ({ left: left + index * (size + GAP), top, size }));
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.byteLength > MAX_PHOTO_BYTES ? null : bytes;
  } catch {
    return null;
  }
}

async function tile(photo: Buffer, size: number): Promise<Buffer | null> {
  const corners = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`,
  );
  try {
    return await sharp(photo)
      .rotate()
      .resize(size, size, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .composite([{ input: corners, blend: "dest-in" }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

// A JPEG, or null when no photo could be read. JPEG keeps it near 100 KB:
// WhatsApp skips preview pictures much larger than that.
export async function renderShareImage(photoUrls: string[], background = SHARE_IMAGE_BACKGROUND): Promise<Buffer | null> {
  const photos = (await Promise.all(photoUrls.slice(0, MAX_PHOTOS).map(download))).filter((photo) => photo !== null);
  if (photos.length === 0) return null;

  const places = shareTiles(photos.length);
  const tiles = await Promise.all(photos.map((photo, index) => tile(photo, places[index].size)));
  const layers = tiles.flatMap((input, index) =>
    input ? [{ input, left: places[index].left, top: places[index].top }] : [],
  );
  if (layers.length === 0) return null;

  return sharp({ create: { ...SHARE_IMAGE, channels: 3, background } })
    .composite(layers)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
