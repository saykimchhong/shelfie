import { canvasToBlob, centerSquare, createCanvas } from "./image";

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

// Free "product photos": square frames grabbed from the seller's own video at
// the moments the AI saw each product. Returns null where a frame failed.
export async function captureFrames(url: string, times: number[], size = 640): Promise<(Blob | null)[]> {
  const video = openVideo(url);
  const results: (Blob | null)[] = [];
  try {
    await once(video, "loadeddata", 8000);
    const { sx, sy, side } = centerSquare(video.videoWidth, video.videoHeight);
    const [canvas, context] = createCanvas(Math.min(size, side));

    for (const time of times) {
      try {
        video.currentTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.1, 0));
        await once(video, "seeked");
        context.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
        results.push(await canvasToBlob(canvas));
      } catch {
        results.push(null);
      }
    }
  } catch {
    while (results.length < times.length) results.push(null);
  } finally {
    video.removeAttribute("src");
    video.load();
  }
  return results;
}
