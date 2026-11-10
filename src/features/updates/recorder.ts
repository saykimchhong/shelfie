import { encodeWav } from "./wav";

const SAMPLE_RATE = 16000;

export type Recording = {
  // Stops and returns the voice note as WAV.
  stop: () => Promise<Blob>;
  cancel: () => void;
};

export function canRecord(): boolean {
  return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  const release = () => stream.getTracks().forEach((track) => track.stop());
  recorder.start();

  return {
    async stop() {
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      release();
      return toWav(new Blob(chunks, { type: recorder.mimeType }));
    },
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}

// Decode, mix down to mono and resample to 16 kHz: small, and all speech needs.
async function toWav(recorded: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recorded.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE)), SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), SAMPLE_RATE);
  } finally {
    void context.close();
  }
}
