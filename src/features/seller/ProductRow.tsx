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
        {/* Name first and given the full width; the price sits under it. */}
        <span className={styles.info}>
          <Text as="span" weight={600} clamp={2}>
            {product.name}
            {product.localName ? <span className={styles.localName}> · {product.localName}</span> : null}
          </Text>
          <Text as="span" size="sm" weight={700} tone={product.price === null ? "subtle" : "brand"}>
            {product.price === null ? "No price yet" : `${formatPrice(product.price, currency)}${perUnit(unit)}`}
          </Text>
        </span>
      </button>
      <div className={styles.stock}>
        <Switch checked={product.inStock} onChange={onToggleStock} label={`${product.name} in stock`} />
        <span className={styles.stockText} aria-hidden>
          {product.inStock ? "On sale" : "Sold out"}
        </span>
      </div>
    </li>
  );
}
