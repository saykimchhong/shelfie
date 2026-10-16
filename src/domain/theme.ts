import { z } from "zod";

// A store's look = a layout template + one accent color. Every other brand
// shade (button fill, soft tint, readable text) is derived from the accent in
// src/lib/palette.ts, so sellers can pick any color and it stays legible.

export const TEMPLATES = ["grid", "list", "showcase"] as const;
export const templateSchema = z.enum(TEMPLATES);
export type Template = z.infer<typeof templateSchema>;

export const TEMPLATE_INFO: Record<Template, { name: string; bestFor: string }> = {
  grid: { name: "Grid", bestFor: "Most shops" },
  list: { name: "List", bestFor: "Many small items" },
  showcase: { name: "Showcase", bestFor: "Few special items" },
};

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const themeSchema = z.object({
  template: templateSchema,
  accent: z.string().regex(HEX_COLOR, "Use a color like #f26430"),
});

export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = { template: "grid", accent: "#f26430" };

export const PALETTE_PRESETS = [
  { name: "Mango", accent: "#f26430" },
  { name: "Lotus", accent: "#d6336c" },
  { name: "Saffron", accent: "#e8a100" },
  { name: "Lagoon", accent: "#0f9f8e" },
  { name: "Leaf", accent: "#2f9e44" },
  { name: "Indigo", accent: "#4f46e5" },
  { name: "Ink", accent: "#334155" },
] as const;
