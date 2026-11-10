import { describe, expect, it } from "vitest";
import type { Watch, WatchedProduct } from "./agents/watcher";
import { compareWatch, matchNames, nameSimilarity } from "./benchmark";

function product(name: string, localName: string | null = null): WatchedProduct {
  return {
    name,
    localName,
    category: null,
    firstSeenSeconds: 0,
    lastSeenSeconds: 10,
    clearestSeconds: 5,
    box: null,
    confidence: 0.9,
    note: null,
  };
}

describe("nameSimilarity", () => {
  it("compares words, ignoring case and punctuation", () => {
    expect(nameSimilarity("Mama Tom-Yum Noodles", "mama tom yum noodles")).toBe(1);
    expect(nameSimilarity("Singha Water 600ml", "Singha Soda 600ml")).toBe(0.5);
    expect(nameSimilarity("Rice", "Fish Sauce")).toBe(0);
  });

  it("keeps Thai vowel and tone marks inside words", () => {
    expect(nameSimilarity("ข้าว หอม", "ข้าว")).toBe(0.5);
  });
});

describe("matchNames", () => {
  it("pairs each name once, best match first", () => {
    expect(matchNames(["Black Brogue Shoe", "Black Shoe", "Red Hat"], ["Black Leather Brogue Shoe", "Black Shoe"])).toEqual([
      0,
      1,
      null,
    ]);
  });
});

describe("compareWatch", () => {
  const reference: Watch = {
    products: [product("Jasmine Rice 5kg", "ข้าวหอมมะลิ"), product("Fish Sauce 700ml"), product("Milo 400g")],
    prices: [
      { atSeconds: 2, heard: "250 baht", amount: 250, product: 0 },
      { atSeconds: 4, heard: "45", amount: 45, product: 1 },
    ],
  };

  it("agrees fully with itself", () => {
    expect(compareWatch(reference, reference)).toMatchObject({
      products: 3,
      reference: 3,
      matched: 3,
      sameLocalName: 3,
      samePrice: 3,
    });
  });

  it("counts missed products, other local names and other prices", () => {
    const run: Watch = {
      products: [product("Jasmine Rice 5kg Bag", "ข้าว"), product("Fish Sauce 700ml"), product("Coke 1.5L")],
      prices: [{ atSeconds: 4, heard: "50", amount: 50, product: 1 }],
    };
    expect(compareWatch(run, reference)).toMatchObject({
      products: 3,
      matched: 2,
      sameLocalName: 1, // Fish Sauce: no local name in either
      samePrice: 0, // Rice lost its price, Fish Sauce heard 50 instead of 45
      pairs: [0, 1, null],
    });
  });
});
