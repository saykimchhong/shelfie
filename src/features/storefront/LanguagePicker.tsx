"use client";

import { Globe } from "lucide-react";
import { Select } from "@/components/ui";
import { LABEL_LANGUAGES, type LabelLanguage } from "@/domain/store";
import { LANGUAGE_LABELS } from "@/lib/words";

// Each language is written in itself, so anyone finds their own.
const OPTIONS = LABEL_LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_LABELS[language], lang: language }));

// The customer picks the language they read.
export function LanguagePicker({
  language,
  onChange,
  label,
}: {
  language: LabelLanguage;
  onChange: (language: LabelLanguage) => void;
  label: string;
}) {
  return <Select value={language} options={OPTIONS} onChange={onChange} label={label} icon={<Globe aria-hidden />} align="end" />;
}
