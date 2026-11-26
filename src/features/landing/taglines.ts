import type { LabelLanguage } from "@/domain/store";

// The hero's second line in every language Shelfie speaks, with each
// language's own name for the picker. Thai and Khmer don't end with a period.
export const TAGLINES: readonly { language: LabelLanguage; name: string; text: string }[] = [
  { language: "en", name: "English", text: "Get a shop online." },
  { language: "si", name: "සිංහල", text: "ඔන්ලයින් කඩයක් පටන් ගන්න." },
  { language: "ta", name: "தமிழ்", text: "ஆன்லைன் கடையைத் தொடங்குங்கள்." },
  { language: "th", name: "ไทย", text: "เปิดร้านออนไลน์" },
  { language: "km", name: "ខ្មែរ", text: "បើកហាងអនឡាញ" },
];

// The tagline to start on: the visitor's own language when we speak it.
export function taglineIndexFor(languages: readonly string[]): number {
  for (const tag of languages) {
    const index = TAGLINES.findIndex(({ language }) => language === tag.toLowerCase().split("-")[0]);
    if (index >= 0) return index;
  }
  return 0;
}
