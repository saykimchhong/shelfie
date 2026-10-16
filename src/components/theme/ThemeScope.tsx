import clsx from "clsx";
import type { CSSProperties, HTMLAttributes } from "react";
import { derivePalette } from "@/lib/palette";
import styles from "./ThemeScope.module.scss";

// Re-brands everything inside it: every component that uses --brand-* tokens
// picks up the seller's accent color, in light and dark mode.
export function ThemeScope({
  accent,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { accent: string }) {
  return (
    <div
      className={clsx(styles.scope, className)}
      style={{ ...(derivePalette(accent) as CSSProperties), ...style }}
      {...rest}
    />
  );
}
