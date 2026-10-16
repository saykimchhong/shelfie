import { blobToDataUrl, squarePhoto } from "./image";

// Where product photos are kept. Returns the URL to save as product.imageUrl.
//
// TODAY ("inline"): the photo is shrunk to a small square and stored as a data
// URL inside the product document. No Firebase Storage, no Blaze plan, no extra
// requests. Fine for demos and small shops (Firestore docs max out at 1 MB).
//
// TO SCALE: upload `photo` with firebase/storage (uploadBytes → getDownloadURL)
// to stores/{slug}/products/{id}.webp and return that URL. Nothing else changes:
// the storefront just renders whatever imageUrl holds.

const MAX_INLINE_BYTES = 140_000; // keep in sync with validProduct() in firestore.rules

export async function saveProductImage(_storeSlug: string, image: Blob): Promise<string> {
  let photo = await squarePhoto(image, 560);
  if (photo.size > MAX_INLINE_BYTES) photo = await squarePhoto(image, 380);
  return blobToDataUrl(photo);
}
