"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { LabelLanguage } from "@/domain/store";
import { isLanguage, wordsFor, type Words } from "@/lib/words";

type Language = {
  // What the customer reads the page in.
  language: LabelLanguage;
  // The language the shop's own labels are in (product.localName).
  shopLanguage: LabelLanguage;
  words: Words;
};

const LanguageContext = createContext<Language>({ language: "en", shopLanguage: "en", words: wordsFor("en") });

export const LanguageProvider = LanguageContext.Provider;
export const useLanguage = () => useContext(LanguageContext);
export const useWords = () => useContext(LanguageContext).words;

// The customer's own choice, kept on their phone for every shop they visit.
const KEY = "shelfie:language";
const listeners = new Set<() => void>();
// Also the fallback when storage is blocked (private windows).
let picked: LabelLanguage | null = null;

function savedLanguage(): LabelLanguage | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    return isLanguage(saved) ? saved : picked;
  } catch {
    return picked;
  }
}

function saveLanguage(language: LabelLanguage) {
  picked = language;
  try {
    window.localStorage.setItem(KEY, language);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// The page's language: the customer's saved choice, else the shop's own.
// The server and the first paint use the shop's. Previews (remember: false)
// keep the choice only while they're open.
export function usePageLanguage(
  shopLanguage: LabelLanguage,
  remember: boolean,
  startIn?: LabelLanguage,
): [Language, (language: LabelLanguage) => void] {
  const saved = useSyncExternalStore(subscribe, savedLanguage, () => null);
  const [previewed, setPreviewed] = useState<LabelLanguage | null>(null);
  const language = (remember ? saved : previewed) ?? startIn ?? shopLanguage;
  return [{ language, shopLanguage, words: wordsFor(language) }, remember ? saveLanguage : setPreviewed];
}
