import { z } from "zod";
import { CURRENCIES, type Currency } from "./store";

// How many of each currency one US dollar buys.
export type Rates = Record<Currency, number>;

// For when today's rates can't be fetched (as of November 2026).
export const FALLBACK_RATES: Rates = { USD: 1, KHR: 4100, LKR: 330, THB: 34 };

export const ratesSchema = z.object({
  USD: z.number().positive(),
  KHR: z.number().positive(),
  LKR: z.number().positive(),
  THB: z.number().positive(),
});

// A fetched rate this far from the usual one is a broken feed, not the market.
const MAX_DRIFT = 2;

// Today's rates where they look sane, the usual ones where they don't.
export function saneRates(fetched: Partial<Record<Currency, unknown>>): Rates {
  const rates = { ...FALLBACK_RATES };
  for (const currency of CURRENCIES) {
    const rate = fetched[currency];
    const usual = FALLBACK_RATES[currency];
    if (typeof rate === "number" && rate >= usual / MAX_DRIFT && rate <= usual * MAX_DRIFT) rates[currency] = rate;
  }
  return { ...rates, USD: 1 };
}

// The smallest step shops price in: nobody charges ฿53.37 or 6,148៛.
const SMALLEST_STEP: Record<Currency, number> = { USD: 0.05, KHR: 100, LKR: 5, THB: 1 };

// Rounds like a shopkeeper would: three leading digits, never finer than the
// currency's smallest step, and never down to nothing.
export function roundPrice(amount: number, currency: Currency): number {
  if (!(amount > 0)) return 0;
  const step = Math.max(SMALLEST_STEP[currency], 10 ** (Math.floor(Math.log10(amount)) - 2));
  const rounded = Math.max(step, Math.round(amount / step) * step);
  return Number(rounded.toFixed(2));
}

export function convertPrice(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  return roundPrice((amount / rates[from]) * rates[to], to);
}

// The new price of every product whose price changes. Products with no
// price ("Ask") stay that way.
export function convertPrices(
  products: readonly { id: string; price: number | null }[],
  from: Currency,
  to: Currency,
  rates: Rates,
): { id: string; price: number }[] {
  return products.flatMap(({ id, price }) => {
    if (price === null) return [];
    const converted = convertPrice(price, from, to, rates);
    return converted === price ? [] : [{ id, price: converted }];
  });
}
