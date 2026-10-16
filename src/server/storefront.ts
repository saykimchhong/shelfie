import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore/lite";
import type { Product } from "@/domain/product";
import { isValidSlug } from "@/domain/slug";
import type { PublicStore } from "@/domain/store";
import { isPermissionDenied, toProduct, toPublicStore, toStore } from "@/lib/firebase/convert";
import { serverDb } from "./firebase";

export type Storefront = {
  store: PublicStore;
  products: Product[];
};

export function storefrontTag(slug: string): string {
  return `storefront:${slug}`;
}

// Cached per slug. Sellers' edits call refreshStorefront() to expire it.
export async function getStorefront(slug: string): Promise<Storefront | null> {
  "use cache";
  cacheTag(storefrontTag(slug));
  cacheLife("minutes");

  if (!isValidSlug(slug)) return null;

  const db = serverDb();
  try {
    const storeSnap = await getDoc(doc(db, "stores", slug));
    const store = storeSnap.exists() ? toStore(storeSnap.id, storeSnap.data()) : null;
    if (!store?.published) return null;

    const productSnap = await getDocs(
      query(collection(db, "stores", slug, "products"), orderBy("position")),
    );
    const products = productSnap.docs
      .map((snap) => toProduct(snap.id, snap.data()))
      .filter((product): product is Product => product !== null);

    return { store: toPublicStore(store), products };
  } catch (error) {
    // Unpublished stores are denied by the rules — to the public they don't exist.
    if (isPermissionDenied(error)) return null;
    throw error;
  }
}
