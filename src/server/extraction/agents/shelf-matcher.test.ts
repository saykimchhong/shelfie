import { describe, expect, it } from "vitest";
import type { KnownProduct } from "@/domain/extraction";
import { toMatchIds } from "./shelf-matcher";

const known: KnownProduct[] = [
  { id: "loafer", name: "Tan Loafer", price: 40 },
  { id: "brogue", name: "Black Brogue", price: 55 },
];

describe("toMatchIds", () => {
  it("returns one matchId per seen product", () => {
    const output = { matches: [{ index: 2, matchId: "loafer" }, { index: 0, matchId: null }] };
    expect(toMatchIds(output, 3, known)).toEqual([null, null, "loafer"]);
  });

  it("drops unknown ids, bad indexes and a second use of an id", () => {
    const output = {
      matches: [
        { index: 0, matchId: "sandal" },
        { index: 5, matchId: "brogue" },
        { index: 1, matchId: "loafer" },
        { index: 2, matchId: "loafer" },
      ],
    };
    expect(toMatchIds(output, 3, known)).toEqual([null, "loafer", null]);
  });

  it("rejects output that isn't a match list", () => {
    expect(() => toMatchIds({ products: [] }, 1, known)).toThrow();
  });
});
