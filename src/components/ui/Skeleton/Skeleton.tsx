import clsx from "clsx";
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.scss";

export function Skeleton({
  width = "100%",
  height = 16,
  radius = "var(--radius-sm)",
  className,
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  className?: string;
}) {
  return <span aria-hidden className={clsx(styles.skeleton, className)} style={{ width, height, borderRadius: radius }} />;
}
