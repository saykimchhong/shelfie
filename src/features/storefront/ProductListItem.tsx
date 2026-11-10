"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import { Price } from "./Price";
import type { ProductCardProps } from "./ProductCard";
import { ChooseButton, QuantityControl } from "./QuantityControl";
import styles from "./ProductListItem.module.scss";

// Compact row for the "list" template: many small items, fast to scan.
export function ProductListItem({ product, currency, unit, quantity, onQuantityChange, onChoose }: ProductCardProps) {
  return (
    <article className={clsx(styles.item, !product.inStock && styles.soldOut, quantity > 0 && styles.inCart)}>
      <Thumb label={product.name} src={product.imageUrl} size={72} className={styles.thumb} />
      <div className={styles.info}>
        <Text weight={600} clamp={2}>
          {product.name}
        </Text>
        {product.localName ? (
          <Text size="sm" tone="muted" clamp={1}>
            {product.localName}
          </Text>
        ) : null}
        <Price amount={product.price} currency={currency} unit={unit} />
      </div>
      {!product.inStock ? (
        <Badge>Sold out</Badge>
      ) : onChoose ? (
        <ChooseButton quantity={quantity} onChoose={onChoose} label={product.name} />
      ) : onQuantityChange ? (
        <QuantityControl quantity={quantity} onChange={onQuantityChange} label={product.name} unit={unit} />
      ) : null}
    </article>
  );
}
