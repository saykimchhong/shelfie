// "2", "2 กก.": a quantity with its unit word, for languages without plurals.
export function formatAmount(quantity: number, unit: string): string {
  return unit ? `${quantity} ${unit}` : String(quantity);
}
