import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { Store } from "@/domain/store";
import { clientStorage } from "@/lib/firebase/client";
import { blobToDataUrl, squarePhoto } from "./image";

// Where photos are kept. Each function returns the URL to save on the doc.
//
// Firebase Storage, under the seller's uid so storage.rules can check
// ownership without reading Firestore:
//   sellers/{uid}/stores/{slug}/{products|logo}/{random}.webp
// The download URL is public, like the store it belongs to.
//
// Without a Storage bucket in the env, photos fall back to small inline data
// URLs inside the Firestore doc (fine for local demos; docs max 1 MB).

export type PhotoOwner = Pick<Store, "slug" | "ownerId">;

type Folder = "products" | "logo";

// Square sizes. Product cards show photos at up to ~300px CSS on 2x screens.
const SIZES: Record<Folder, number> = { products: 720, logo: 320 };

const MAX_INLINE_BYTES = 140_000; // keep in sync with the size caps in firestore.rules
const INLINE_SIZES: Record<Folder, number> = { products: 560, logo: 320 };

// Photos never change once uploaded (a new photo gets a new name).
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const STORAGE_HOST = "https://firebasestorage.googleapis.com/";

async function save(owner: PhotoOwner, folder: Folder, image: Blob): Promise<string> {
  const storage = clientStorage();
  if (!storage) return saveInline(folder, image);

  const photo = await squarePhoto(image, SIZES[folder]);
  const extension = photo.type === "image/webp" ? "webp" : "jpg";
  const object = ref(storage, `sellers/${owner.ownerId}/stores/${owner.slug}/${folder}/${crypto.randomUUID()}.${extension}`);
  await uploadBytes(object, photo, { contentType: photo.type, cacheControl: CACHE_CONTROL });
  return getDownloadURL(object);
}

async function saveInline(folder: Folder, image: Blob): Promise<string> {
  const size = INLINE_SIZES[folder];
  let photo = await squarePhoto(image, size);
  if (photo.size > MAX_INLINE_BYTES) photo = await squarePhoto(image, Math.round(size * 0.68));
  return blobToDataUrl(photo);
}

export function saveProductImage(owner: PhotoOwner, image: Blob): Promise<string> {
  return save(owner, "products", image);
}

// The round shop avatar is small on screen, so it's stored smaller too.
export function saveStoreLogo(owner: PhotoOwner, image: Blob): Promise<string> {
  return save(owner, "logo", image);
}

// Deletes a photo that's no longer used (replaced, removed, or its product
// deleted). Best effort: a leftover file costs almost nothing, so failures are
// only logged. Inline photos live in the doc and need nothing.
export function removeImage(url: string | undefined): void {
  const storage = clientStorage();
  if (!storage || !url?.startsWith(STORAGE_HOST)) return;
  deleteObject(ref(storage, url)).catch((error) => console.warn("Couldn't delete old photo", error));
}
