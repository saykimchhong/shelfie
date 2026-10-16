import "server-only";
import type { Extraction } from "@/domain/extraction";
import { sampleCatalog } from "@/domain/samples";
import type { ExtractInput } from "./types";

const MOCK_DELAY_MS = 2200;
const MOCK_ITEMS = 7;

// Same contract as geminiExtract, with deterministic sample data. It shows every
// state the review screen has to handle: a missing price and a low-confidence item.
export async function mockExtract(input: ExtractInput): Promise<Extraction> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const items = sampleCatalog(input.labelLanguage, input.currency).slice(0, MOCK_ITEMS);
  const duration = input.durationSeconds && input.durationSeconds > 1 ? input.durationSeconds : 20;

  return {
    products: items.map((item, index) => ({
      name: item.name,
      localName: item.localName,
      price: index === 3 ? null : item.price,
      category: item.category,
      // Evenly through the video, so frame grabs land on different shelves.
      seenAtSeconds: Math.round(((index + 0.5) * duration * 10) / items.length) / 10,
      confidence: index === 5 ? 0.45 : 0.82 + (index % 3) * 0.06,
    })),
  };
}
