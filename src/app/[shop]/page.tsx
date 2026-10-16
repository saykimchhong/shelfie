import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StorefrontSkeleton, StorefrontView } from "@/features/storefront";
import { getStorefront } from "@/server/storefront";

// Public storefront: shelfie.app/{slug}. The skeleton is the static shell;
// the store streams in from a per-slug cache (see server/storefront.ts).

export async function generateMetadata({ params }: PageProps<"/[shop]">): Promise<Metadata> {
  const { shop } = await params;
  const storefront = await getStorefront(shop);
  if (!storefront) return { title: "Store not found" };

  const { store, products } = storefront;
  const description = store.tagline ?? `${products.length} products · order on WhatsApp or LINE`;
  return {
    title: store.name,
    description,
    openGraph: { title: store.name, description, type: "website" },
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
