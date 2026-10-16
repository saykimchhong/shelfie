import { hueFromString, initials } from "@/lib/format";
import { canvasToBlob, centerSquare, createCanvas } from "./image";

// "AI photo" for a product.
//
// MOCK (today): a local canvas "studio shot" built from the video frame (soft
// blurred backdrop, product centered with a shadow), or a styled tile when
// there is no frame. Free and instant.
//
// REAL (later): POST the frame to an /api/photos route that calls Gemini image
// editing and returns the cleaned-up photo. Keep this signature and callers
// won't change.
export async function generateProductPhoto(input: { name: string; frame: Blob | null }): Promise<Blob> {
  // Let the UI's "generating" state show, like the real call will.
  await new Promise((resolve) => setTimeout(resolve, 700));
  return input.frame ? studioShot(input.frame) : illustratedTile(input.name);
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
