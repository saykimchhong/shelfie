"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./QuantityControl.module.scss";

// "+" bubble that grows into a − n + stepper once something is in the cart.
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
    <motion.div layout className={styles.control} transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}>
      <AnimatePresence initial={false} mode="popLayout">
        {quantity > 0 ? (
          <motion.span
            key="active"
            className={styles.active}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <button type="button" className={styles.step} aria-label={`Remove one ${label}`} onClick={() => onChange(quantity - 1)}>
              <Minus aria-hidden />
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
