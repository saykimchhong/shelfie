"use client";

import { Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Sheet, Text, Thumb } from "@/components/ui";
import type { PublicStore } from "@/domain/store";
import { formatPrice } from "@/lib/format";
import type { CartLine, OrderSummary } from "./order";
import { OrderButtons } from "./OrderButtons";
import { QuantityControl } from "./QuantityControl";
import styles from "./CartSheet.module.scss";

// The whole order in one place: change quantities or remove items without
// scrolling back to each product, then send it.
export function CartSheet({
  open,
  onClose,
  store,
  lines,
  summary,
  onQuantityChange,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  store: PublicStore;
  lines: CartLine[];
  summary: OrderSummary;
  onQuantityChange: (productId: string, quantity: number) => void;
  onClear: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your order"
      footer={
        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <Text tone="muted" weight={600}>
              Total
            </Text>
            <Text size="xl" weight={800}>
              {summary.total ?? "Ask"}
            </Text>
          </div>
          <OrderButtons summary={summary} block />
        </div>
      }
    >
      <ul className={styles.lines}>
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map(({ product, quantity }) => (
            <motion.li
              key={product.id}
              layout="position"
              className={styles.line}
              exit={{ opacity: 0, x: -32, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              <Thumb label={product.name} src={product.imageUrl} size={52} className={styles.thumb} />
              <div className={styles.info}>
                <Text weight={600} clamp={1}>
                  {product.name}
                </Text>
                <Text size="sm" tone="muted">
                  {product.price === null ? "Price on request" : `${formatPrice(product.price, store.currency)} each`}
                </Text>
              </div>
              <QuantityControl
                quantity={quantity}
                onChange={(next) => onQuantityChange(product.id, next)}
                label={product.name}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className={styles.clear}>
        <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={onClear}>
          Clear all
        </Button>
      </div>
    </Sheet>
  );
}
