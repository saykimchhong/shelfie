"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PriceUnit } from "@/domain/product";
import { addOne, formatQuantity, removeOne } from "./quantity";
import styles from "./QuantityControl.module.scss";

// "+" bubble that grows into a − n + stepper once something is in the cart.
// When the next tap would remove the item, the minus becomes a bin.
// Per-kg items step by half a kilo and show "1.5 kg".
export function QuantityControl({
  quantity,
  onChange,
  label,
  unit = "each",
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  label: string;
  unit?: PriceUnit;
}) {
  const last = removeOne(quantity, unit) === 0;
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
              aria-label={last ? `Remove ${label}` : `Less ${label}`}
              onClick={() => onChange(removeOne(quantity, unit))}
            >
              {last ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
            </button>
            <span key={quantity} className={styles.count} aria-live="polite">
              {formatQuantity(quantity)}
              {unit === "kg" ? <small className={styles.unit}>kg</small> : null}
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
      <button type="button" className={styles.add} aria-label={`Add ${label}`} onClick={() => onChange(addOne(quantity, unit))}>
        <Plus aria-hidden />
      </button>
    </motion.div>
  );
}
