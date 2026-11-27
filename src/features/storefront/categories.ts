import type { Product } from "@/domain/product";

// Categories come from the AI or the seller, so "Fruit", "fruits" and
// "Fruits " are one category. A plural "s" is dropped from words of 4+
// letters (so "Gas" stays "gas").
export function categoryKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase()
    .replace(/(?<=\p{L}{3})s$/u, "");
}

// The store's categories in the order they first appear, one per key, each
// spelled as it was first seen.
export function categoriesOf(products: readonly Pick<Product, "category">[]): string[] {
  const seen = new Map<string, string>();
  for (const { category } of products) {
    const name = category?.trim();
    if (name && !seen.has(categoryKey(name))) seen.set(categoryKey(name), name);
  }
  return [...seen.values()];
}
