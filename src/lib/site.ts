export const site = {
  name: "Shelfie",
  tagline: "Film your shelf. Get a store.",
  description:
    "Shelfie turns one walk-through video of your shop into a shareable online store, with prices and local-language labels.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function storeUrl(slug: string): string {
  return `${site.url}/${slug}`;
}

// "shelfie.app/kamal-stores" — the short form we show in the UI.
export function storeUrlLabel(slug: string): string {
  return `${site.url.replace(/^https?:\/\//, "")}/${slug}`;
}
