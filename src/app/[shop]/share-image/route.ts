import { renderShareImage, sharePhotos } from "@/server/shareImage";
import { getStorefront } from "@/server/storefront";

// GET /{slug}/share-image: the picture shown beside a shared store link.
export async function GET(_request: Request, context: RouteContext<"/[shop]/share-image">) {
  const { shop } = await context.params;
  const storefront = await getStorefront(shop);
  if (!storefront) return new Response(null, { status: 404 });

  const image = await renderShareImage(sharePhotos(storefront.products), storefront.store.theme?.background);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
