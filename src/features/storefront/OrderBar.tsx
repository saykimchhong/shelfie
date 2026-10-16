"use client";

import { MessageCircle, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ButtonLink } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { PublicStore } from "@/domain/store";
import { lineLink, orderMessage, whatsappLink } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import styles from "./OrderBar.module.scss";

export type CartLine = { product: Product; quantity: number };

export function OrderBar({ store, lines }: { store: PublicStore; lines: CartLine[] }) {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (line.product.price ?? 0) * line.quantity, 0);
  const hasUnpriced = lines.some((line) => line.product.price === null);
  const price = (amount: number) => formatPrice(amount, store.currency);
  const total = subtotal > 0 ? `${price(subtotal)}${hasUnpriced ? "+" : ""}` : null;

  const message = orderMessage({
    storeName: store.name,
    lines: lines.map((line) => ({
      name: line.product.name,
      quantity: line.quantity,
      lineTotal: line.product.price === null ? null : line.product.price * line.quantity,
    })),
    total,
    formatLineTotal: price,
  });

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          className={styles.bar}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
        >
          <div className={styles.summary}>
            <span className={styles.bag}>
              <ShoppingBag aria-hidden />
              <motion.span key={count} className={styles.count} initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
                {count}
              </motion.span>
            </span>
            {total ? <strong className={styles.total}>{total}</strong> : null}
          </div>
          <div className={styles.actions}>
            {store.contact.line ? (
              <ButtonLink
                href={lineLink(store.contact.line, message)}
                target="_blank"
                rel="noreferrer"
                className={styles.line}
                aria-label="Order on LINE"
              >
                LINE
              </ButtonLink>
            ) : null}
            {store.contact.whatsapp ? (
              <ButtonLink
                href={whatsappLink(store.contact.whatsapp, message)}
                target="_blank"
                rel="noreferrer"
                icon={<MessageCircle />}
                className={styles.whatsapp}
              >
                Order
              </ButtonLink>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
