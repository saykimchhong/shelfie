import { MAX_KNOWN_PRODUCTS, type ExtractedProduct, type KnownProduct } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import { toDraft, type Draft } from "./drafts";

// What the AI is told about the filmed shelf's current products.
export function toKnownProducts(products: readonly Product[]): KnownProduct[] {
  return products
    .slice(0, MAX_KNOWN_PRODUCTS)
    .map(({ id, name, localName, price }) => ({ id, name, localName, price }));
}

const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

// Which known product each extracted item is. The AI's matchId wins when it
// names a product on this shelf; otherwise an exact name or label-name match.
// Each known product is matched at most once.
export function resolveMatches(items: readonly ExtractedProduct[], known: readonly Product[]): (Product | null)[] {
  const unused = new Map(known.map((product) => [product.id, product]));
  const take = (product: Product | undefined) => {
    if (!product) return null;
    unused.delete(product.id);
    return product;
  };

  // AI matches first, so a name fallback can't claim a product the AI named.
  const byId = items.map((item) => (item.matchId ? take(unused.get(item.matchId)) : null));
  return byId.map(
    (match, index) =>
      match ??
      take(
        [...unused.values()].find(
          (product) => sameText(product.name, items[index].name) || sameText(product.localName, items[index].localName),
        ),
      ),
  );
}

// A shelf product that wasn't in the new video, and what to do with it.
export type Missing = { product: Product; soldOut: boolean };

export type Merge = { drafts: Draft[]; missing: Missing[] };

// Turns what the AI saw into the review: drafts for everything in the video,
// plus — when restocking — the shelf's in-stock products the video didn't show.
export function mergeShelf(
  items: readonly ExtractedProduct[],
  shelfProducts: readonly Product[],
  options: { restock: boolean; markMissingSoldOut: boolean },
): Merge {
  const matches = resolveMatches(items, shelfProducts);
  const drafts = items.map((item, index) => toDraft(item, index, matches[index] ?? undefined));
  if (!options.restock) return { drafts, missing: [] };

  const seen = new Set(matches.map((match) => match?.id));
  const missing = shelfProducts
    .filter((product) => product.inStock && !seen.has(product.id))
    .map((product) => ({ product, soldOut: options.markMissingSoldOut }));
  return { drafts, missing };
}
