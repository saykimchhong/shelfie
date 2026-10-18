// Seller-side Firestore access (browser only — clientDb() is client-only).
// Writes go straight from the browser with the seller's auth; firestore.rules
// decide what's allowed.
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import type { Product, ProductInput } from "@/domain/product";
import type { Store, StoreInput } from "@/domain/store";
import { DEFAULT_THEME } from "@/domain/theme";
import { useAuth } from "@/features/auth";
import { chunk } from "@/lib/chunk";
import { clientDb } from "@/lib/firebase/client";
import { isPermissionDenied, toProduct, toStore } from "@/lib/firebase/convert";
import { refreshStorefront } from "@/server/actions";

type Live<T> = { status: "loading" | "ready" | "error"; data: T; error?: Error };

const storesRef = () => collection(clientDb(), "stores");
const storeRef = (slug: string) => doc(clientDb(), "stores", slug);
const productsRef = (slug: string) => collection(clientDb(), "stores", slug, "products");

// The signed-in seller's store (one per seller for now), live.
export function useMyStore(ownerId: string): Live<Store | null> {
  const [state, setState] = useState<Live<Store | null>>({ status: "loading", data: null });

  useEffect(() => {
    const myStore = query(storesRef(), where("ownerId", "==", ownerId), limit(1));
    return onSnapshot(
      myStore,
      { includeMetadataChanges: true },
      (snap) => {
        // An empty answer from the local cache isn't proof the seller has no
        // store; wait for the server before showing the create form.
        if (snap.empty && snap.metadata.fromCache) return;
        const first = snap.docs[0];
        setState({ status: "ready", data: first ? toStore(first.id, first.data()) : null });
      },
      (error) => setState({ status: "error", data: null, error }),
    );
  }, [ownerId]);

  return state;
}

export function useProducts(slug: string): Live<Product[]> {
  const [state, setState] = useState<Live<Product[]>>({ status: "loading", data: [] });

  useEffect(() => {
    return onSnapshot(
      query(productsRef(slug), orderBy("position")),
      (snap) => {
        const products = snap.docs
          .map((product) => toProduct(product.id, product.data()))
          .filter((product): product is Product => product !== null);
        setState({ status: "ready", data: products });
      },
      (error) => setState({ status: "error", data: [], error }),
    );
  }, [slug]);

  return state;
}

export class SlugTakenError extends Error {
  constructor() {
    super("That link is already taken");
  }
}

export class RulesNotDeployedError extends Error {
  constructor() {
    super("Firestore rules aren't deployed yet. Run: npm run deploy:rules -- --project <project-id>");
  }
}

// Our rules allow reading a missing store, and no store can ever have this id
// (slugs can't contain "_"; and Firestore reserves "__x__" ids, so not that).
// If this read is denied, firestore.rules isn't live: still default deny-all.
async function rulesAreDeployed(): Promise<boolean> {
  try {
    await getDoc(storeRef("_probe"));
    return true;
  } catch (error) {
    if (isPermissionDenied(error)) return false;
    throw error;
  }
}

export async function createStore(ownerId: string, input: StoreInput): Promise<void> {
  const db = clientDb();
  const ref = storeRef(input.slug);
  try {
    await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) throw new SlugTakenError();
      tx.set(ref, {
        ...input,
        ownerId,
        theme: DEFAULT_THEME,
        published: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    // Denied means either "someone else's draft has this slug" or "rules not deployed".
    throw (await rulesAreDeployed()) ? new SlugTakenError() : new RulesNotDeployedError();
  }
}

// In a patch, an optional field that is present but `undefined` means "remove
// it". (ignoreUndefinedProperties would otherwise silently keep the old value.)
function withDeletes(patch: object, optionalFields: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = { ...patch };
  for (const field of optionalFields) {
    if (field in patch && result[field] === undefined) result[field] = deleteField();
  }
  return result;
}

export type StorePatch = Partial<
  Pick<
    Store,
    | "name"
    | "tagline"
    | "description"
    | "logoUrl"
    | "contact"
    | "currency"
    | "labelLanguage"
    | "theme"
    | "restock"
    | "fulfillment"
    | "priceUnit"
    | "published"
    | "paymentQrUrl"
  >
>;

export async function updateStore(slug: string, patch: StorePatch): Promise<void> {
  await updateDoc(storeRef(slug), {
    ...withDeletes(patch, ["tagline", "description", "logoUrl", "paymentQrUrl"]),
    updatedAt: serverTimestamp(),
  });
}

const OPTIONAL_PRODUCT_FIELDS = ["localName", "unit", "category", "shelf", "imageUrl"] as const;

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 500;

type Write = (batch: WriteBatch) => void;

async function commitInBatches(writes: Write[]): Promise<void> {
  for (const group of chunk(writes, BATCH_LIMIT)) {
    const batch = writeBatch(clientDb());
    group.forEach((write) => write(batch));
    await batch.commit();
  }
}

export type ProductUpdate = { id: string; patch: Partial<ProductInput> };

// Everything one shelf video changes, saved together: new products after the
// existing ones (positions from startPosition, in video order) and updates to
// known ones (new price, back in stock, sold out).
export async function saveProductChanges(
  slug: string,
  changes: { add: ProductInput[]; update: ProductUpdate[] },
  startPosition: number,
): Promise<void> {
  await commitInBatches([
    ...changes.add.map((item, index) => (batch: WriteBatch) => {
      batch.set(doc(productsRef(slug)), {
        ...item,
        position: startPosition + index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }),
    ...changes.update.map(({ id, patch }) => (batch: WriteBatch) => {
      batch.update(doc(productsRef(slug), id), {
        ...withDeletes(patch, OPTIONAL_PRODUCT_FIELDS),
        updatedAt: serverTimestamp(),
      });
    }),
  ]);
}

export async function addProducts(slug: string, items: ProductInput[], startPosition: number): Promise<void> {
  await saveProductChanges(slug, { add: items, update: [] }, startPosition);
}

export async function updateProduct(slug: string, productId: string, patch: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(productsRef(slug), productId), {
    ...withDeletes(patch, OPTIONAL_PRODUCT_FIELDS),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(slug: string, productId: string): Promise<void> {
  await deleteDoc(doc(productsRef(slug), productId));
}

// Deletes every product in the store, read fresh from the server so none are
// missed. Returns their photo URLs so the caller can delete the files too.
export async function deleteAllProducts(slug: string): Promise<string[]> {
  const products = await getDocsFromServer(productsRef(slug));
  await commitInBatches(products.docs.map((product) => (batch: WriteBatch) => batch.delete(product.ref)));
  return products.docs.flatMap((product) => {
    const imageUrl: unknown = product.get("imageUrl");
    return typeof imageUrl === "string" ? [imageUrl] : [];
  });
}

// Call after any write that should show up on the public storefront.
export function useRefreshStorefront(): (slug: string) => Promise<void> {
  const { getIdToken } = useAuth();
  return useCallback(
    async (slug: string) => {
      try {
        await refreshStorefront(await getIdToken(), slug);
      } catch (error) {
        // Not fatal: the cache also expires on its own within minutes.
        console.warn("Storefront refresh failed", error);
      }
    },
    [getIdToken],
  );
}
