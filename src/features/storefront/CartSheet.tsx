"use client";

import { Store, Trash2, Truck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Badge, Button, Segmented, Sheet, Text, TextField, Thumb } from "@/components/ui";
import {
  DEFAULT_FULFILLMENT,
  DELIVERY_ADDRESS_MAX,
  PAYMENT_QR_NAME,
  type FulfillmentMethod,
  type PublicStore,
} from "@/domain/store";
import { unitOf, type PriceUnit } from "@/domain/product";
import { formatPrice, perUnit } from "@/lib/format";
import type { CartLine, FulfillmentChoice, OrderSummary } from "./order";
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
  choice,
  onChoiceChange,
  onQuantityChange,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  store: PublicStore;
  lines: CartLine[];
  summary: OrderSummary;
  choice: FulfillmentChoice;
  onChoiceChange: (choice: FulfillmentChoice) => void;
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
                  {product.price === null ? "Price on request" : unitPrice(product.price, store, unitOf(product, store.priceUnit))}
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
      <Fulfillment store={store} method={summary.method} choice={choice} onChange={onChoiceChange} />
      {store.paymentQrUrl ? <PaymentQr store={store} url={store.paymentQrUrl} /> : null}
    </Sheet>
  );
}

// "Rs 600 each" for items, "Rs 600 / kg" otherwise.
function unitPrice(amount: number, store: PublicStore, unit: PriceUnit): string {
  const price = formatPrice(amount, store.currency);
  return unit === "each" ? `${price} each` : `${price}${perUnit(unit)}`;
}

// The seller's own PromptPay / LankaQR / KHQR code. On a phone the customer
// can't scan their own screen, so a tap opens it full size to save.
function PaymentQr({ store, url }: { store: PublicStore; url: string }) {
  const scheme = PAYMENT_QR_NAME[store.currency];
  return (
    <div className={styles.payment}>
      <a href={url} target="_blank" rel="noreferrer" className={styles.qr} aria-label={`Open the ${scheme} code full size`}>
        <Image src={url} alt={`${scheme} code for ${store.name}`} fill sizes="132px" unoptimized className={styles.qrImage} />
      </a>
      <div>
        <Text weight={700}>Pay with {scheme}</Text>
        <Text size="sm" tone="muted">
          Tap to save it. Pay once the shop confirms your order.
        </Text>
      </div>
    </div>
  );
}

const METHOD_OPTIONS = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
] as const;

// Pickup or delivery: a choice when the shop offers both, otherwise just shown.
// Delivery asks where, optionally; it goes into the order message.
function Fulfillment({
  store,
  method,
  choice,
  onChange,
}: {
  store: PublicStore;
  method: FulfillmentMethod;
  choice: FulfillmentChoice;
  onChange: (choice: FulfillmentChoice) => void;
}) {
  const offer = store.fulfillment ?? DEFAULT_FULFILLMENT;
  return (
    <div className={styles.fulfillment}>
      {offer === "both" ? (
        <Segmented
          label="How do you want it?"
          options={METHOD_OPTIONS}
          value={choice.method}
          onChange={(next) => onChange({ ...choice, method: next })}
        />
      ) : (
        <Badge className={styles.offer} icon={offer === "pickup" ? <Store /> : <Truck />}>
          {offer === "pickup" ? "Pickup only" : "Delivery only"}
        </Badge>
      )}
      {method === "delivery" ? (
        <TextField
          label="Delivery address or area"
          hint="Optional · you can also send it in the chat"
          autoComplete="street-address"
          maxLength={DELIVERY_ADDRESS_MAX}
          value={choice.address}
          onChange={(event) => onChange({ ...choice, address: event.target.value })}
        />
      ) : null}
    </div>
  );
}
