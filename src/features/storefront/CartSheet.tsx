"use client";

import { Clock, Store, Trash2, Truck } from "lucide-react";
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
import { shopTypeOf } from "@/domain/shop";
import { ORDER_NOTE_MAX } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import type { Words } from "@/lib/words";
import { perUnitText, productNames, variantText } from "./labels";
import { useLanguage, useWords } from "./language";
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
  onNoteChange,
  closedLabel,
  onClear,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  store: PublicStore;
  lines: CartLine[];
  summary: OrderSummary;
  choice: FulfillmentChoice;
  onChoiceChange: (choice: FulfillmentChoice) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onNoteChange: (key: string, note: string) => void;
  // "Closed · opens 07:00" while the shop is closed; null when open or unknown.
  closedLabel: string | null;
  onClear: () => void;
  onSent: () => void;
}) {
  const type = shopTypeOf(store);
  const { language, shopLanguage, words } = useLanguage();
  const noteHint = type.noteHint ? (words.noteHint[store.shopType ?? "shop"] ?? type.noteHint) : null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={words.yourOrder}
      closeLabel={words.close}
      footer={
        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <Text tone="muted" weight={600}>
              {words.total}
            </Text>
            <Text size="xl" weight={800}>
              {summary.total ?? words.ask}
            </Text>
          </div>
          <OrderButtons summary={summary} block onSend={onSent} />
        </div>
      }
    >
      <ul className={styles.lines}>
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map(({ key, product, quantity, note, variant }) => {
            const { name } = productNames(product, language, shopLanguage);
            return (
            <motion.li
              key={key}
              layout="position"
              className={styles.line}
              exit={{ opacity: 0, x: -32, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              <Thumb label={product.name} src={product.imageUrl} size={52} className={styles.thumb} />
              <div className={styles.info}>
                <Text weight={600} clamp={1}>
                  {name}
                </Text>
                {variant ? (
                  <Text size="sm" weight={600} tone="brand">
                    {variantText(variant, words)}
                  </Text>
                ) : null}
                <Text size="sm" tone="muted">
                  {product.price === null ? words.priceOnRequest : unitPrice(product.price, store, unitOf(product, store.priceUnit), words)}
                </Text>
              </div>
              <QuantityControl
                unit={unitOf(product, store.priceUnit)}
                quantity={quantity}
                onChange={(next) => onQuantityChange(key, next)}
                label={name}
              />
              {noteHint ? (
                <input
                  className={styles.note}
                  value={note ?? ""}
                  onChange={(event) => onNoteChange(key, event.target.value)}
                  placeholder={noteHint}
                  maxLength={ORDER_NOTE_MAX}
                  aria-label={words.noteFor(name)}
                />
              ) : null}
            </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <div className={styles.clear}>
        <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={onClear}>
          {words.clearAll}
        </Button>
      </div>
      <Fulfillment store={store} method={summary.method} choice={choice} onChange={onChoiceChange} />
      {type.orderTime ? <OrderTime choice={choice} closedLabel={closedLabel} onChange={onChoiceChange} /> : null}
      {store.paymentQrUrl ? <PaymentQr store={store} url={store.paymentQrUrl} /> : null}
    </Sheet>
  );
}

// "Rs 600 each" for items, "Rs 600 / kg" otherwise.
function unitPrice(amount: number, store: PublicStore, unit: PriceUnit, words: Words): string {
  const price = formatPrice(amount, store.currency);
  return unit === "each" ? words.each(price) : `${price}${perUnitText(unit, words)}`;
}

// The seller's own PromptPay / LankaQR / KHQR code. On a phone the customer
// can't scan their own screen, so a tap opens it full size to save.
function PaymentQr({ store, url }: { store: PublicStore; url: string }) {
  const scheme = PAYMENT_QR_NAME[store.currency];
  const words = useWords();
  return (
    <div className={styles.payment}>
      <a href={url} target="_blank" rel="noreferrer" className={styles.qr} aria-label={words.openPaymentCode(scheme)}>
        <Image src={url} alt={`${scheme} code for ${store.name}`} fill sizes="132px" unoptimized className={styles.qrImage} />
      </a>
      <div>
        <Text weight={700}>{words.payWith(scheme)}</Text>
        <Text size="sm" tone="muted">
          {words.payHint}
        </Text>
      </div>
    </div>
  );
}

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
  const words = useWords();
  const methods = [
    { value: "pickup", label: words.pickup },
    { value: "delivery", label: words.delivery },
  ] as const;
  return (
    <div className={styles.fulfillment}>
      {offer === "both" ? (
        <Segmented
          label={words.howDoYouWantIt}
          options={methods}
          value={choice.method}
          onChange={(next) => onChange({ ...choice, method: next })}
        />
      ) : (
        <Badge className={styles.offer} icon={offer === "pickup" ? <Store /> : <Truck />}>
          {offer === "pickup" ? words.pickupOnly : words.deliveryOnly}
        </Badge>
      )}
      {method === "delivery" ? (
        <TextField
          label={words.deliveryAddress}
          hint={words.deliveryHint}
          autoComplete="street-address"
          maxLength={DELIVERY_ADDRESS_MAX}
          value={choice.address}
          onChange={(event) => onChange({ ...choice, address: event.target.value })}
        />
      ) : null}
    </div>
  );
}

// As soon as possible (or when the shop opens, if it's closed now), or a day and time.
function OrderTime({
  choice,
  closedLabel,
  onChange,
}: {
  choice: FulfillmentChoice;
  closedLabel: string | null;
  onChange: (choice: FulfillmentChoice) => void;
}) {
  const words = useWords();
  const options = [
    { value: "soon", label: closedLabel ? words.whenYouOpen : words.asSoonAsPossible },
    { value: "later", label: words.pickATime },
  ] as const;
  return (
    <div className={styles.fulfillment}>
      <Segmented
        label={words.whenDoYouWantIt}
        options={options}
        value={choice.when}
        onChange={(when) => onChange({ ...choice, when })}
      />
      {choice.when === "later" ? (
        <TextField
          label={words.dayAndTime}
          type="datetime-local"
          value={choice.at}
          onChange={(event) => onChange({ ...choice, at: event.target.value })}
        />
      ) : null}
      {closedLabel ? (
        <Badge icon={<Clock />} className={styles.offer}>
          {closedLabel}
        </Badge>
      ) : null}
    </div>
  );
}
