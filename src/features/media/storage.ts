import { blobToDataUrl, squarePhoto } from "./image";

// Where photos are kept. Each function returns the URL to save on the doc.
//
// TODAY ("inline"): the photo is shrunk to a small square and stored as a data
// URL inside the Firestore document. No Firebase Storage, no Blaze plan, no
// extra requests. Fine for demos and small shops (Firestore docs max 1 MB).
//
// TO SCALE: upload `photo` with firebase/storage (uploadBytes → getDownloadURL)
// under stores/{slug}/… and return that URL. Nothing else changes: the UI just
// renders whatever URL is stored.

const MAX_INLINE_BYTES = 140_000; // keep in sync with the size caps in firestore.rules

async function saveSquare(image: Blob, size: number): Promise<string> {
  let photo = await squarePhoto(image, size);
  if (photo.size > MAX_INLINE_BYTES) photo = await squarePhoto(image, Math.round(size * 0.68));
  return blobToDataUrl(photo);
}

export function saveProductImage(_storeSlug: string, image: Blob): Promise<string> {
  return saveSquare(image, 560);
}

// The round shop avatar is small on screen, so it's stored smaller too.
export function saveStoreLogo(_storeSlug: string, image: Blob): Promise<string> {
  return saveSquare(image, 320);
}
