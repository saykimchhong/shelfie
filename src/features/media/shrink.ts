// Phones film big videos: an iPhone records 1080p at about 1.2 MB a second,
// and uploads through our API are capped (Cloud Run, see MAX_VIDEO_BYTES). A
// video over the cap is re-encoded right here on the phone to 720p, sized to
// fit, before it's sent. The audio (the spoken prices) is copied as is.
//
// Browser only (WebCodecs). The library is loaded on first use, so stores and
// pages that never shrink a video don't download it.

// Longest side of the shrunk video. Plenty to read labels; Gemini samples
// frames at a lower resolution than this anyway.
const MAX_SIDE = 1280;

// Bitrate bounds: below the minimum labels blur; above the maximum it's wasted.
const MIN_BITRATE = 700_000;
const MAX_BITRATE = 2_500_000;

// Room for audio and the MP4 container, so the result lands under the cap.
const HEADROOM = 0.85;

// Returns the shrunk video, or null when this browser can't (no WebCodecs,
// unsupported codec) or the result still wouldn't fit. Then the caller keeps
// the original and shows its usual "too large" message.
export async function shrinkVideo(
  video: File,
  {
    maxBytes,
    onProgress,
    signal,
  }: { maxBytes: number; onProgress?: (progress: number) => void; signal?: AbortSignal },
): Promise<File | null> {
  if (typeof VideoEncoder === "undefined") return null;
  try {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, canEncodeVideo } =
      await import("mediabunny");

    const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const seconds = await input.computeDuration();
    if (!(seconds > 0)) return null;

    // Fit the bitrate to the cap: bytes per second × 8, less the headroom.
    const bitrate = Math.min(MAX_BITRATE, Math.floor(((maxBytes * HEADROOM) / seconds) * 8));
    if (bitrate < MIN_BITRATE) return null; // too long to fit at a readable quality

    const portrait = track.displayHeight > track.displayWidth;
    const longest = Math.max(track.displayWidth, track.displayHeight);
    const size = longest > MAX_SIDE ? (portrait ? { height: MAX_SIDE } : { width: MAX_SIDE }) : {};

    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        ...size,
        codec: (await canEncodeVideo("avc")) ? "avc" : undefined,
        bitrate,
        forceTranscode: true,
      },
      // Audio is copied when MP4 can hold it (AAC from phones), else re-encoded.
      showWarnings: false,
    });
    if (!conversion.isValid) return null;
    // Never send a silent video: the prices are spoken.
    const hasAudio = (await input.getPrimaryAudioTrack()) !== null;
    if (hasAudio && !conversion.utilizedTracks.some((used) => used.isAudioTrack())) return null;

    conversion.onProgress = (progress) => onProgress?.(progress);
    signal?.addEventListener("abort", () => void conversion.cancel(), { once: true });
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength > maxBytes) return null;
    const name = video.name.replace(/\.[^.]+$/, "") || "video";
    return new File([buffer], `${name}.mp4`, { type: "video/mp4" });
  } catch (error) {
    console.warn("Couldn't shrink the video", error);
    return null;
  }
}
