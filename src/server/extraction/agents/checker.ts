import "server-only";
import { FunctionNode } from "@google/adk";
import { LOW_CONFIDENCE, type Extraction, type KnownProduct } from "@/domain/extraction";
import type { Currency } from "@/domain/store";
import { formatPrice } from "@/lib/format";
import type { PricedProduct, Pricing } from "./price-matcher";
import { toFrameBox } from "./watcher";

// A new price this many times higher or lower than the current one is
// probably misheard.
const PRICE_JUMP = 3;

export type CheckInput = { pricing: Pricing; matchIds: (string | null)[] };

export type CheckContext = { currency: Currency; known: readonly KnownProduct[] };

export function checkProducts({ pricing, matchIds }: CheckInput, { currency, known }: CheckContext): Extraction {
  const knownById = new Map(known.map((product) => [product.id, product]));
  const nameCounts = new Map<string, number>();
  for (const product of pricing.products) {
    const key = nameKey(product);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  return {
    products: pricing.products.map((product, index) => {
      const match = knownById.get(matchIds[index] ?? "") ?? null;
      const repeated = nameCounts.get(nameKey(product))! > 1;
      return {
        name: product.name,
        localName: product.localName,
        price: product.price,
        category: product.category,
        seenAtSeconds: product.clearestSeconds,
        box: toFrameBox(product.box),
        priceSaidAt: product.priceSaidAt,
        confidence: product.confidence,
        matchId: match?.id ?? null,
        note: noteFor(product, match, repeated, currency),
      };
    }),
  };
}

// The most important thing to double-check, or the Watcher's own note.
function noteFor(
  product: PricedProduct,
  match: KnownProduct | null,
  repeated: boolean,
  currency: Currency,
): string | null {
  if (product.price === null && !match) return "Price not said";
  if (product.priceIssue === "several") return "Two prices said";
  if (product.priceIssue === "offscreen") return "Check price";
  if (product.price !== null && match?.price && isPriceJump(product.price, match.price)) {
    return `Was ${formatPrice(match.price, currency)}`;
  }
  if (repeated) return "Listed twice?";
  if (product.confidence < LOW_CONFIDENCE) return product.note ?? "Check name";
  return product.note;
}

function isPriceJump(price: number, before: number): boolean {
  return price > 0 && before > 0 && (price / before >= PRICE_JUMP || before / price >= PRICE_JUMP);
}

function nameKey(product: PricedProduct): string {
  return `${product.name.trim().toLocaleLowerCase()}|${product.localName?.trim() ?? ""}`;
}

export function createChecker(context: CheckContext): FunctionNode<CheckInput, Extraction> {
  return new FunctionNode("checker", (_ctx, input: CheckInput) => checkProducts(input, context));
}
