import "server-only";
import { FunctionNode } from "@google/adk";
import type { KnownProduct } from "@/domain/extraction";
import { sampleCatalog } from "@/domain/samples";
import type { ShelfMatch, ShelfMatchInput } from "./agents/shelf-matcher";
import type { Watch } from "./agents/watcher";
import type { ShelfAgents } from "./pipeline";
import type { ExtractInput } from "./types";

const MOCK_ITEMS = 7;
const MOCK_NEW_ON_RESTOCK = 2;
const MOCK_BOX = [200, 250, 800, 750];

export type MockDelays = { watcherMs: number; shelfMatcherMs: number };

// About as long as a short real video takes, so the activity feed has time to show.
const DEFAULT_DELAYS: MockDelays = { watcherMs: 1800, shelfMatcherMs: 400 };

type MockItem = {
  name: string;
  localName: string | null;
  category: string | null;
  price: number | null;
  note: string | null;
};

// Stand-ins for the two AI steps, with deterministic sample data.
// - New shelf: sample products, one with no price said and one hard to read.
// - Restock: most known products come back (the first with a new price),
//   every third one is missing, and two new products appear.
export function mockAgents(input: ExtractInput, delays: MockDelays = DEFAULT_DELAYS): ShelfAgents {
  return {
    watcher: new FunctionNode("watcher", async () => {
      await sleep(delays.watcherMs);
      return mockWatch(input);
    }),
    shelfMatcher: new FunctionNode("shelfMatcher", async (_ctx, match: ShelfMatchInput) => {
      await sleep(delays.shelfMatcherMs);
      return matchByName(match);
    }),
  };
}

function mockWatch(input: ExtractInput): Watch {
  const items =
    input.source === "text" ? listItems(input.text ?? "") : input.known.length > 0 ? restockItems(input) : newShelfItems(input);
  const duration = input.durationSeconds && input.durationSeconds > 1 ? input.durationSeconds : 20;
  const slot = duration / items.length;
  const at = (seconds: number) => Math.round(seconds * 10) / 10;
  // Photos and lists use positions: the photo's index, or the line's.
  const photoCount = input.photos?.length || 1;
  const place = (index: number) =>
    input.source === "photos"
      ? { first: index % photoCount, last: index % photoCount, clearest: index % photoCount }
      : input.source === "text"
        ? { first: index, last: index, clearest: index }
        : { first: at(index * slot), last: at((index + 1) * slot), clearest: at((index + 0.5) * slot) };

  const products = items.map((item, index) => {
    const { first, last, clearest } = place(index);
    return {
      name: item.name,
      localName: item.localName,
      category: item.category,
      firstSeenSeconds: first,
      lastSeenSeconds: last,
      clearestSeconds: clearest,
      box: input.source === "text" ? null : MOCK_BOX,
      confidence: item.note ? 0.45 : 0.82 + (index % 3) * 0.06,
      note: item.note,
    };
  });

  const prices = items.flatMap((item, index) =>
    item.price === null
      ? []
      : [{ atSeconds: products[index].clearestSeconds, heard: String(item.price), amount: item.price, product: index }],
  );

  return { products, prices };
}

// One product per line or comma; the last number on it is the price.
export function listItems(text: string): MockItem[] {
  return text.split(/[\n,;]+/).flatMap((line) => {
    const price = line.match(/(\d+(?:\.\d+)?)(?!.*\d)/);
    const name = (price ? line.slice(0, price.index) + line.slice(price.index! + price[0].length) : line)
      .replace(/[-–:=@$฿៛]|\b(baht|riel|rs|usd)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return name ? [{ name, localName: null, category: null, price: price ? Number(price[1]) : null, note: null }] : [];
  });
}

function newShelfItems(input: ExtractInput): MockItem[] {
  return sampleCatalog(input.labelLanguage, input.currency)
    .slice(0, MOCK_ITEMS)
    .map((item, index) => ({
      ...item,
      price: index === 3 ? null : item.price,
      note: index === 5 ? "Label hard to read" : null,
    }));
}

function restockItems(input: ExtractInput): MockItem[] {
  const seen = input.known
    .filter((_, index) => index % 3 !== 2)
    .map((product, index) => ({
      name: product.name,
      localName: product.localName ?? null,
      category: null,
      price: index === 0 ? raisedPrice(product.price) : product.price,
      note: null,
    }));

  const knownNames = new Set(input.known.map((product) => product.name.toLowerCase()));
  const added = sampleCatalog(input.labelLanguage, input.currency)
    .filter((item) => !knownNames.has(item.name.toLowerCase()))
    .slice(0, MOCK_NEW_ON_RESTOCK)
    .map((item) => ({ ...item, note: null }));

  return [...seen, ...added];
}

function matchByName({ seen, listed }: ShelfMatchInput): ShelfMatch {
  const byName = new Map(listed.map((product) => [product.name.toLowerCase(), product.id]));
  return { matches: seen.map(({ index, name }) => ({ index, matchId: byName.get(name.toLowerCase()) ?? null })) };
}

// About 10% up, kept to whole units for currencies that don't use cents.
function raisedPrice(price: KnownProduct["price"]): number | null {
  if (price === null) return null;
  return Number.isInteger(price) ? Math.ceil(price * 1.1) : Math.round(price * 110) / 100;
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
