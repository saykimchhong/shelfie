import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./Text.module.scss";

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: "p" | "span" | "div" | "strong" | "h1" | "h2" | "h3" | "h4";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "display";
  tone?: "default" | "muted" | "subtle" | "brand" | "accent" | "danger" | "inherit";
  weight?: 400 | 500 | 600 | 700 | 800;
  align?: "start" | "center";
  // Clamp to N lines with an ellipsis.
  clamp?: 1 | 2 | 3;
};

export function Text({
  as: Tag = "p",
  size = "md",
  tone = "default",
  weight,
  align,
  clamp,
  className,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={clsx(
        styles.text,
        styles[`size-${size}`],
        styles[`tone-${tone}`],
        weight && styles[`weight-${weight}`],
        align && styles[`align-${align}`],
        clamp && styles[`clamp-${clamp}`],
        className,
      )}
      {...rest}
    />
  );
}
