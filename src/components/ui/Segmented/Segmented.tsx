"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import styles from "./Segmented.module.scss";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  // Accessible name when the label is visual only (a flag, a script sample).
  ariaLabel?: string;
};

export type SegmentedProps<T extends string> = {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

// Pick-one control with a sliding highlight. Prefer it over a <select> for ≤5 choices.
export function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  const id = useId();

  return (
    <div className={clsx(styles.field, className)}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className={styles.track}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.ariaLabel}
              className={clsx(styles.option, selected && styles.selected)}
              onClick={() => onChange(option.value)}
            >
              {selected ? (
                <motion.span
                  layoutId={`${id}-thumb`}
                  className={styles.thumb}
                  transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
                />
              ) : null}
              <span className={styles.optionLabel}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
