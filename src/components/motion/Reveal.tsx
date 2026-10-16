import clsx from "clsx";
import type { CSSProperties, HTMLAttributes } from "react";
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

type StaggerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "ul" | "ol";
  // Seconds between each child.
  interval?: number;
  delay?: number;
};

// Each direct child rises in, one after another.
export function Stagger({ as: Tag = "div", interval = 0.05, delay = 0, className, style, ...rest }: StaggerProps) {
  return (
    <Tag
      className={clsx(styles.stagger, className)}
      style={{ "--stagger-interval": `${interval}s`, "--reveal-delay": `${delay}s`, ...style } as CSSProperties}
      {...rest}
    />
  );
}
