import clsx from "clsx";
import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./Stack.module.scss";

type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

// Flex layout with token gaps — use this instead of one-off margin CSS.
export type StackProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "header" | "footer" | "nav" | "main" | "ul" | "ol" | "li" | "form";
  direction?: "row" | "column";
  gap?: Space;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
};

export function Stack({
  as: Tag = "div",
  direction = "column",
  gap = 4,
  align,
  justify,
  wrap,
  className,
  style,
  ...rest
}: StackProps) {
  return (
    <Tag
      className={clsx(
        styles.stack,
        styles[direction],
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        wrap && styles.wrap,
        className,
      )}
      style={{ "--stack-gap": gap === 0 ? "0" : `var(--space-${gap})`, ...style } as CSSProperties}
      {...rest}
    />
  );
}
