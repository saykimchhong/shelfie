"use client";

import clsx from "clsx";
import { CakeSlice, Carrot, Shirt, ShoppingBasket, Store, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { SHOP_TYPE_INFO, SHOP_TYPES, type ShopType } from "@/domain/shop";
import styles from "./ShopTypePicker.module.scss";

const ICONS: Record<ShopType, ReactNode> = {
  shop: <Store />,
  food: <UtensilsCrossed />,
  grocery: <ShoppingBasket />,
  fashion: <Shirt />,
  market: <Carrot />,
  bakery: <CakeSlice />,
};

export function ShopTypePicker({ value, onChange }: { value: ShopType; onChange: (type: ShopType) => void }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>What do you sell?</legend>
      <div className={styles.types}>
        {SHOP_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={value === type}
            className={clsx(styles.type, value === type && styles.selected)}
            onClick={() => onChange(type)}
          >
            <span className={styles.icon} aria-hidden>
              {ICONS[type]}
            </span>
            <span className={styles.name}>{SHOP_TYPE_INFO[type].name}</span>
            <span className={styles.examples}>{SHOP_TYPE_INFO[type].examples}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
