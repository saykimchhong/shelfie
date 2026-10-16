import type { SegmentedOption } from "@/components/ui";
import type { Currency, LabelLanguage } from "@/domain/store";

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

// Example number for the WhatsApp field, matched to the chosen currency.
export const PHONE_PLACEHOLDER: Record<Currency, string> = {
  USD: "+855 12 345 678",
  KHR: "+855 12 345 678",
  LKR: "+94 77 123 4567",
  THB: "+66 81 234 5678",
};
