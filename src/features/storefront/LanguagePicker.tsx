"use client";

import { ChevronDown, Globe } from "lucide-react";
import { LABEL_LANGUAGES, type LabelLanguage } from "@/domain/store";
import { LANGUAGE_LABELS } from "@/lib/words";
import styles from "./LanguagePicker.module.scss";

// The customer picks the language they read. A plain system menu: every phone
// user knows it, and each language is written in itself.
export function LanguagePicker({
  language,
  onChange,
  label,
}: {
  language: LabelLanguage;
  onChange: (language: LabelLanguage) => void;
  label: string;
}) {
  return (
    <label className={styles.picker}>
      <Globe aria-hidden className={styles.globe} />
      <select value={language} onChange={(event) => onChange(event.target.value as LabelLanguage)} aria-label={label}>
        {LABEL_LANGUAGES.map((option) => (
          <option key={option} value={option} lang={option}>
            {LANGUAGE_LABELS[option]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={styles.chevron} />
    </label>
  );
}
