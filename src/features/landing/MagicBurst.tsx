import clsx from "clsx";
import type { CSSProperties } from "react";
import styles from "./MagicBurst.module.scss";

// Fixed, not random, so the server and the browser draw the same stars.
const COUNT = 14;
const JITTER = [0, 9, -7, 4, -11, 6, -3];
const DISTANCES = [70, 96, 58, 112, 80, 102, 66];
const SIZES = [11, 7, 13, 6, 9, 8, 12];
const COLORS = ["--sun", "--brand", "--sun", "--berry", "--sun", "--accent", "--brand"];
const STARS = Array.from({ length: COUNT }, (_, index) => ({
  "--angle": `${index * (360 / COUNT) + JITTER[index % JITTER.length]}deg`,
  "--distance": `${DISTANCES[index % DISTANCES.length]}px`,
  "--size": `${SIZES[index % SIZES.length]}px`,
  "--delay": `${(index % 3) * 45}ms`,
  "--spin": `${index % 2 ? 120 : -120}deg`,
  "--color": `var(${COLORS[index % COLORS.length]})`,
}));

// Stars flying out from the middle of the positioned parent, once. It waits
// (paused, invisible) until --magic-play is "running" on it or an ancestor.
// `scale` stretches how far they fly, `grow` how big they are.
export function MagicBurst({ scale = 1, grow = 1, className }: { scale?: number; grow?: number; className?: string }) {
  return (
    <span className={clsx(styles.burst, className)} style={{ "--scale": scale, "--grow": grow } as CSSProperties} aria-hidden>
      {STARS.map((star, index) => (
        <span key={index} className={styles.star} style={star as CSSProperties} />
      ))}
    </span>
  );
}
