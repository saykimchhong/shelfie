import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StorefrontSkeleton, StorefrontView } from "@/features/storefront";
import { SHARE_IMAGE, sharePhotos } from "@/server/shareImage";
import { getStorefront } from "@/server/storefront";

// Public storefront: shelfie.app/{slug}. The skeleton is the static shell;
// the store streams in from a per-slug cache (see server/storefront.ts).

export async function generateMetadata({ params }: PageProps<"/[shop]">): Promise<Metadata> {
  const { shop } = await params;
  const storefront = await getStorefront(shop);
  if (!storefront) return { title: "Store not found" };

  const { store, products } = storefront;
  const description = store.tagline ?? `${products.length} products · order on WhatsApp or LINE`;
  // The link preview shows product photos, when the store has any.
  const images =
    sharePhotos(products).length > 0
      ? [{ url: `/${store.slug}/share-image`, ...SHARE_IMAGE, type: "image/jpeg", alt: store.name }]
      : undefined;
  return {
    title: store.name,
    description,
    openGraph: { title: store.name, description, type: "website", url: `/${store.slug}`, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: store.name, description, images },
  };
}

export default function StorefrontPage({ params }: PageProps<"/[shop]">) {
  return (
    <Suspense fallback={<StorefrontSkeleton />}>
      {params.then(({ shop }) => (
        <Storefront slug={shop} />
      ))}
    </Suspense>
  );
}

async function Storefront({ slug }: { slug: string }) {
  const storefront = await getStorefront(slug);
  if (!storefront) notFound();
  return <StorefrontView store={storefront.store} products={storefront.products} />;
}
