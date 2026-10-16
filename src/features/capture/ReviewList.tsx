"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { Stagger } from "@/components/motion/Reveal";
import { Badge, Thumb } from "@/components/ui";
import { LOW_CONFIDENCE } from "@/domain/extraction";
import type { Currency } from "@/domain/store";
import type { Draft } from "./drafts";
import styles from "./ReviewList.module.scss";

export function ReviewList({
  drafts,
  currency,
  onChange,
}: {
  drafts: Draft[];
  currency: Currency;
  onChange: (key: string, patch: Partial<Draft>) => void;
}) {
  return (
    <Stagger as="ul" interval={0.04} className={styles.list}>
      {drafts.map((draft) => (
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

          <Thumb label={draft.name || "?"} size={48} className={styles.thumb} />

          <div className={styles.fields}>
            <input
              className={styles.name}
              value={draft.name}
              onChange={(event) => onChange(draft.key, { name: event.target.value })}
              aria-label="Product name"
              placeholder="Product name"
            />
            <div className={styles.meta}>
              {draft.localName ? <span className={styles.local}>{draft.localName}</span> : null}
              {draft.confidence < LOW_CONFIDENCE ? <Badge tone="sun">Check</Badge> : null}
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
      ))}
    </Stagger>
  );
}
