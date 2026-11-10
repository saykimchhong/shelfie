import { unitOf, type PriceUnit, type Product, type ProductInput } from "@/domain/product";
import { MAX_UPDATE_PRODUCTS, type ListedProduct, type ProductChange } from "@/domain/updates";
import type { ProductUpdate } from "@/features/seller/data";

// The shop's products as the AI sees them.
export function toListedProducts(products: readonly Product[], shopUnit?: PriceUnit): ListedProduct[] {
  return products.slice(0, MAX_UPDATE_PRODUCTS).map((product) => ({
    id: product.id,
    name: product.name,
    localName: product.localName,
    price: product.price,
    unit: unitOf(product, shopUnit),
    inStock: product.inStock,
  }));
}

export type Writes = { add: ProductInput[]; update: ProductUpdate[]; remove: Product[] };

// What saving the kept changes writes. Changes to products deleted meanwhile are skipped.
export function toWrites(changes: readonly ProductChange[], products: ReadonlyMap<string, Product>): Writes {
  const writes: Writes = { add: [], update: [], remove: [] };
  for (const change of changes) {
    if (change.kind === "add") {
      const { name, localName, price, unit } = change.product;
      writes.add.push({ name, localName: localName ?? undefined, price, unit: unit ?? undefined, inStock: true });
      continue;
    }
    const product = products.get(change.id);
    if (!product) continue;
    if (change.kind === "remove") writes.remove.push(product);
    else writes.update.push({ id: product.id, patch: change.edit });
  }
  return writes;
}
