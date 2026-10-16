import clsx from "clsx";
import { Check, Image as ImageIcon, ScanLine, Video } from "lucide-react";
import { Fragment } from "react";
import styles from "./Stepper.module.scss";

const STEPS = [
  { label: "Film", icon: <Video /> },
  { label: "Check", icon: <ScanLine /> },
  { label: "Photos", icon: <ImageIcon /> },
];

// Where the seller is in the flow, mostly as icons.
export function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className={styles.stepper} aria-label="Progress">
      {STEPS.map((step, index) => (
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
