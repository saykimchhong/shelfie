"use client";

import clsx from "clsx";
import { useId, type ComponentProps } from "react";
import fieldStyles from "../TextField/TextField.module.scss";
import styles from "./TextArea.module.scss";

export type TextAreaProps = ComponentProps<"textarea"> & {
  label: string;
  hint?: string;
  error?: string;
};

// Multi-line sibling of TextField: same filled look and focus ring. Grows with
// its content where supported, and shows a counter when maxLength is set.
export function TextArea({ label, hint, error, id, className, maxLength, value, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const length = typeof value === "string" ? value.length : 0;
  const message = error ?? hint;

  return (
    <div className={clsx(fieldStyles.field, className)}>
      <label htmlFor={inputId} className={fieldStyles.label}>
        {label}
      </label>
      <div className={clsx(fieldStyles.control, styles.control, error && fieldStyles.invalid)}>
        <textarea
          id={inputId}
          className={styles.textarea}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        />
      </div>
      <div className={styles.meta}>
        {message ? (
          <p id={messageId} className={clsx(fieldStyles.message, error && fieldStyles.errorText)}>
            {message}
          </p>
        ) : (
          <span />
        )}
        {maxLength ? (
          <span className={clsx(fieldStyles.message, length > maxLength * 0.9 && styles.near)}>
            {length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}
