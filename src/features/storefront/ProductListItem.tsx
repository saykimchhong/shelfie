"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import { productNames } from "./labels";
import { useLanguage } from "./language";
import { Price } from "./Price";
import type { ProductCardProps } from "./ProductCard";
import { ChooseButton, QuantityControl } from "./QuantityControl";
import styles from "./ProductListItem.module.scss";

// Compact row for the "list" template: many small items, fast to scan.
export function ProductListItem({ product, currency, unit, quantity, onQuantityChange, onChoose }: ProductCardProps) {
  const { language, shopLanguage, words } = useLanguage();
  const names = productNames(product, language, shopLanguage);
  return (
    <article className={clsx(styles.item, !product.inStock && styles.soldOut, quantity > 0 && styles.inCart)}>
      <Thumb label={product.name} src={product.imageUrl} size={72} className={styles.thumb} />
      <div className={styles.info}>
        <Text weight={600} clamp={2}>
          {names.name}
        </Text>
        {names.other ? (
          <Text size="sm" tone="muted" clamp={1}>
            {names.other}
          </Text>
        ) : null}
        <Price amount={product.price} currency={currency} unit={unit} />
      </div>
      {!product.inStock ? (
        <Badge>{words.soldOut}</Badge>
      ) : onChoose ? (
        <ChooseButton quantity={quantity} onChoose={onChoose} label={names.name} />
      ) : onQuantityChange ? (
        <QuantityControl quantity={quantity} onChange={onQuantityChange} label={names.name} unit={unit} />
      ) : null}
    </article>
  );
}
