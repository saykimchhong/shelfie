"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import {
  BACKGROUND_PRESETS,
  PALETTE_PRESETS,
  TEMPLATE_INFO,
  TEMPLATES,
  type Template,
  type Theme,
} from "@/domain/theme";
import { isDarkColor } from "@/lib/palette";
import styles from "./ThemePicker.module.scss";

export function ThemePicker({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className={styles.picker}>
      <LayoutPicker value={value.template} onChange={(template) => onChange({ ...value, template })} />
      <ColorPicker value={value.accent} onChange={(accent) => onChange({ ...value, accent })} />
      <BackgroundPicker value={value.background} onChange={(background) => onChange({ ...value, background })} />
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
            <span className={styles.templateHint}>{TEMPLATE_INFO[template].bestFor}</span>
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

const GLYPH_PARTS: Record<Template, number> = { grid: 4, list: 4, showcase: 2, compact: 9, menu: 5, shelves: 6 };

// The page color. "Default" is the original look; any other is used as is.
export function BackgroundPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (background: string | undefined) => void;
}) {
  const background = value?.toLowerCase();
  const isPreset = background === undefined || BACKGROUND_PRESETS.some((preset) => preset.background === background);
  // A check that shows on light and dark swatches alike.
  const check = (color: string) => (
    <Check aria-hidden style={{ color: isDarkColor(color) ? "#fff" : "#1c1917", filter: "none" }} />
  );

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Background</legend>
      <div className={styles.swatches}>
        <button
          type="button"
          aria-pressed={background === undefined}
          aria-label="Default"
          title="Default"
          className={clsx(styles.swatch, styles.paper, styles.defaultBg, background === undefined && styles.swatchSelected)}
          onClick={() => onChange(undefined)}
        >
          {background === undefined ? check("#fff8f2") : null}
        </button>
        {BACKGROUND_PRESETS.map((preset) => {
          const selected = preset.background === background;
          return (
            <button
              key={preset.background}
              type="button"
              aria-pressed={selected}
              aria-label={preset.name}
              title={preset.name}
              className={clsx(styles.swatch, styles.paper, selected && styles.swatchSelected)}
              style={{ "--swatch": preset.background } as CSSProperties}
              onClick={() => onChange(preset.background)}
            >
              {selected ? check(preset.background) : null}
            </button>
          );
        })}
        <label
          className={clsx(styles.swatch, styles.custom, !isPreset && styles.swatchSelected)}
          title="Custom background"
          style={{ "--swatch": isPreset ? undefined : background } as CSSProperties}
        >
          <input
            type="color"
            aria-label="Custom background"
            value={background ?? "#fff8f2"}
            onChange={(event) => onChange(event.target.value)}
          />
          {!isPreset && background ? check(background) : null}
        </label>
      </div>
    </fieldset>
  );
}

// Tiny wireframes, so the choice is visual instead of a paragraph of text.
function TemplateGlyph({ template }: { template: Template }) {
  return (
    <span className={clsx(styles.glyph, styles[`glyph-${template}`])} aria-hidden>
      {Array.from({ length: GLYPH_PARTS[template] }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}
