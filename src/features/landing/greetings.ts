import type { LabelLanguage } from "@/domain/store";

// "Hello" in every language Shelfie speaks, in the order the hero shows them.
export const GREETINGS: readonly { language: LabelLanguage; word: string }[] = [
  { language: "en", word: "Hello" },
  { language: "si", word: "ආයුබෝවන්" },
  { language: "ta", word: "வணக்கம்" },
  { language: "th", word: "สวัสดี" },
  { language: "km", word: "សួស្តី" },
];

// The greeting to start on: the visitor's own language when we speak it.
export function greetingIndexFor(languages: readonly string[]): number {
  for (const tag of languages) {
    const index = GREETINGS.findIndex(({ language }) => language === tag.toLowerCase().split("-")[0]);
    if (index >= 0) return index;
  }
  return 0;
}
