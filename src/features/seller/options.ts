import type { SegmentedOption } from "@/components/ui";
import type { PriceUnit } from "@/domain/product";
import type { Currency, FulfillmentOffer, LabelLanguage, RestockSettings } from "@/domain/store";

// Symbols and script samples instead of words: less text in the UI.
// (No flag emojis: Windows renders them as plain letters.)
export const CURRENCY_OPTIONS: readonly SegmentedOption<Currency>[] = [
  { value: "USD", label: "$ USD", ariaLabel: "US dollar" },
  { value: "KHR", label: "៛ KHR", ariaLabel: "Cambodian riel" },
  { value: "LKR", label: "Rs LKR", ariaLabel: "Sri Lankan rupee" },
  { value: "THB", label: "฿ THB", ariaLabel: "Thai baht" },
];

export const LABEL_LANGUAGE_OPTIONS: readonly SegmentedOption<LabelLanguage>[] = [
  { value: "en", label: "EN", ariaLabel: "English" },
  { value: "km", label: "ខ្មែរ", ariaLabel: "Khmer" },
  { value: "si", label: "සිං", ariaLabel: "Sinhala" },
  { value: "ta", label: "த", ariaLabel: "Tamil" },
  { value: "th", label: "ไทย", ariaLabel: "Thai" },
];

// Default for a re-filmed shelf's products that aren't in the new video.
export const MISSING_PRODUCT_OPTIONS: readonly SegmentedOption<RestockSettings["missing"]>[] = [
  { value: "soldOut", label: "Mark sold out" },
  { value: "keep", label: "Keep in stock" },
];

// How customers can get their order.
export const FULFILLMENT_OPTIONS: readonly SegmentedOption<FulfillmentOffer>[] = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
  { value: "both", label: "Both" },
];

// What a price is for. "Item" reads better than "each" as a choice.
export const PRICE_UNIT_OPTIONS: readonly SegmentedOption<PriceUnit>[] = [
  { value: "each", label: "Item" },
  { value: "kg", label: "kg" },
  { value: "bunch", label: "Bunch" },
  { value: "pack", label: "Pack" },
];

// Example number for the WhatsApp field, matched to the chosen currency.
export const PHONE_PLACEHOLDER: Record<Currency, string> = {
  USD: "+855 12 345 678",
  KHR: "+855 12 345 678",
  LKR: "+94 77 123 4567",
  THB: "+66 81 234 5678",
};
