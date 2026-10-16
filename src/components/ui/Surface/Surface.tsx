import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./Surface.module.scss";

// The basic "card". Separation comes from tint + soft shadow, never a border.
export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "li" | "header" | "aside";
  tone?: "raised" | "tint" | "brand" | "accent" | "sun" | "berry";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "md" | "lg" | "xl";
  interactive?: boolean;
};

export function Surface({
  as: Tag = "div",
  tone = "raised",
  padding = "md",
  radius = "lg",
  interactive,
  className,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      className={clsx(
        styles.surface,
        styles[tone],
        styles[`pad-${padding}`],
        styles[`radius-${radius}`],
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    />
  );
}
