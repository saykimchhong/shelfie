import type { FrameBox } from "@/domain/extraction";
import { sharpness, squareAround, type Square } from "./crop";
import { canvasToBlob, centerSquare, createCanvas } from "./image";

// Frames this far either side of the moment are also tried. One only replaces
// the moment itself when it's clearly sharper: the product may have moved out
// of its box.
const NEARBY_SECONDS = 0.3;
const NEARBY_MARGIN = 1.25;
// Sharpness is measured on a small copy: fast, and enough to spot blur.
const PROBE_SIZE = 128;

function once(target: HTMLVideoElement, event: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Video ${event} timed out`)), timeoutMs);
    target.addEventListener(
      event,
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function openVideo(url: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  return video;
}

async function seek(video: HTMLVideoElement, seconds: number): Promise<void> {
  video.currentTime = Math.min(Math.max(seconds, 0), Math.max(video.duration - 0.1, 0));
  await once(video, "seeked");
}

export async function videoDuration(url: string): Promise<number | undefined> {
  const video = openVideo(url);
  try {
    await once(video, "loadedmetadata");
    return Number.isFinite(video.duration) ? video.duration : undefined;
  } catch {
    return undefined;
  } finally {
    video.removeAttribute("src");
  }
}

// When a product is clearest, and where it is in that frame when known.
export type FrameRequest = { seconds: number; box: FrameBox | null };

// Free "product photos" from the seller's own video: a square around each
// product (the centre when its box is unknown), from the sharpest frame around
// the moment the AI saw it. Returns null where a frame failed.
export async function captureFrames(url: string, requests: FrameRequest[], size = 640): Promise<(Blob | null)[]> {
  const video = openVideo(url);
  const results: (Blob | null)[] = [];
  try {
    await once(video, "loadeddata", 8000);
    const [, probe] = createCanvas(PROBE_SIZE, PROBE_SIZE, { willReadFrequently: true });

    for (const { seconds, box } of requests) {
      try {
        const square = box
          ? squareAround(video.videoWidth, video.videoHeight, box)
          : centerSquare(video.videoWidth, video.videoHeight);
        const [canvas, context] = createCanvas(Math.round(Math.min(size, square.side)));
        let best = -1;

        for (const time of [seconds, seconds - NEARBY_SECONDS, seconds + NEARBY_SECONDS]) {
          await seek(video, time);
          draw(probe, video, square, PROBE_SIZE);
          const score = sharpness(probe.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE).data, PROBE_SIZE, PROBE_SIZE);
          if (best < 0 || score > best * NEARBY_MARGIN) {
            best = score;
            draw(context, video, square, canvas.width);
          }
        }
        results.push(await canvasToBlob(canvas));
      } catch {
        results.push(null);
      }
    }
  } catch {
    while (results.length < requests.length) results.push(null);
  } finally {
    video.removeAttribute("src");
    video.load();
  }
  return results;
}

function draw(context: CanvasRenderingContext2D, video: HTMLVideoElement, { sx, sy, side }: Square, size: number) {
  context.drawImage(video, sx, sy, side, side, 0, 0, size, size);
}
