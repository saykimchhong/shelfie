import clsx from "clsx";
import type { CSSProperties, HTMLAttributes, Ref } from "react";
import styles from "./Reveal.module.scss";

// Entrance animations are pure CSS: content is visible and animated even before
// JavaScript loads (slow phones), and they work in Server Components.
// Use `motion/react` only for interactive motion (layout, presence, gestures).

type RevealProps = HTMLAttributes<HTMLDivElement> & {
  // Seconds before this element starts animating in.
  delay?: number;
  effect?: "rise" | "pop" | "fade";
};

export function Reveal({ delay = 0, effect = "rise", className, style, ...rest }: RevealProps) {
  return (
    <div
      className={clsx(styles.reveal, styles[effect], className)}
      style={{ "--reveal-delay": `${delay}s`, ...style } as CSSProperties}
      {...rest}
    />
  );
}

export type StaggerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "ul" | "ol";
  ref?: Ref<HTMLElement>;
  // Seconds between each child.
  interval?: number;
  delay?: number;
};

// Each direct child rises in, one after another. For long lists that should
// also reveal on scroll, use <ScrollStagger>.
export function Stagger({ as = "div", ref, interval = 0.05, delay = 0, className, style, ...rest }: StaggerProps) {
  // div/ul/ol differ only in tag name here; type it as a div for JSX.
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      className={clsx(styles.stagger, className)}
      style={{ "--stagger-interval": `${interval}s`, "--reveal-delay": `${delay}s`, ...style } as CSSProperties}
      {...rest}
    />
  );
}
