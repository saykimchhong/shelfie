import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PhonePreview.module.scss";

// Renders children at real phone width (390px), then zooms the whole thing
// down. The storefront uses container queries, so it lays out exactly as it
// would on a phone, and the fixed order bar stays inside the frame.
// Size it with `scale`, or set --zoom from CSS (e.g. per breakpoint).
export function PhonePreview({
  children,
  scale,
  label,
  className,
}: {
  children: ReactNode;
  scale?: number;
  label?: string;
  className?: string;
}) {
  return (
    <figure
      className={clsx(styles.figure, className)}
      style={scale ? ({ "--zoom": scale } as CSSProperties) : undefined}
    >
      <div className={styles.frame}>
        <div className={styles.screen}>{children}</div>
      </div>
      {label ? <figcaption className={styles.caption}>{label}</figcaption> : null}
    </figure>
  );
}
