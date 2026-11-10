import clsx from "clsx";
import type { CSSProperties, HTMLAttributes } from "react";
import { derivePalette, isDarkColor } from "@/lib/palette";
import styles from "./ThemeScope.module.scss";

// Re-brands everything inside it: every component that uses --brand-* tokens
// picks up the seller's accent color. With a background, the page is that
// color on every device, with text light or dark to match it.
export function ThemeScope({
  accent,
  background,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { accent: string; background?: string }) {
  return (
    <div
      className={clsx(styles.scope, className)}
      data-mode={background ? (isDarkColor(background) ? "dark" : "light") : undefined}
      style={{
        ...(derivePalette(accent) as CSSProperties),
        ...(background ? ({ "--custom-bg": background } as CSSProperties) : {}),
        ...style,
      }}
      {...rest}
    />
  );
}
