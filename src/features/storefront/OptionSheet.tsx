"use client";

import clsx from "clsx";
import { ShoppingBag } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button, Sheet, Text, Thumb } from "@/components/ui";
import type { PriceUnit, Product, Variant } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice, perUnit } from "@/lib/format";
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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product.name}
      footer={
        <Button size="lg" block icon={<ShoppingBag />} disabled={!ready} onClick={() => onAdd({ size, color })}>
          {ready ? "Add to order" : `Choose ${!product.sizes?.length || size ? "a colour" : "a size"}`}
        </Button>
      }
    >
      <div className={styles.summary}>
        <Thumb label={product.name} src={product.imageUrl} size={72} className={styles.thumb} />
        <Text size="lg" weight={800} tone={product.price === null ? "subtle" : "brand"}>
          {product.price === null ? "Ask" : `${formatPrice(product.price, currency)}${perUnit(unit)}`}
        </Text>
      </div>
      {product.sizes?.length ? <Choices label="Size" values={product.sizes} value={size} onChange={setSize} /> : null}
      {product.colors?.length ? (
        <Choices label="Colour" values={product.colors} value={color} onChange={setColor} swatches />
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
