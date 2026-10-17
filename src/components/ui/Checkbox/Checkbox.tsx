"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Checkbox.module.scss";

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  // "danger" when ticking it unlocks something destructive.
  tone?: "brand" | "danger";
  disabled?: boolean;
  className?: string;
};

// A native checkbox (keyboard, forms and screen readers for free) drawn as a
// soft tile that fills and shows a tick.
export function Checkbox({ checked, onChange, label, tone = "brand", disabled, className }: CheckboxProps) {
  return (
    <label className={clsx(styles.root, styles[tone], disabled && styles.disabled, className)}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden>
        <Check className={styles.tick} strokeWidth={3} />
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
