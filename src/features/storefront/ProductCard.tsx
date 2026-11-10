"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import type { PriceUnit, Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice, perUnit } from "@/lib/format";
import { QuantityControl } from "./QuantityControl";
import styles from "./ProductCard.module.scss";

export type ProductCardProps = {
  product: Product;
  currency: Currency;
  // What the price is for (the product's unit, else the shop's default).
  unit: PriceUnit;
  quantity: number;
  // Omitted when the store has no way to take orders.
  onQuantityChange?: (quantity: number) => void;
};

export function ProductCard({
  product,
  currency,
  unit,
  quantity,
  onQuantityChange,
  variant = "grid",
}: ProductCardProps & { variant?: "grid" | "showcase" | "compact" }) {
  // Compact cards are three across: no room for the label name.
  const localName = variant === "compact" ? undefined : product.localName;
  return (
    <article
      className={clsx(
        styles.card,
        styles[variant],
        !product.inStock && styles.soldOut,
        quantity > 0 && styles.inCart,
      )}
    >
      <div className={styles.media}>
        <Thumb label={product.name} src={product.imageUrl} size={260} className={styles.thumb} />
        {!product.inStock ? (
          <Badge tone="neutral" className={styles.badge}>
            Sold out
          </Badge>
        ) : null}
        {/* Floats on the photo's corner, so the stepper can grow without covering the price. */}
        {onQuantityChange && product.inStock ? (
          <div className={styles.quantity}>
            <QuantityControl quantity={quantity} onChange={onQuantityChange} label={product.name} unit={unit} />
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        {/* Two text lines at most, so cards in a row stay the same height. */}
        <Text weight={600} clamp={localName ? 1 : 2} className={styles.name}>
          {product.name}
        </Text>
        {localName ? (
          <Text tone="muted" clamp={1} className={styles.localName}>
            {localName}
          </Text>
        ) : null}
        <div className={styles.footer}>
          <Text weight={800} tone={product.price === null ? "subtle" : "brand"} className={styles.price}>
            {product.price === null ? "Ask" : `${formatPrice(product.price, currency)}${perUnit(unit)}`}
          </Text>
        </div>
      </div>
    </article>
  );
}
