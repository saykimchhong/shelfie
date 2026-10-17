import "server-only";
import { FunctionNode } from "@google/adk";
import type { HeardPrice, Watch, WatchedProduct } from "./watcher";

// A price said this close to a product's time on screen still counts as said
// while it was shown.
const ON_SCREEN_SLACK_SECONDS = 3;

// several: different prices were said for it. offscreen: its price was said
// while it wasn't on screen.
export type PriceIssue = "several" | "offscreen";

export type PricedProduct = WatchedProduct & {
  price: number | null;
  priceSaidAt: number | null;
  priceIssue: PriceIssue | null;
};

export type Pricing = {
  products: PricedProduct[];
  // Prices that couldn't be tied to one product.
  unpaired: HeardPrice[];
};

export function pairPrices(watch: Watch): Pricing {
  const products: PricedProduct[] = watch.products.map((product) => ({
    ...product,
    price: null,
    priceSaidAt: null,
    priceIssue: null,
  }));
  const unpaired: HeardPrice[] = [];

  for (const heard of [...watch.prices].sort((a, b) => a.atSeconds - b.atSeconds)) {
    const index = pairedIndex(heard, watch.products);
    if (index === null) {
      unpaired.push(heard);
      continue;
    }

    const product = products[index];
    const several = product.priceIssue === "several" || (product.price !== null && product.price !== heard.amount);
    // The last price said wins: owners correct themselves.
    products[index] = {
      ...product,
      price: heard.amount,
      priceSaidAt: heard.atSeconds,
      priceIssue: several ? "several" : isOnScreen(product, heard.atSeconds) ? null : "offscreen",
    };
  }

  return { products, unpaired };
}

// The Watcher's own pairing when it gave one; otherwise the only product on
// screen at that moment.
function pairedIndex(heard: HeardPrice, products: readonly WatchedProduct[]): number | null {
  if (heard.product !== null && heard.product >= 0 && heard.product < products.length) return heard.product;
  const onScreen = products.flatMap((product, index) => (isOnScreen(product, heard.atSeconds) ? [index] : []));
  return onScreen.length === 1 ? onScreen[0] : null;
}

function isOnScreen(product: WatchedProduct, seconds: number): boolean {
  return (
    seconds >= product.firstSeenSeconds - ON_SCREEN_SLACK_SECONDS &&
    seconds <= product.lastSeenSeconds + ON_SCREEN_SLACK_SECONDS
  );
}

export function createPriceMatcher(): FunctionNode<Watch, Pricing> {
  return new FunctionNode("priceMatcher", (_ctx, watch: Watch) => pairPrices(watch));
}
