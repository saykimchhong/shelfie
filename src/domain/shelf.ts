import type { Product } from "./product";

// Shelf names are free text, so "drinks" and "Drinks " are the same shelf.
const shelfKey = (name: string | undefined) => (name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

// Products without a shelf (added before shelves existed, or left blank) form
// one group with this key.
export const UNSORTED = "";

// The shop's shelves in the order they first appear (products come sorted by position).
export function shelvesOf(products: readonly Product[]): string[] {
  const shelves = new Map<string, string>();
  for (const product of products) {
    const key = shelfKey(product.shelf);
    if (key && !shelves.has(key)) shelves.set(key, product.shelf!.trim());
  }
  return [...shelves.values()];
}

export function productsOnShelf(products: readonly Product[], shelf: string): Product[] {
  const key = shelfKey(shelf);
  return products.filter((product) => shelfKey(product.shelf) === key);
}

// What to store for a typed shelf name: an existing shelf's spelling when it's
// the same shelf, otherwise the tidied name. UNSORTED when left blank.
export function canonicalShelf(name: string, shelves: readonly string[]): string {
  const key = shelfKey(name);
  if (!key) return UNSORTED;
  return shelves.find((shelf) => shelfKey(shelf) === key) ?? name.trim().replace(/\s+/g, " ");
}
