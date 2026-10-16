"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import type { ProductCardProps } from "./ProductCard";
import { QuantityControl } from "./QuantityControl";
import styles from "./ProductListItem.module.scss";

// Compact row for the "list" template: many small items, fast to scan.
export function ProductListItem({ product, currency, quantity, onQuantityChange }: ProductCardProps) {
  return (
    <article className={clsx(styles.item, !product.inStock && styles.soldOut, quantity > 0 && styles.inCart)}>
      <Thumb label={product.name} src={product.imageUrl} size={72} className={styles.thumb} />
      <div className={styles.info}>
        <Text weight={600} clamp={1}>
          {product.name}
        </Text>
        {product.localName ? (
          <Text size="sm" tone="muted" clamp={1}>
            {product.localName}
          </Text>
        ) : null}
        <Text weight={800} tone={product.price === null ? "subtle" : "brand"}>
          {product.price === null ? "Ask" : formatPrice(product.price, currency)}
        </Text>
      </div>
      {!product.inStock ? (
        <Badge>Sold out</Badge>
      ) : onQuantityChange ? (
        <QuantityControl quantity={quantity} onChange={onQuantityChange} label={product.name} />
      ) : null}
    </article>
  );
}
