import clsx from "clsx";
import { Camera, Check, Image as ImageIcon, ScanLine, Type, Video } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { CaptureSource } from "@/domain/extraction";
import styles from "./Stepper.module.scss";

const FIRST_STEP: Record<CaptureSource, { label: string; icon: ReactNode }> = {
  video: { label: "Film", icon: <Video /> },
  photos: { label: "Snap", icon: <Camera /> },
  text: { label: "List", icon: <Type /> },
};

const LATER_STEPS = [
  { label: "Check", icon: <ScanLine /> },
  { label: "Photos", icon: <ImageIcon /> },
];

// Where the seller is in the flow, mostly as icons.
export function Stepper({ current, source = "video" }: { current: 0 | 1 | 2; source?: CaptureSource }) {
  return (
    <ol className={styles.stepper} aria-label="Progress">
      {[FIRST_STEP[source], ...LATER_STEPS].map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 ? <li aria-hidden className={clsx(styles.line, index <= current && styles.lineDone)} /> : null}
          <li
            className={clsx(styles.step, index < current && styles.done, index === current && styles.current)}
            aria-current={index === current ? "step" : undefined}
          >
            <span className={styles.dot}>{index < current ? <Check /> : step.icon}</span>
            <span className={styles.label}>{step.label}</span>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
