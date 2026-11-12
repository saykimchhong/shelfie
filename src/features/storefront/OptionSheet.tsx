"use client";

import clsx from "clsx";
import { ShoppingBag } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button, Sheet, Thumb } from "@/components/ui";
import type { PriceUnit, Product, Variant } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { productNames } from "./labels";
import { useLanguage } from "./language";
import { Price } from "./Price";
import styles from "./OptionSheet.module.scss";

// Pick a size and colour before adding: each list with choices needs one.
export function OptionSheet({
  product,
  open,
  currency,
  unit,
  onClose,
  onAdd,
}: {
  product: Product;
  open: boolean;
  currency: Currency;
  unit: PriceUnit;
  onClose: () => void;
  onAdd: (variant: Variant) => void;
}) {
  const [size, setSize] = useState<string | undefined>(product.sizes?.length === 1 ? product.sizes[0] : undefined);
  const [color, setColor] = useState<string | undefined>(product.colors?.length === 1 ? product.colors[0] : undefined);
  const ready = (!product.sizes?.length || size !== undefined) && (!product.colors?.length || color !== undefined);
  const { language, shopLanguage, words } = useLanguage();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={productNames(product, language, shopLanguage).name}
      closeLabel={words.close}
      footer={
        <Button size="lg" block icon={<ShoppingBag />} disabled={!ready} onClick={() => onAdd({ size, color })}>
          {ready ? words.addToOrder : !product.sizes?.length || size ? words.chooseColour : words.chooseSize}
        </Button>
      }
    >
      <div className={styles.summary}>
        <Thumb label={product.name} src={product.imageUrl} size={72} className={styles.thumb} />
        <Price amount={product.price} currency={currency} unit={unit} className={styles.price} />
      </div>
      {product.sizes?.length ? <Choices label={words.size} values={product.sizes} value={size} onChange={setSize} /> : null}
      {product.colors?.length ? (
        <Choices label={words.colour} values={product.colors} value={color} onChange={setColor} swatches />
      ) : null}
    </Sheet>
  );
}

// A colour name the browser knows ("black", "navy") gets a dot of that colour.
const cssColor = (name: string) =>
  typeof CSS !== "undefined" && CSS.supports("color", name.toLowerCase()) ? name.toLowerCase() : null;

function Choices({
  label,
  values,
  value,
  onChange,
  swatches,
}: {
  label: string;
  values: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  swatches?: boolean;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.choices} role="radiogroup" aria-label={label}>
        {values.map((option) => {
          const dot = swatches ? cssColor(option) : null;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={value === option}
              className={clsx(styles.choice, value === option && styles.chosen)}
              onClick={() => onChange(option)}
            >
              {dot ? <span className={styles.dot} style={{ "--dot": dot } as CSSProperties} aria-hidden /> : null}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
