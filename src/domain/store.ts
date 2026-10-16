import { z } from "zod";
import { isValidSlug } from "./slug";
import { themeSchema } from "./theme";

// Order = order shown in the UI: English/USD first, then Cambodia, Sri Lanka, Thailand.
// Keep both lists in sync with validStore() in firestore.rules.
export const CURRENCIES = ["USD", "KHR", "LKR", "THB"] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

// Main language printed on the seller's labels — steers Gemini's localName.
export const LABEL_LANGUAGES = ["en", "km", "si", "ta", "th"] as const;
export const labelLanguageSchema = z.enum(LABEL_LANGUAGES);
export type LabelLanguage = z.infer<typeof labelLanguageSchema>;

export const STORE_DESCRIPTION_MAX = 500;

export const contactSchema = z.object({
  whatsapp: z
    .string()
    .regex(/^\+?[0-9\s-]{8,20}$/, "Use an international number, e.g. +94 77 123 4567")
    .optional(),
  line: z.string().min(2).max(40).optional(),
});

export const storeSchema = z.object({
  slug: z.string().refine(isValidSlug, "Use 3–40 lowercase letters, numbers or dashes"),
  ownerId: z.string().min(1),
  name: z.string().trim().min(1, "Give your shop a name").max(80, "Keep it under 80 characters"),
  tagline: z.string().trim().max(140, "Keep it under 140 characters").optional(),
  // Optional "about the shop" text: story, opening hours, delivery area…
  description: z.string().trim().max(STORE_DESCRIPTION_MAX, `Keep it under ${STORE_DESCRIPTION_MAX} characters`).optional(),
  // Shop logo / photo, shown as the round avatar. Initials when missing.
  logoUrl: z.url().optional(),
  currency: currencySchema,
  labelLanguage: labelLanguageSchema,
  contact: contactSchema,
  // Missing on stores created before themes existed → DEFAULT_THEME.
  theme: themeSchema.optional(),
  paymentQrUrl: z.url().optional(),
  published: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Store = z.infer<typeof storeSchema>;

// What the public storefront is allowed to see.
export type PublicStore = Omit<Store, "ownerId">;

// Seller-editable fields (create form, settings).
export const storeInputSchema = storeSchema.pick({
  slug: true,
  name: true,
  tagline: true,
  currency: true,
  labelLanguage: true,
  contact: true,
});

export type StoreInput = z.infer<typeof storeInputSchema>;
