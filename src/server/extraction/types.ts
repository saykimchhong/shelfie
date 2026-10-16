import type { Currency, LabelLanguage } from "@/domain/store";

export type ExtractInput = {
  video: Blob;
  mimeType: string;
  currency: Currency;
  labelLanguage: LabelLanguage;
  // Measured in the browser; lets the mock spread timestamps over the video.
  durationSeconds?: number;
};

export type ExtractionProvider = "mock" | "gemini";
