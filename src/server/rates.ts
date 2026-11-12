import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { FALLBACK_RATES, saneRates, type Rates } from "@/domain/currency";

// Free daily exchange rates, no key: https://github.com/fawazahmed0/exchange-api
const SOURCE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

const sourceSchema = z.object({ usd: z.record(z.string(), z.unknown()) });

// Throws when the feed can't be read, so a failure isn't cached.
async function todaysRates(): Promise<Rates> {
  "use cache";
  cacheLife("hours");

  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Rates feed answered ${response.status}`);
  const { usd } = sourceSchema.parse(await response.json());
  return saneRates({ KHR: usd.khr, LKR: usd.lkr, THB: usd.thb });
}

// live: false means the usual rates were used instead of today's.
export async function getRates(): Promise<{ rates: Rates; live: boolean }> {
  try {
    return { rates: await todaysRates(), live: true };
  } catch (error) {
    console.warn("Using fallback exchange rates", error);
    return { rates: FALLBACK_RATES, live: false };
  }
}
