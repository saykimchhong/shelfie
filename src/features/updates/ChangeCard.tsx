"use client";

import clsx from "clsx";
import { Check, CircleCheck, CircleSlash, Save } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge, Button, Text, Thumb } from "@/components/ui";
import { unitOf, type PriceUnit, type Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import type { ProductChange } from "@/domain/updates";
import { formatPrice, perUnit, pluralize } from "@/lib/format";
import { keptChanges, type Proposal } from "./chat";
import styles from "./ChangeCard.module.scss";

type Props = {
  proposal: Proposal;
  products: ReadonlyMap<string, Product>;
  currency: Currency;
  shopUnit?: PriceUnit;
  // The next message is being read: the changes may be about to move.
  busy: boolean;
  onToggle: (index: number) => void;
  onSave: () => Promise<void>;
  onDrop: () => void;
};

// The changes under an answer. Every one starts ticked; nothing is saved until the seller taps Save.
export function ChangeCard({ proposal, products, currency, shopUnit, busy, onToggle, onSave, onDrop }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (proposal.state === "moved") return null;
  if (proposal.state !== "waiting") {
    const saved = proposal.state === "saved";
    return (
      <p className={clsx(styles.outcome, saved && styles.saved)}>
        {saved ? <CircleCheck aria-hidden /> : <CircleSlash aria-hidden />}
        <span>
          <strong>{saved ? "Saved" : "Not saved"}</strong>
          {proposal.note ? ` · ${proposal.note}` : null}
        </span>
      </p>
    );
  }

  const kept = keptChanges(proposal);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave();
    } catch (cause) {
      console.error(cause);
      setError("Couldn't save the changes. Try again.");
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-label="Changes to save">
      <ul className={styles.list}>
        {proposal.changes.map((change, index) => {
          const on = !proposal.skipped.includes(index);
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
                disabled={saving || busy}
                onClick={() => onToggle(index)}
              >
                <Check aria-hidden />
              </button>
              <ChangeDetails change={change} product={product} currency={currency} unit={unit} />
            </li>
          );
        })}
      </ul>

      {error ? (
        <Text role="alert" size="sm" tone="danger">
          {error}
        </Text>
      ) : null}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onDrop} disabled={saving || busy}>
          Don&apos;t save
        </Button>
        <Button icon={<Save />} loading={saving} disabled={kept.length === 0 || busy} onClick={save}>
          Save {pluralize(kept.length, "change")}
        </Button>
      </div>
    </section>
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
      <Thumb label={name} src={image} size={44} className={styles.thumb} />
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
