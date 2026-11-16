"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui";
import type { Store } from "@/domain/store";
import type { ProductChange } from "@/domain/updates";
import { useAuth, useSignedInUser } from "@/features/auth";
import { removeImage } from "@/features/media";
import { DashboardSkeleton } from "@/features/seller";
import { saveProductChanges, useMyStore, useProducts, useRefreshStorefront } from "@/features/seller/data";
import { requestUpdates } from "./api";
import { toListedProducts, toWrites } from "./changes";
import { ChatRoom, type Ask } from "./ChatRoom";

// The shop assistant's page: ask about the products, or say what changed.
export function AssistantRoom() {
  const user = useSignedInUser();
  const store = useMyStore(user.uid);
  const router = useRouter();

  useEffect(() => {
    if (store.status === "ready" && !store.data) router.replace("/dashboard");
  }, [store.status, store.data, router]);

  if (store.status === "error") {
    return <EmptyState tone="berry" icon={<TriangleAlert />} title="Couldn't load your store" description={store.error?.message} />;
  }
  if (!store.data) return <DashboardSkeleton />;
  return <Room key={store.data.slug} store={store.data} />;
}

// Connects the chat to the shop's live products and the AI.
function Room({ store }: { store: Store }) {
  const { getIdToken } = useAuth();
  const refreshStorefront = useRefreshStorefront();
  const products = useProducts(store.slug);

  async function ask({ message, history, waiting }: Ask) {
    return requestUpdates({
      message,
      products: toListedProducts(products.data, store.priceUnit),
      currency: store.currency,
      labelLanguage: store.labelLanguage,
      shopType: store.shopType,
      history,
      waiting,
      idToken: await getIdToken(),
    });
  }

  async function save(changes: ProductChange[]) {
    const writes = toWrites(changes, new Map(products.data.map((product) => [product.id, product])));
    await saveProductChanges(
      store.slug,
      { add: writes.add, update: writes.update, remove: writes.remove.map((product) => product.id) },
      Date.now(),
    );
    writes.remove.forEach((product) => removeImage(product.imageUrl));
    await refreshStorefront(store.slug);
  }

  return <ChatRoom store={store} products={products.data} ready={products.status === "ready"} ask={ask} onSave={save} />;
}
