import type { OpenState } from "@/domain/hours";
import type { PriceUnit, Product, Variant } from "@/domain/product";
import type { LabelLanguage } from "@/domain/store";
import type { Words } from "@/lib/words";

// Which of a product's two names leads. The label name does when the customer
// reads the shop's own language; otherwise the English one, as before.
export function productNames(
  product: Pick<Product, "name" | "localName">,
  language: LabelLanguage,
  shopLanguage: LabelLanguage,
): { name: string; other?: string } {
  const local = product.localName?.trim();
  if (local && language === shopLanguage && language !== "en") return { name: local, other: product.name };
  return { name: product.name, other: local || undefined };
}

// "Open · until 21:00", "Closed · opens tomorrow 07:00", in the page's language.
export function hoursLabel(state: OpenState, words: Words): string {
  if (state.open) return state.allDay || !state.time ? words.open24 : words.openUntil(state.time);
  if (!state.time) return words.closed;
  const day = state.day === "tomorrow" ? words.tomorrow : typeof state.day === "number" ? words.weekdays[state.day] : "";
  return words.closedOpens(day ? `${day} ${state.time}` : state.time);
}

// "Size M, Black"
export function variantText(variant: Variant | undefined, words: Pick<Words, "sizeOf">): string {
  return [variant?.size ? words.sizeOf(variant.size) : null, variant?.color].filter(Boolean).join(", ");
}

// After a price: "" for each, " / kg", " / กำ".
export function perUnitText(unit: PriceUnit, words: Words): string {
  return unit === "each" ? "" : ` / ${words.per[unit]}`;
}
