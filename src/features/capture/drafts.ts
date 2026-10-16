import type { ExtractedProduct } from "@/domain/extraction";
import type { Product, ProductInput } from "@/domain/product";
import type { ProductUpdate } from "@/features/seller/data";

// Where a product's photo comes from. The seller picks per product:
// a frame of their own video (free), an AI photo, their own upload, or none.
export type PhotoSource = "video" | "ai" | "upload" | "none";

// How an extracted product relates to the shelf as it is now. Decided once,
// when the video is read, so rows don't jump between groups while editing.
// - new:    not in the store yet → added
// - update: a known product with a new price, or back in stock → updated
// - same:   a known product with nothing to change → only counted
export type DraftGroup = "new" | "update" | "same";

// An extracted product while the seller reviews it.
export type Draft = {
  key: string;
  include: boolean;
  group: DraftGroup;
  // The existing product this is, when it's a known one.
  matchId: string | null;
  name: string;
  localName: string | null;
  // Kept as typed text; parsed on save.
  price: string;
  category: string | null;
  confidence: number;
  // Why the AI wants a second look, e.g. "Price not said".
  note: string | null;
  seenAtSeconds: number | null;
  // Frame grabbed from the video at seenAtSeconds (input for "video" and "ai").
  frame: Blob | null;
  photo: Blob | null;
  photoSource: PhotoSource;
  photoBusy: boolean;
};

export function toDraft(item: ExtractedProduct, index: number, known?: Product): Draft {
  // A known product keeps its current price unless a new one was said.
  const price = item.price ?? known?.price ?? null;
  return {
    key: `${index}-${item.name}`,
    include: true,
    group: !known ? "new" : price !== known.price || !known.inStock ? "update" : "same",
    matchId: known?.id ?? null,
    name: known?.name ?? item.name,
    localName: item.localName ?? known?.localName ?? null,
    price: price === null ? "" : String(price),
    category: item.category,
    confidence: item.confidence,
    note: item.note,
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

export function toProductInput(draft: Draft, imageUrl: string | undefined, shelf: string): ProductInput {
  return {
    name: draft.name.trim(),
    localName: draft.localName?.trim() || undefined,
    price: parsePrice(draft.price),
    category: draft.category?.trim() || undefined,
    shelf: shelf || undefined,
    inStock: true,
    imageUrl,
  };
}

// Only what actually changes for a known product: its price, and that it's back.
export function toProductUpdate(draft: Draft, product: Product): ProductUpdate | null {
  const patch: Partial<ProductInput> = {};
  const price = parsePrice(draft.price);
  if (price !== product.price) patch.price = price;
  if (!product.inStock) patch.inStock = true;
  return Object.keys(patch).length > 0 ? { id: product.id, patch } : null;
}
