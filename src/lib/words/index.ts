import { LABEL_LANGUAGES, type LabelLanguage } from "@/domain/store";
import { en, type Words } from "./en";
import { km } from "./km";
import { si } from "./si";
import { ta } from "./ta";
import { th } from "./th";

export type { Words } from "./en";

const WORDS: Record<LabelLanguage, Words> = { en, km, si, ta, th };

export function wordsFor(language: LabelLanguage): Words {
  return WORDS[language];
}

// Each language named in itself, as a customer looks for it in a list.
export const LANGUAGE_LABELS: Record<LabelLanguage, string> = {
  en: "English",
  km: "ខ្មែរ",
  si: "සිංහල",
  ta: "தமிழ்",
  th: "ไทย",
};

export function isLanguage(value: unknown): value is LabelLanguage {
  return LABEL_LANGUAGES.includes(value as LabelLanguage);
}
