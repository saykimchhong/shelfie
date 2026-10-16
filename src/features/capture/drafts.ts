import type { ExtractedProduct } from "@/domain/extraction";
import type { ProductInput } from "@/domain/product";

// Where a product's photo comes from. The seller picks per product:
// a frame of their own video (free), an AI photo, their own upload, or none.
export type PhotoSource = "video" | "ai" | "upload" | "none";

// An extracted product while the seller reviews it.
export type Draft = {
  key: string;
  include: boolean;
  name: string;
  localName: string | null;
  // Kept as typed text; parsed on save.
  price: string;
  category: string | null;
  confidence: number;
  seenAtSeconds: number | null;
  // Frame grabbed from the video at seenAtSeconds (input for "video" and "ai").
  frame: Blob | null;
  photo: Blob | null;
  photoSource: PhotoSource;
  photoBusy: boolean;
};

export function toDraft(item: ExtractedProduct, index: number): Draft {
  return {
    key: `${index}-${item.name}`,
    include: true,
    name: item.name,
    localName: item.localName,
    price: item.price === null ? "" : String(item.price),
    category: item.category,
    confidence: item.confidence,
    seenAtSeconds: item.seenAtSeconds,
    frame: null,
    photo: null,
    photoSource: "none",
    photoBusy: false,
  };
}

export function parsePrice(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

export function isSavable(draft: Draft): boolean {
  return draft.include && draft.name.trim().length > 0;
}

export function toProductInput(draft: Draft, imageUrl?: string): ProductInput {
  return {
    name: draft.name.trim(),
    localName: draft.localName?.trim() || undefined,
    price: parsePrice(draft.price),
    category: draft.category?.trim() || undefined,
    inStock: true,
    imageUrl,
  };
}
