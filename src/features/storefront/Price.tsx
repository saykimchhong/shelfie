import clsx from "clsx";
import type { PriceUnit } from "@/domain/product";
import type { Currency } from "@/domain/store";
import { formatPrice } from "@/lib/format";
import styles from "./Price.module.scss";

// "฿1,250,000 / kg": the amount never breaks; the unit is lighter and moves to
// the next line as a whole when space runs out. `stacked` puts it underneath.
export function Price({
  amount,
  currency,
  unit,
  stacked,
  className,
}: {
  amount: number | null;
  currency: Currency;
  unit: PriceUnit;
  stacked?: boolean;
  className?: string;
}) {
  if (amount === null) return <span className={clsx(styles.price, styles.ask, className)}>Ask</span>;
  return (
    <span className={clsx(styles.price, stacked && styles.stacked, className)}>
      <span className={styles.amount}>{formatPrice(amount, currency)}</span>
      {unit === "each" ? null : <span className={styles.unit}>/ {unit}</span>}
    </span>
  );
}
