import clsx from "clsx";
import Image from "next/image";
import type { CSSProperties } from "react";
import { hueFromString, initials } from "@/lib/format";
import styles from "./Thumb.module.scss";

export type ThumbProps = {
  // Name used for the placeholder initials and its color.
  label: string;
  src?: string;
  // Rendered size hint for next/image, in px.
  size?: number;
  shape?: "square" | "circle";
  className?: string;
};

// Product photo, or a colorful initials tile until there is one.
export function Thumb({ label, src, size = 160, shape = "square", className }: ThumbProps) {
  const style = { "--hue": hueFromString(label) } as CSSProperties;

  return (
    <div className={clsx(styles.thumb, styles[shape], className)} style={style}>
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className={styles.image} />
      ) : (
        <span className={styles.initials} aria-hidden>
          {initials(label)}
        </span>
      )}
    </div>
  );
}
