import type { PriceUnit } from "@/domain/product";
import type { Currency } from "@/domain/store";

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  KHR: "km-KH",
  LKR: "en-LK",
  THB: "th-TH",
};

// $4,000 · 4,000៛ · Rs 4,000 · ฿4,000
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

// After a price on a product: "" for each (as before), " / kg", " / bunch".
export function perUnit(unit: PriceUnit): string {
  return unit === "each" ? "" : ` / ${unit}`;
}

const UNIT_PLURAL: Record<PriceUnit, string> = { each: "", kg: "kg", bunch: "bunches", pack: "packs" };

// How much of a product is ordered: "2" for items, "2 kg", "1 bunch", "3 packs".
export function quantityWithUnit(quantity: number, unit: PriceUnit): string {
  if (unit === "each") return String(quantity);
  return `${quantity} ${quantity === 1 ? unit : UNIT_PLURAL[unit]}`;
}

// "1 product" · "18 products"
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// "Bananas (bunch)" → "BB", "កាហ្វេ" → "កា". Leading punctuation is skipped.
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[1]][0]];
  return letters.join("").toUpperCase();
}

// Stable 0–359 hue from any string, for colorful placeholders.
export function hueFromString(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.codePointAt(0)!) | 0;
  }
  return Math.abs(hash) % 360;
}
