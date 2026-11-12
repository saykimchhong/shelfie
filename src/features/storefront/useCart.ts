"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cartStorageKey, createCartStore, type Cart } from "./savedCart";

// The cart for one shop, kept across refreshes. Pass null (previews) to keep
// it in memory only. The server and the first paint always see it empty.
export function useCart(slug: string | null): { cart: Cart; update: (change: (cart: Cart) => Cart) => void } {
  const store = useMemo(() => createCartStore(slug === null ? null : cartStorageKey(slug)), [slug]);
  const cart = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { cart, update: store.update };
}
