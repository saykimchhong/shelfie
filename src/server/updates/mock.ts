import "server-only";
import type { ListedProduct } from "@/domain/updates";
import type { ReaderOutput } from "./reader";

// Mock mode: a few English patterns, enough to demo the assistant without Gemini.
// "Milo 30", "Coke sold out", "remove soap", "add eggs 4 each", "what is sold out?".

const SOLD_OUT = /\b(sold out|out of stock|none left|no more|finished|ran out)\b/;
const BACK = /\b(back|in stock|restocked|available)\b/;
const REMOVE = /\b(remove|delete|stop selling|no longer sell)\b/;
const ADD = /\b(add|new)\b/;
const PRICE = /(\d+(?:\.\d+)?)/;
const QUESTION = /\?\s*$|^(what|which|how many|how much|list|show)\b/;
const NO_PRICE = /\b(no price|without a price|missing price)\b/;
const UNITS = [
  ["kg", /\b(kg|kilo|per kilo)\b/],
  ["bunch", /\bbunch\b/],
  ["pack", /\bpack\b/],
] as const;
const FILLER =
  /\b(add|new|is|are|now|at|for|to|each|per|kg|kilo|bunch|pack|price|baht|riel|rs|rupees|dollars?|usd|thb|khr|lkr)\b|[$฿៛]|\d+(?:\.\d+)?/g;

const words = (text: string) => text.toLocaleLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word.length >= 3);

// The listed product sharing the most words with the clause, or -1.
function findProduct(clause: string, products: readonly ListedProduct[]): number {
  const said = new Set(words(clause));
  let best = -1;
  let bestScore = 0;
  products.forEach((product, index) => {
    const score = words(`${product.name} ${product.localName ?? ""}`).filter((word) => said.has(word)).length;
    if (score > bestScore) [best, bestScore] = [index, score];
  });
  return best;
}

const titleCase = (text: string) => text.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
const names = (products: readonly ListedProduct[]) => products.map((product) => product.name).join("\n");

// A plain answer to a question about the list, or null when it isn't one.
function answer(question: string, products: readonly ListedProduct[]): string | null {
  if (!QUESTION.test(question)) return null;
  if (SOLD_OUT.test(question)) {
    const soldOut = products.filter((product) => !product.inStock);
    return soldOut.length > 0 ? `Sold out:\n${names(soldOut)}` : "Nothing is sold out.";
  }
  if (NO_PRICE.test(question)) {
    const unpriced = products.filter((product) => product.price === null);
    return unpriced.length > 0 ? `No price yet:\n${names(unpriced)}` : "Every product has a price.";
  }
  if (/\bhow many\b/.test(question)) return `You have ${products.length} products.`;
  const product = products[findProduct(question, products)];
  if (!product) return "I can tell you what is sold out, what has no price, or a product's price.";
  const price = product.price === null ? "no price" : `${product.price} ${product.unit === "each" ? "each" : `per ${product.unit}`}`;
  return `${product.name}: ${price}, ${product.inStock ? "in stock" : "sold out"}.`;
}

export function mockRead(text: string, products: readonly ListedProduct[]): ReaderOutput {
  const reply = answer(text.trim().toLocaleLowerCase(), products);
  if (reply) return { heard: null, reply, changes: [] };

  const changes: ReaderOutput["changes"] = [];
  for (const clause of text.split(/[,;\n]+|\band\b|\.\s+/i)) {
    const lower = clause.trim().toLocaleLowerCase();
    if (!lower) continue;
    const priceMatch = lower.match(PRICE);
    const price = priceMatch ? Number(priceMatch[1]) : null;
    const unit = UNITS.find(([, pattern]) => pattern.test(lower))?.[0] ?? null;
    const index = ADD.test(lower) ? -1 : findProduct(lower, products);
    const base = { product: null, name: null, localName: null, price: null, unit: null, inStock: null };

    if (index >= 0) {
      const product = index + 1;
      if (REMOVE.test(lower)) changes.push({ ...base, action: "remove", product });
      else {
        const inStock = SOLD_OUT.test(lower) ? false : BACK.test(lower) ? true : null;
        changes.push({ ...base, action: "update", product, price, unit, inStock });
      }
    } else if (ADD.test(lower) || price !== null) {
      const name = titleCase(lower.replace(FILLER, " ").replace(/\s+/g, " ").trim());
      if (name) changes.push({ ...base, action: "add", name, price, unit });
    }
  }
  return { heard: null, reply: "", changes };
}
