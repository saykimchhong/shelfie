import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.scss";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "brand" | "accent" | "sun" | "berry" | "success" | "danger";
  icon?: ReactNode;
  // A small pulsing dot, e.g. for "Live".
  pulse?: boolean;
};

export function Badge({ tone = "neutral", icon, pulse, className, children, ...rest }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[tone], className)} {...rest}>
      {pulse ? <span className={styles.dot} aria-hidden /> : icon}
      {children}
    </span>
  );
}
