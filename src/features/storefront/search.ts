import type { Product } from "@/domain/product";

const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase();

// Every typed word must appear in the name, label name, category or shelf.
// Substrings, so Thai and Khmer (written without spaces) match too.
export function matchesSearch(product: Product, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize([product.name, product.localName, product.category, product.shelf].filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}

// Big enough to need a search box: sooner for shops with many small items.
export function showsSearch(productCount: number, manyItems: boolean): boolean {
  return productCount >= (manyItems ? 8 : 16);
}
