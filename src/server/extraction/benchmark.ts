import "server-only";
import { pairPrices } from "./agents/price-matcher";
import type { Watch } from "./agents/watcher";

// How close a Watcher run came to a reference reading (npm run bench:watch).

// Share of words in common for two names to count as the same product.
const SAME_NAME = 0.5;

export type Agreement = {
  products: number;
  reference: number;
  matched: number;
  sameLocalName: number;
  samePrice: number;
  // pairs[i]: reference index matched by run product i, or null.
  pairs: (number | null)[];
};

export function compareWatch(run: Watch, reference: Watch): Agreement {
  const pairs = matchNames(
    run.products.map((product) => product.name),
    reference.products.map((product) => product.name),
  );
  const runPrices = pairPrices(run).products.map((product) => product.price);
  const referencePrices = pairPrices(reference).products.map((product) => product.price);

  let sameLocalName = 0;
  let samePrice = 0;
  pairs.forEach((match, index) => {
    if (match === null) return;
    if (sameText(run.products[index].localName, reference.products[match].localName)) sameLocalName++;
    if (runPrices[index] === referencePrices[match]) samePrice++;
  });

  return {
    products: run.products.length,
    reference: reference.products.length,
    matched: pairs.filter((match) => match !== null).length,
    sameLocalName,
    samePrice,
    pairs,
  };
}

// Greedy one-to-one, best pairs first.
export function matchNames(names: readonly string[], referenceNames: readonly string[]): (number | null)[] {
  const candidates = names.flatMap((name, index) =>
    referenceNames.map((reference, match) => ({ index, match, score: nameSimilarity(name, reference) })),
  );
  candidates.sort((a, b) => b.score - a.score);

  const pairs: (number | null)[] = names.map(() => null);
  const used = new Set<number>();
  for (const { index, match, score } of candidates) {
    if (score < SAME_NAME) break;
    if (pairs[index] !== null || used.has(match)) continue;
    pairs[index] = match;
    used.add(match);
  }
  return pairs;
}

export function nameSimilarity(a: string, b: string): number {
  const left = words(a);
  const right = words(b);
  const shared = [...left].filter((word) => right.has(word)).length;
  const all = new Set([...left, ...right]).size;
  return all === 0 ? 0 : shared / all;
}

function words(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFKC")
      .toLowerCase()
      // \p{M}: Thai and Khmer vowel signs.
      .split(/[^\p{L}\p{M}\p{N}]+/u)
      .filter(Boolean),
  );
}

function sameText(a: string | null, b: string | null): boolean {
  return (a?.trim() ?? "") === (b?.trim() ?? "");
}
