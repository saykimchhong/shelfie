"use client";

import clsx from "clsx";
import styles from "./Switch.module.scss";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // Show the label next to the switch; otherwise it is only announced.
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, label, showLabel, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      disabled={disabled}
      className={clsx(styles.root, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={clsx(styles.track, checked && styles.on)}>
        <span className={styles.thumb} />
      </span>
      {showLabel ? <span className={styles.label}>{label}</span> : null}
    </button>
  );
}
