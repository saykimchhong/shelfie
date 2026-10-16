import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./Container.module.scss";

export type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "main" | "section" | "header" | "footer";
  // narrow ≈ forms and focused flows, wide = default page width.
  size?: "narrow" | "wide";
};

export function Container({ as: Tag = "div", size = "wide", className, ...rest }: ContainerProps) {
  return <Tag className={clsx(styles.container, styles[size], className)} {...rest} />;
}
