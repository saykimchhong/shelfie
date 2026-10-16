"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { Stagger } from "@/components/motion/Reveal";
import { Badge, Switch, Thumb } from "@/components/ui";
import { LOW_CONFIDENCE } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice } from "@/lib/format";
import type { Draft } from "./drafts";
import type { Missing } from "./merge";
import styles from "./ReviewList.module.scss";

// New products are fully editable. Known ones (`known` has their match) keep
// their name and photo: only the price and the include check change.
export function ReviewList({
  drafts,
  known,
  currency,
  onChange,
}: {
  drafts: Draft[];
  known?: ReadonlyMap<string, Product>;
  currency: Currency;
  onChange: (key: string, patch: Partial<Draft>) => void;
}) {
  return (
    <Stagger as="ul" interval={0.04} className={styles.list}>
      {drafts.map((draft) => {
        const product = draft.matchId ? known?.get(draft.matchId) : undefined;
        const priceChanged = product && product.price !== null && draft.price !== String(product.price);
        const flagged = draft.note !== null || draft.confidence < LOW_CONFIDENCE;

        return (
          <li key={draft.key} className={clsx(styles.row, !draft.include && styles.excluded)}>
            <button
              type="button"
              role="checkbox"
              aria-checked={draft.include}
              aria-label={`Include ${draft.name || "product"}`}
              className={clsx(styles.check, draft.include && styles.checked)}
              onClick={() => onChange(draft.key, { include: !draft.include })}
            >
              <Check aria-hidden />
            </button>

            <Thumb label={draft.name || "?"} src={product?.imageUrl} size={48} className={styles.thumb} />

            <div className={styles.fields}>
              {product ? (
                <span className={styles.knownName}>{draft.name}</span>
              ) : (
                <input
                  className={styles.name}
                  value={draft.name}
                  onChange={(event) => onChange(draft.key, { name: event.target.value })}
                  aria-label="Product name"
                  placeholder="Product name"
                />
              )}
              <div className={styles.meta}>
                {product && !product.inStock ? <Badge tone="success">Back in stock</Badge> : null}
                {priceChanged ? <span className={styles.was}>was {formatPrice(product.price!, currency)}</span> : null}
                {draft.localName && !product ? <span className={styles.local}>{draft.localName}</span> : null}
                {flagged ? <Badge tone="sun">{draft.note ?? "Check"}</Badge> : null}
              </div>
            </div>

            <label className={clsx(styles.price, !draft.price && styles.missing)}>
              <span className={styles.currency}>{currency}</span>
              <input
                value={draft.price}
                onChange={(event) => onChange(draft.key, { price: event.target.value })}
                inputMode="decimal"
                placeholder="—"
                aria-label={`Price in ${currency}`}
              />
            </label>
          </li>
        );
      })}
    </Stagger>
  );
}

// Shelf products the new video didn't show. The switch is the decision.
export function MissingList({
  missing,
  currency,
  onToggle,
}: {
  missing: Missing[];
  currency: Currency;
  onToggle: (productId: string, soldOut: boolean) => void;
}) {
  return (
    <Stagger as="ul" interval={0.04} className={styles.list}>
      {missing.map(({ product, soldOut }) => (
        <li key={product.id} className={clsx(styles.row, styles.missingRow)}>
          <Thumb label={product.name} src={product.imageUrl} size={48} className={styles.thumb} />
          <div className={styles.fields}>
            <span className={styles.knownName}>{product.name}</span>
            <div className={styles.meta}>
              <span className={styles.local}>
                {product.price === null ? "No price" : formatPrice(product.price, currency)}
              </span>
            </div>
          </div>
          <Switch
            checked={soldOut}
            onChange={(next) => onToggle(product.id, next)}
            label={soldOut ? "Sold out" : "In stock"}
            showLabel
            className={styles.soldOut}
          />
        </li>
      ))}
    </Stagger>
  );
}
