import type { CaptureSource, KnownProduct } from "@/domain/extraction";
import type { ShopType } from "@/domain/shop";
import type { Currency, LabelLanguage } from "@/domain/store";

export type ExtractInput = {
  // Missing = "video".
  source?: CaptureSource;
  // Only the real AI needs the bytes; the mock never uploads the video.
  video: Blob | null;
  mimeType: string;
  // source "photos": the shrunk photos, in order.
  photos?: Blob[];
  // source "text": the seller's list.
  text?: string;
  currency: Currency;
  labelLanguage: LabelLanguage;
  shopType?: ShopType;
  // Measured in the browser; lets the mock spread timestamps over the video.
  durationSeconds?: number;
  // The shelf's current products, so known ones come back with a matchId.
  known: KnownProduct[];
};

export type ExtractionProvider = "mock" | "gemini";

// Cloud Run (which runs Firebase App Hosting) rejects request bodies over
// 32 MiB, so uploads through our API must stay under this. Longer videos need
// a direct browser → Gemini upload (see README "Deploy").
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
