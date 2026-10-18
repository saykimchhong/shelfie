import { clientAuth } from "@/lib/firebase/client";
import { hueFromString, initials } from "@/lib/format";
import { canvasToBlob, centerSquare, createCanvas } from "./image";

// "AI photo" for a product.
//
// REAL: POST /api/photos → Gemini image editing. It cleans the frame up when
// it shows the product, and draws the product from its name when the frame
// is wrong (a hand, the next item), so one tap also fixes bad frames.
//
// FALLBACK (mock mode, offline, or Gemini fails): a local canvas "studio shot"
// of the frame (soft blurred backdrop, product centered with a shadow), or a
// styled tile when there is no frame. Free and instant.
export async function generateProductPhoto(input: { name: string; frame: Blob | null }): Promise<Blob> {
  const photo = await geminiPhoto(input);
  if (photo) return photo;
  return input.frame ? studioShot(input.frame) : illustratedTile(input.name);
}

async function geminiPhoto({ name, frame }: { name: string; frame: Blob | null }): Promise<Blob | null> {
  try {
    const idToken = await clientAuth().currentUser?.getIdToken();
    if (!idToken) return null;
    const body = new FormData();
    body.append("name", name);
    if (frame) body.append("frame", frame);
    const response = await fetch("/api/photos", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    if (!response.ok) return null; // 501 in mock mode: use the local look
    const photo = await response.blob();
    return photo.type.startsWith("image/") ? photo : null;
  } catch (error) {
    console.warn("AI photo fell back to the local look", error);
    return null;
  }
}

const SIZE = 640;

async function studioShot(frame: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(frame);
  const { sx, sy, side } = centerSquare(bitmap.width, bitmap.height);
  const [canvas, context] = createCanvas(SIZE);

  // Backdrop: the same frame, heavily blurred and brightened.
  context.filter = "blur(28px) brightness(1.15) saturate(1.3)";
  context.drawImage(bitmap, sx, sy, side, side, -40, -40, SIZE + 80, SIZE + 80);
  context.filter = "none";
  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fillRect(0, 0, SIZE, SIZE);

  // Subject: centered, punchier, rounded, with a soft shadow.
  const inset = SIZE * 0.13;
  const box = SIZE - inset * 2;
  context.save();
  context.shadowColor = "rgba(40, 20, 10, 0.28)";
  context.shadowBlur = 40;
  context.shadowOffsetY = 18;
  context.beginPath();
  context.roundRect(inset, inset, box, box, 36);
  context.fillStyle = "#fff";
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.roundRect(inset, inset, box, box, 36);
  context.clip();
  context.filter = "contrast(1.08) saturate(1.2)";
  context.drawImage(bitmap, sx, sy, side, side, inset, inset, box, box);
  context.restore();

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
