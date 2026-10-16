"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./QuantityControl.module.scss";

// "+" bubble that grows into a − n + stepper once something is in the cart.
// At 1 the minus becomes a bin, so it's clear the next tap removes the item.
export function QuantityControl({
  quantity,
  onChange,
  label,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  label: string;
}) {
  return (
    <motion.div layout className={styles.control} transition={{ type: "spring", stiffness: 500, damping: 35 }}>
      <AnimatePresence initial={false} mode="popLayout">
        {quantity > 0 ? (
          <motion.span
            key="active"
            className={styles.active}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
          >
            <button
              type="button"
              className={styles.step}
              aria-label={quantity === 1 ? `Remove ${label}` : `Remove one ${label}`}
              onClick={() => onChange(quantity - 1)}
            >
              {quantity === 1 ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
            </button>
            <span key={quantity} className={styles.count} aria-live="polite">
              {quantity}
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
      <button type="button" className={styles.add} aria-label={`Add ${label}`} onClick={() => onChange(quantity + 1)}>
        <Plus aria-hidden />
      </button>
    </motion.div>
  );
}
