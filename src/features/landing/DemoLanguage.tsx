"use client";

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import type { LabelLanguage } from "@/domain/store";
import { LABEL_LANGUAGE_OPTIONS } from "@/features/seller/options";
import { StorefrontView } from "@/features/storefront";
import { PhonePreview } from "@/features/theme";

const DEMO_ID = "example-shop";

type DemoLanguage = { language: LabelLanguage; setLanguage: (language: LabelLanguage) => void };
const DemoLanguageContext = createContext<DemoLanguage>({ language: "en", setLanguage: () => {} });

// Lets the hero's language chips switch the example shop further down.
export function DemoLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LabelLanguage>("en");
  return <DemoLanguageContext.Provider value={{ language, setLanguage }}>{children}</DemoLanguageContext.Provider>;
}

// Each chip shows the example shop in that language and brings it into view.
export function LanguageChips({ className }: { className?: string }) {
  const { language, setLanguage } = useContext(DemoLanguageContext);

  function pick(next: LabelLanguage) {
    setLanguage(next);
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(DEMO_ID)?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "center" });
  }

  return (
    <ul className={className} aria-label="See the example shop in">
      {LABEL_LANGUAGE_OPTIONS.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            aria-label={option.ariaLabel}
            aria-pressed={language === option.value}
            onClick={() => pick(option.value)}
          >
            <span lang={option.value}>{option.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

type DemoShopProps = Pick<ComponentProps<typeof StorefrontView>, "store" | "products"> & { className?: string };

// The example shop in a phone, in the language picked above. A new language
// starts it fresh, so the chips win over the phone's own picker.
export function DemoShop({ store, products, className }: DemoShopProps) {
  const { language } = useContext(DemoLanguageContext);
  return (
    <PhonePreview id={DEMO_ID} className={className} label="An example shop">
      <StorefrontView key={language} store={store} products={products} embedded startIn={language} />
    </PhonePreview>
  );
}
