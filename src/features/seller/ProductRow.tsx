"use client";

import clsx from "clsx";
import { Switch, Text, Thumb } from "@/components/ui";
import type { PriceUnit, Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice, perUnit } from "@/lib/format";
import styles from "./ProductRow.module.scss";

export type ProductRowProps = {
  product: Product;
  currency: Currency;
  unit: PriceUnit;
  onOpen: () => void;
  onToggleStock: (inStock: boolean) => void;
};

// Tap the product to edit it; the switch is the one-tap "sold out" toggle.
export function ProductRow({ product, currency, unit, onOpen, onToggleStock }: ProductRowProps) {
  return (
    <li className={clsx(styles.row, !product.inStock && styles.soldOut)}>
      <button type="button" className={styles.open} onClick={onOpen} aria-label={`Edit ${product.name}`}>
        <Thumb label={product.name} src={product.imageUrl} size={56} className={styles.thumb} />
        <span className={styles.info}>
          <Text as="span" weight={600} clamp={1}>
            {product.name}
          </Text>
          {product.localName ? (
            <Text as="span" size="sm" tone="muted" clamp={1}>
              {product.localName}
            </Text>
          ) : null}
        </span>
        <Text as="span" weight={700} tone={product.price === null ? "subtle" : "brand"} className={styles.price}>
          {product.price === null ? "—" : `${formatPrice(product.price, currency)}${perUnit(unit)}`}
        </Text>
      </button>
      <Switch checked={product.inStock} onChange={onToggleStock} label={`${product.name} in stock`} />
    </li>
  );
}
