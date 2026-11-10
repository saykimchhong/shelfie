import type { PriceUnit } from "@/domain/product";

// Weighed goods change by half a kilo; the first tap adds a whole one.
// Everything else is counted: 1, 2, 3.
export const stepOf = (unit: PriceUnit) => (unit === "kg" ? 0.5 : 1);

export function addOne(quantity: number, unit: PriceUnit): number {
  return quantity === 0 ? 1 : quantity + stepOf(unit);
}

// 0 once it would go below one step: the item leaves the cart.
export function removeOne(quantity: number, unit: PriceUnit): number {
  const next = quantity - stepOf(unit);
  return next > 0 ? next : 0;
}

// "2", "1.5"
export function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}
