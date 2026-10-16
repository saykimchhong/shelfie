// A store's slug is its Firestore document id and its public URL: /{slug}.
// Keep RESERVED_SLUGS in sync with `validSlug` in firestore.rules.

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "api",
  "app",
  "dashboard",
  "help",
  "login",
  "logout",
  "new",
  "privacy",
  "settings",
  "shelfie",
  "templates",
  "terms",
]);

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

// For a slug input while typing: keeps a trailing dash so "kamal-" can become
// "kamal-stores". Run slugify() on submit to finish it off.
export function sanitizeSlugInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX);
}

// Latin-only by design: Sinhala/Thai names produce "", and the seller types one.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}
