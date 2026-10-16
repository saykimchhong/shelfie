"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice } from "@/lib/format";
import { QuantityControl } from "./QuantityControl";
import styles from "./ProductCard.module.scss";

export type ProductCardProps = {
  product: Product;
  currency: Currency;
  quantity: number;
  // Omitted when the store has no way to take orders.
  onQuantityChange?: (quantity: number) => void;
};

export function ProductCard({
  product,
  currency,
  quantity,
  onQuantityChange,
  variant = "grid",
}: ProductCardProps & { variant?: "grid" | "showcase" }) {
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
      </div>
      <div className={styles.body}>
        <Text weight={600} clamp={2} className={styles.name}>
          {product.name}
        </Text>
        {product.localName ? (
          <Text size="sm" tone="muted" clamp={1}>
            {product.localName}
          </Text>
        ) : null}
        <div className={styles.footer}>
          <Text weight={800} tone={product.price === null ? "subtle" : "brand"}>
            {product.price === null ? "Ask" : formatPrice(product.price, currency)}
          </Text>
          {onQuantityChange && product.inStock ? (
            <QuantityControl quantity={quantity} onChange={onQuantityChange} label={product.name} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
