import { FALLBACK_RATES, ratesSchema, type Rates } from "@/domain/currency";

// Today's rates, or the usual ones when they can't be fetched.
export async function fetchRates(): Promise<Rates> {
  try {
    const response = await fetch("/api/rates");
    if (!response.ok) return FALLBACK_RATES;
    const body: unknown = await response.json();
    return ratesSchema.parse((body as { rates?: unknown }).rates);
  } catch {
    return FALLBACK_RATES;
  }
}
