"use client";

import { ChevronUp, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DEFAULT_FULFILLMENT, type PublicStore } from "@/domain/store";
import { pluralize } from "@/lib/format";
import { CartSheet } from "./CartSheet";
import { DEFAULT_CHOICE, summarizeOrder, type CartLine, type FulfillmentChoice } from "./order";
import { OrderButtons } from "./OrderButtons";
import { useOpenState } from "./useOpenState";
import styles from "./OrderBar.module.scss";

export type { CartLine } from "./order";

// Floating bar once the cart has something in it. Tap the summary to open the
// full cart and edit it; tap Order to send it straight away.
export function OrderBar({
  store,
  lines,
  onQuantityChange,
  onNoteChange,
  onClear,
  onSent,
}: {
  store: PublicStore;
  lines: CartLine[];
  onQuantityChange: (key: string, quantity: number) => void;
  onNoteChange: (key: string, note: string) => void;
  onClear: () => void;
  // The customer tapped through to WhatsApp or LINE.
  onSent: () => void;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [choice, setChoice] = useState<FulfillmentChoice>(DEFAULT_CHOICE);
  const hours = useOpenState(store.hours, store.timeZone);
  const summary = summarizeOrder(store, lines, choice, { closed: hours?.open === false });
  // With both on offer, the customer picks in the cart before sending.
  const mustChoose = (store.fulfillment ?? DEFAULT_FULFILLMENT) === "both";

  function changeQuantity(key: string, quantity: number) {
    // Removing the last item closes the cart instead of leaving it empty.
    if (quantity <= 0 && lines.length === 1) setCartOpen(false);
    onQuantityChange(key, quantity);
  }

  function clear() {
    setCartOpen(false);
    onClear();
  }

  return (
    <>
      <AnimatePresence>
        {summary.count > 0 ? (
          <motion.div
            className={styles.bar}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
          >
            <button
              type="button"
              className={styles.summary}
              onClick={() => setCartOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Review order: ${pluralize(summary.count, "item")}${summary.total ? `, ${summary.total}` : ""}`}
            >
              <span className={styles.bag}>
                <ShoppingBag aria-hidden />
                <motion.span
                  key={summary.count}
                  className={styles.count}
                  initial={{ scale: 1.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  {summary.count}
                </motion.span>
              </span>
              {summary.total ? <strong className={styles.total}>{summary.total}</strong> : null}
              <ChevronUp aria-hidden className={styles.chevron} />
            </button>
            <OrderButtons
              summary={summary}
              onChoose={mustChoose ? () => setCartOpen(true) : undefined}
              onSend={onSent}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CartSheet
        open={cartOpen && summary.count > 0}
        onClose={() => setCartOpen(false)}
        store={store}
        lines={lines}
        summary={summary}
        choice={choice}
        onChoiceChange={setChoice}
        onQuantityChange={changeQuantity}
        onNoteChange={onNoteChange}
        closedLabel={hours?.open === false ? hours.label : null}
        onClear={clear}
        onSent={onSent}
      />
    </>
  );
}
