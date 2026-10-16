import "server-only";
import type { ExtractedProduct, Extraction, KnownProduct } from "@/domain/extraction";
import { sampleCatalog } from "@/domain/samples";
import type { ExtractInput } from "./types";

const MOCK_DELAY_MS = 2200;
const MOCK_ITEMS = 7;
const MOCK_NEW_ON_RESTOCK = 2;

type MockItem = Omit<ExtractedProduct, "seenAtSeconds" | "confidence">;

// Same contract as geminiExtract, with deterministic sample data.
// - New shelf: sample products, including a missing price and a low-confidence item.
// - Known shelf (restock): most known products come back (the first with a new
//   price), every third one is missing, and two new products appear.
export async function mockExtract(input: ExtractInput): Promise<Extraction> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const items = input.known.length > 0 ? restockItems(input) : newShelfItems(input);
  const duration = input.durationSeconds && input.durationSeconds > 1 ? input.durationSeconds : 20;

  return {
    products: items.map((item, index) => ({
      ...item,
      // Evenly through the video, so frame grabs land on different shelves.
      seenAtSeconds: Math.round(((index + 0.5) * duration * 10) / items.length) / 10,
      confidence: item.note ? 0.45 : 0.82 + (index % 3) * 0.06,
    })),
  };
}

function newShelfItems(input: ExtractInput): MockItem[] {
  return sampleCatalog(input.labelLanguage, input.currency)
    .slice(0, MOCK_ITEMS)
    .map((item, index) => ({
      name: item.name,
      localName: item.localName,
      price: index === 3 ? null : item.price,
      category: item.category,
      matchId: null,
      note: index === 3 ? "Price not said" : index === 5 ? "Label hard to read" : null,
    }));
}

function restockItems(input: ExtractInput): MockItem[] {
  const seen = input.known
    .filter((_, index) => index % 3 !== 2)
    .map((product, index) => ({
      name: product.name,
      localName: product.localName ?? null,
      price: index === 0 ? raisedPrice(product.price) : product.price,
      category: null,
      matchId: product.id,
      note: null,
    }));

  const knownNames = new Set(input.known.map((product) => product.name.toLowerCase()));
  const added = sampleCatalog(input.labelLanguage, input.currency)
    .filter((item) => !knownNames.has(item.name.toLowerCase()))
    .slice(0, MOCK_NEW_ON_RESTOCK)
    .map((item) => ({ ...item, matchId: null, note: null }));

  return [...seen, ...added];
}

// About 10% up, kept to whole units for currencies that don't use cents.
function raisedPrice(price: KnownProduct["price"]): number | null {
  if (price === null) return null;
  return Number.isInteger(price) ? Math.ceil(price * 1.1) : Math.round(price * 110) / 100;
}
