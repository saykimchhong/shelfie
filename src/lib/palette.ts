// One accent color → a full, readable brand palette for light and dark mode.
// Sellers can pick any color; we nudge the derived shades until text on them
// meets WCAG AA (4.5:1). The output is CSS custom properties for <ThemeScope>.

type Rgb = [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const INK: Rgb = [26, 15, 10]; // dark text used on light fills
// Keep these in sync with bg in src/styles/_tokens.scss.
const LIGHT_BG: Rgb = [255, 248, 242];
const DARK_BG: Rgb = [23, 17, 14];

const AA = 4.5;

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * amount) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Move `color` toward `target` in 5% steps until `ok` passes.
function nudge(color: Rgb, target: Rgb, ok: (candidate: Rgb) => boolean): Rgb {
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(color, target, step / 20);
    if (ok(candidate)) return candidate;
  }
  return target;
}

// Button fill + the text color on it. Very light accents keep their color and
// get dark text; everything else is deepened until white text is readable.
function solidFor(accent: Rgb, mode: "light" | "dark"): { solid: Rgb; on: Rgb } {
  if (mode === "dark" || contrast(accent, INK) >= 7) {
    return { solid: nudge(accent, WHITE, (c) => contrast(c, INK) >= AA), on: INK };
  }
  return { solid: nudge(accent, BLACK, (c) => contrast(c, WHITE) >= AA), on: WHITE };
}

export type PaletteVars = Record<`--t-${string}`, string>;

export function derivePalette(accentHex: string): PaletteVars {
  const accent = hexToRgb(accentHex);
  const light = solidFor(accent, "light");
  const dark = solidFor(accent, "dark");

  return {
    "--t-brand": accentHex,
    "--t-solid": rgbToHex(light.solid),
    "--t-on": rgbToHex(light.on),
    "--t-soft": rgbToHex(mix(accent, LIGHT_BG, 0.86)),
    "--t-text": rgbToHex(nudge(accent, BLACK, (c) => contrast(c, LIGHT_BG) >= AA)),
    "--t-solid-dark": rgbToHex(dark.solid),
    "--t-on-dark": rgbToHex(dark.on),
    "--t-soft-dark": rgbToHex(mix(accent, DARK_BG, 0.74)),
    "--t-text-dark": rgbToHex(nudge(accent, WHITE, (c) => contrast(c, DARK_BG) >= AA)),
  };
}
