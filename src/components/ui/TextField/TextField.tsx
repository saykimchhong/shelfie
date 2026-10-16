"use client";

import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";
import styles from "./TextField.module.scss";

export type TextFieldProps = Omit<ComponentProps<"input">, "prefix"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  // Fixed text before the input, e.g. "shelfie.app/".
  prefix?: ReactNode;
  // Hide the label visually (still read by screen readers).
  hideLabel?: boolean;
};

export function TextField({ label, hint, error, prefix, hideLabel, id, className, ...input }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={inputId} className={clsx(styles.label, hideLabel && styles.hiddenLabel)}>
        {label}
      </label>
      <div className={clsx(styles.control, error && styles.invalid)}>
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...input}
        />
      </div>
      {message ? (
        <p id={messageId} className={clsx(styles.message, error && styles.errorText)}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
