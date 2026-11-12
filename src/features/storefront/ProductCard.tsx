"use client";

import clsx from "clsx";
import { Badge, Text, Thumb } from "@/components/ui";
import type { PriceUnit, Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { productNames } from "./labels";
import { useLanguage } from "./language";
import { Price } from "./Price";
import { ChooseButton, QuantityControl } from "./QuantityControl";
import styles from "./ProductCard.module.scss";

export type ProductCardProps = {
  product: Product;
  currency: Currency;
  // What the price is for (the product's unit, else the shop's default).
  unit: PriceUnit;
  quantity: number;
  // Omitted when the store has no way to take orders.
  onQuantityChange?: (quantity: number) => void;
  // Instead of the stepper, for products with sizes or colours.
  onChoose?: () => void;
};

export function ProductCard({
  product,
  currency,
  unit,
  quantity,
  onQuantityChange,
  onChoose,
  variant = "grid",
}: ProductCardProps & { variant?: "grid" | "showcase" | "compact" }) {
  const { language, shopLanguage, words } = useLanguage();
  const names = productNames(product, language, shopLanguage);
  // Compact cards are three across: no room for the second name.
  const otherName = variant === "compact" ? undefined : names.other;
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
            {words.soldOut}
          </Badge>
        ) : null}
        {/* Floats on the photo's corner, so the stepper can grow without covering the price. */}
        {product.inStock && (onChoose || onQuantityChange) ? (
          <div className={styles.quantity}>
            {onChoose ? (
              <ChooseButton quantity={quantity} onChoose={onChoose} label={names.name} />
            ) : onQuantityChange ? (
              <QuantityControl quantity={quantity} onChange={onQuantityChange} label={names.name} unit={unit} />
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        {/* Two text lines at most, so cards in a row stay the same height. */}
        <Text weight={600} clamp={otherName ? 1 : 2} className={styles.name}>
          {names.name}
        </Text>
        {otherName ? (
          <Text tone="muted" clamp={1} className={styles.localName}>
            {otherName}
          </Text>
        ) : null}
        <div className={styles.footer}>
          <Price amount={product.price} currency={currency} unit={unit} className={styles.price} />
        </div>
      </div>
    </article>
  );
}
