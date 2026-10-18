// Browser image helpers. Everything runs on the seller's phone: no upload or
// server cost until we actually store the final, compressed photo.

// WebP where supported (smaller), JPEG otherwise (Safari can't encode WebP).
export async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Couldn't encode image");
  return jpeg;
}

export function createCanvas(
  width: number,
  height = width,
  settings?: CanvasRenderingContext2DSettings,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", settings);
  if (!context) throw new Error("Canvas isn't available");
  return [canvas, context];
}

// Largest centered square of a source, for square product tiles.
export function centerSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side };
}

// Square-crops and shrinks any photo (respecting EXIF rotation).
export async function squarePhoto(source: Blob, size = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const { sx, sy, side } = centerSquare(bitmap.width, bitmap.height);
  const [canvas, context] = createCanvas(Math.min(size, side));
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToBlob(canvas);
}

// Shrinks a photo to fit within maxSide, keeping all of it (no crop) and its
// shape. For images that must stay whole, like a payment QR screenshot.
export async function fitPhoto(source: Blob, maxSide = 1024, quality = 0.92): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const [canvas, context] = createCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToBlob(canvas, quality);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// A Storage URL only reads back in the browser once the bucket has cors.json.
// "reload" skips the cache: a copy cached for an <img> before CORS was set has
// no CORS header, and the browser would block reading it.
export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: "reload" });
  if (!response.ok) throw new Error(`Couldn't load the photo (${response.status})`);
  return response.blob();
}
