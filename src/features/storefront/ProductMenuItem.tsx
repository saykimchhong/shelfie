"use client";

import clsx from "clsx";
import { Badge, Thumb } from "@/components/ui";
import { Price } from "./Price";
import type { ProductCardProps } from "./ProductCard";
import { ChooseButton, QuantityControl } from "./QuantityControl";
import styles from "./ProductMenuItem.module.scss";

// Row for the "menu" template: name ··· price, like a printed menu. The photo
// is a small extra, shown only when there is one.
export function ProductMenuItem({ product, currency, unit, quantity, onQuantityChange, onChoose }: ProductCardProps) {
  return (
    <article className={clsx(styles.item, !product.inStock && styles.soldOut, quantity > 0 && styles.inCart)}>
      {product.imageUrl ? <Thumb label={product.name} src={product.imageUrl} size={56} className={styles.thumb} /> : null}
      {/* Names on the left, price on the right, so a two-line price never pushes the label name down. */}
      <div className={styles.line}>
        <div className={styles.names}>
          <span className={styles.name}>{product.name}</span>
          {product.localName ? <span className={styles.local}>{product.localName}</span> : null}
        </div>
        <span className={styles.leader} aria-hidden />
        <Price amount={product.price} currency={currency} unit={unit} stacked className={styles.price} />
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
