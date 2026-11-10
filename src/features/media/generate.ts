import { clientAuth } from "@/lib/firebase/client";
import { hueFromString, initials } from "@/lib/format";
import { canvasToBlob, centerSquare, createCanvas } from "./image";

// "AI photo" for a product.
//
// REAL: POST /api/photos → Gemini image editing. It cleans the frame up when
// it shows the product, and draws the product from its name when the frame
// is wrong (a hand, the next item), so one tap also fixes bad frames.
// If Gemini fails, this throws: the seller keeps their photo and can retry.
//
// LOCAL (mock mode or signed out): a canvas "studio shot" of the frame
// (brighter, full-bleed), or a styled tile when there is no frame.
export async function generateProductPhoto(input: { name: string; frame: Blob | null }): Promise<Blob> {
  const photo = await geminiPhoto(input);
  if (photo) return photo;
  return input.frame ? studioShot(input.frame) : illustratedTile(input.name);
}

const RETRY_AFTER_MS = 1500;

// null when the real AI isn't on here; throws when it is on but failed.
async function geminiPhoto({ name, frame }: { name: string; frame: Blob | null }): Promise<Blob | null> {
  const idToken = await clientAuth().currentUser?.getIdToken();
  if (!idToken) return null;
  const body = new FormData();
  body.append("name", name);
  if (frame) body.append("frame", frame);

  for (let attempt = 1; ; attempt++) {
    const response = await fetch("/api/photos", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    if (response.status === 501) return null;
    if (response.ok) {
      const photo = await response.blob();
      if (photo.type.startsWith("image/")) return photo;
      throw new Error("AI photo came back without an image");
    }
    // Busy or a hiccup (several photos at once can hit the rate limit): one retry.
    const busy = response.status === 429 || response.status >= 500;
    if (!busy || attempt === 2) throw new Error(`AI photo failed (${response.status})`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
  }
}

const SIZE = 640;

// Full-bleed and cleaned up; no inner frame, since cards already have their own.
async function studioShot(frame: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(frame);
  const { sx, sy, side } = centerSquare(bitmap.width, bitmap.height);
  const [canvas, context] = createCanvas(SIZE);

  context.filter = "contrast(1.08) saturate(1.15) brightness(1.04)";
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  context.filter = "none";

  // Soft light from above, gently darker corners.
  const light = context.createRadialGradient(SIZE / 2, SIZE * 0.35, SIZE * 0.1, SIZE / 2, SIZE / 2, SIZE * 0.75);
  light.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  light.addColorStop(1, "rgba(0, 0, 0, 0.16)");
  context.fillStyle = light;
  context.fillRect(0, 0, SIZE, SIZE);

  bitmap.close();
  return canvasToBlob(canvas);
}

async function illustratedTile(name: string): Promise<Blob> {
  const hue = hueFromString(name);
  const [canvas, context] = createCanvas(SIZE);

  const gradient = context.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, `hsl(${hue} 85% 78%)`);
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 80% 62%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);

  context.fillStyle = "rgba(255, 255, 255, 0.22)";
  context.beginPath();
  context.arc(SIZE * 0.78, SIZE * 0.2, SIZE * 0.32, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = `hsl(${hue} 60% 22%)`;
  context.font = `800 ${SIZE * 0.3}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initials(name), SIZE / 2, SIZE / 2);

  return canvasToBlob(canvas);
}
