"use server";

import { updateTag } from "next/cache";
import { isValidSlug } from "@/domain/slug";
import { verifyIdToken } from "./auth";
import { storefrontTag } from "./storefront";

// Called by the seller's browser after it writes to Firestore, so the public
// page shows the change on the next visit. It only expires a cache entry (the
// data itself is protected by Firestore rules), so a signed-in user is enough.
export async function refreshStorefront(idToken: string, slug: string): Promise<void> {
  await verifyIdToken(idToken);
  if (!isValidSlug(slug)) return;
  updateTag(storefrontTag(slug));
}
