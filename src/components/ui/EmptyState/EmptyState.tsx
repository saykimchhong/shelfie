import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./EmptyState.module.scss";

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  // One short sentence at most.
  description?: string;
  action?: ReactNode;
  tone?: "brand" | "accent" | "sun" | "berry";
  className?: string;
};

export function EmptyState({ icon, title, description, action, tone = "brand", className }: EmptyStateProps) {
  return (
    <div className={clsx(styles.empty, className)}>
      <div className={clsx(styles.icon, styles[tone])} aria-hidden>
        {icon}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
