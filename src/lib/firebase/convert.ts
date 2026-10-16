// Firestore → domain converters. Pure (no SDK import) so both the full client
// SDK and firestore/lite on the server can share them.
import { productSchema, type Product } from "@/domain/product";
import { storeSchema, type PublicStore, type Store } from "@/domain/store";

type DocData = Record<string, unknown>;

// Works for Timestamps from either SDK; pending serverTimestamp() reads as now.
function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis(): number }).toMillis();
  }
  return Date.now();
}

// Optional fields are stored absent, but tolerate nulls written by hand in the console.
function dropNulls(data: DocData, keep: string[] = []): DocData {
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => value !== null || keep.includes(key)),
  );
}

export function toStore(id: string, data: DocData): Store | null {
  const parsed = storeSchema.safeParse({
    ...dropNulls(data),
    slug: id,
    contact: dropNulls((data.contact as DocData | undefined) ?? {}),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  });
  if (!parsed.success) {
    console.warn(`Skipping invalid store "${id}"`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

export function toPublicStore(store: Store): PublicStore {
  const { ownerId: _ownerId, ...rest } = store;
  return rest;
}

export function toProduct(id: string, data: DocData): Product | null {
  const parsed = productSchema.safeParse({
    ...dropNulls(data, ["price"]),
    id,
    price: data.price ?? null,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  });
  if (!parsed.success) {
    console.warn(`Skipping invalid product "${id}"`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

export function isPermissionDenied(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "permission-denied";
}
