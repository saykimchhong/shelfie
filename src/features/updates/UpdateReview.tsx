"use client";

import clsx from "clsx";
import { Check, Mic } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Stagger } from "@/components/motion/Reveal";
import { Badge, Button, Sheet, Stack, Text, Thumb } from "@/components/ui";
import { unitOf, type PriceUnit, type Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import type { ProductChange, UpdatesResponse } from "@/domain/updates";
import { formatPrice, perUnit, pluralize } from "@/lib/format";
import styles from "./UpdateReview.module.scss";

type Props = {
  open: boolean;
  result: UpdatesResponse;
  products: ReadonlyMap<string, Product>;
  currency: Currency;
  shopUnit?: PriceUnit;
  onClose: () => void;
  onApply: (changes: ProductChange[]) => Promise<void>;
};

// Every change starts ticked; the seller unticks what the AI got wrong.
export function UpdateReview({ open, result, products, currency, shopUnit, onClose, onApply }: Props) {
  const [skipped, setSkipped] = useState<ReadonlySet<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kept = result.changes.filter((_, index) => !skipped.has(index));

  function toggle(index: number) {
    setSkipped((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  async function apply() {
    setSaving(true);
    setError(null);
    try {
      await onApply(kept);
    } catch (cause) {
      console.error(cause);
      setError("Couldn't save the changes. Try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Check the changes"
      footer={
        <Button size="lg" block loading={saving} disabled={kept.length === 0} onClick={apply}>
          Save {pluralize(kept.length, "change")}
        </Button>
      }
    >
      <Stack gap={4}>
        {result.heard ? (
          <p className={styles.heard}>
            <Mic aria-hidden />
            <span>“{result.heard}”</span>
          </p>
        ) : null}

        <Stagger as="ul" interval={0.04} className={styles.list}>
          {result.changes.map((change, index) => {
            const on = !skipped.has(index);
            const product = change.kind === "add" ? undefined : products.get(change.id);
            if (change.kind !== "add" && !product) return null;
            const unit = product ? unitOf(product, shopUnit) : (shopUnit ?? "each");
            return (
              <li key={index} className={clsx(styles.row, !on && styles.skipped)}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label="Keep this change"
                  className={clsx(styles.check, on && styles.checked)}
                  onClick={() => toggle(index)}
                >
                  <Check aria-hidden />
                </button>
                <ChangeDetails change={change} product={product} currency={currency} unit={unit} />
              </li>
            );
          })}
        </Stagger>

        {error ? (
          <Text role="alert" size="sm" tone="danger" align="center">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Sheet>
  );
}

function ChangeDetails({
  change,
  product,
  currency,
  unit,
}: {
  change: ProductChange;
  product: Product | undefined;
  currency: Currency;
  unit: PriceUnit;
}) {
  const money = (price: number | null, priceUnit: PriceUnit) =>
    price === null ? "no price" : `${formatPrice(price, currency)}${perUnit(priceUnit)}`;

  if (change.kind === "add") {
    const { name, localName, price, unit: newUnit } = change.product;
    return (
      <Details image={undefined} name={name} badge={<Badge tone="brand">New</Badge>}>
        {localName ? <span>{localName}</span> : null}
        <span className={styles.price}>{money(price, newUnit ?? unit)}</span>
      </Details>
    );
  }

  if (!product) return null;
  if (change.kind === "remove") {
    return (
      <Details image={product.imageUrl} name={product.name} badge={<Badge tone="danger">Remove</Badge>}>
        <span>Deletes it and its photo</span>
      </Details>
    );
  }

  const { edit } = change;
  const stock =
    edit.inStock === false ? (
      <Badge>Sold out</Badge>
    ) : edit.inStock === true ? (
      <Badge tone="success">Back in stock</Badge>
    ) : null;
  return (
    <Details image={product.imageUrl} name={edit.name ?? product.name} badge={stock}>
      {edit.name ? <span>was {product.name}</span> : null}
      {edit.localName ? <span>Label: {edit.localName}</span> : null}
      {edit.price !== undefined || edit.unit ? (
        <span>
          <s>{money(product.price, unit)}</s> →{" "}
          <span className={styles.price}>{money(edit.price ?? product.price, edit.unit ?? unit)}</span>
        </span>
      ) : null}
    </Details>
  );
}

function Details({
  image,
  name,
  badge,
  children,
}: {
  image: string | undefined;
  name: string;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Thumb label={name} src={image} size={48} className={styles.thumb} />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <div className={styles.meta}>
          {badge}
          {children}
        </div>
      </div>
    </>
  );
}
