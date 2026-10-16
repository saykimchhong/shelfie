"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { PALETTE_PRESETS, TEMPLATE_INFO, TEMPLATES, type Template, type Theme } from "@/domain/theme";
import styles from "./ThemePicker.module.scss";

export function ThemePicker({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className={styles.picker}>
      <LayoutPicker value={value.template} onChange={(template) => onChange({ ...value, template })} />
      <ColorPicker value={value.accent} onChange={(accent) => onChange({ ...value, accent })} />
    </div>
  );
}

export function LayoutPicker({ value, onChange }: { value: Template; onChange: (template: Template) => void }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Layout</legend>
      <div className={styles.templates}>
        {TEMPLATES.map((template) => (
          <button
            key={template}
            type="button"
            aria-pressed={value === template}
            className={clsx(styles.template, value === template && styles.selected)}
            onClick={() => onChange(template)}
          >
            <TemplateGlyph template={template} />
            <span className={styles.templateName}>{TEMPLATE_INFO[template].name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (accent: string) => void }) {
  const accent = value.toLowerCase();
  const isPreset = PALETTE_PRESETS.some((preset) => preset.accent === accent);

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Color</legend>
      <div className={styles.swatches}>
        {PALETTE_PRESETS.map((preset) => {
          const selected = preset.accent === accent;
          return (
            <button
              key={preset.accent}
              type="button"
              aria-pressed={selected}
              aria-label={preset.name}
              title={preset.name}
              className={clsx(styles.swatch, selected && styles.swatchSelected)}
              style={{ "--swatch": preset.accent } as CSSProperties}
              onClick={() => onChange(preset.accent)}
            >
              {selected ? <Check aria-hidden /> : null}
            </button>
          );
        })}
        {/* Any color: the native picker, dressed as a rainbow swatch. */}
        <label
          className={clsx(styles.swatch, styles.custom, !isPreset && styles.swatchSelected)}
          title="Custom color"
          style={{ "--swatch": isPreset ? undefined : accent } as CSSProperties}
        >
          <input
            type="color"
            aria-label="Custom color"
            value={accent}
            onChange={(event) => onChange(event.target.value)}
          />
          {!isPreset ? <Check aria-hidden /> : null}
        </label>
      </div>
    </fieldset>
  );
}

// Tiny wireframes, so the choice is visual instead of a paragraph of text.
function TemplateGlyph({ template }: { template: Template }) {
  return (
    <span className={clsx(styles.glyph, styles[`glyph-${template}`])} aria-hidden>
      {Array.from({ length: template === "showcase" ? 2 : 4 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}
