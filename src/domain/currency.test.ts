import { describe, expect, it } from "vitest";
import { convertPrice, convertPrices, FALLBACK_RATES, roundPrice, saneRates, type Rates } from "./currency";

const rates: Rates = { USD: 1, KHR: 4100, LKR: 330, THB: 34 };

describe("roundPrice", () => {
  it("rounds to the smallest step shops use", () => {
    expect(roundPrice(1.4634, "USD")).toBe(1.45);
    expect(roundPrice(53.37, "THB")).toBe(53);
    expect(roundPrice(6148, "KHR")).toBe(6100);
    expect(roundPrice(497.3, "LKR")).toBe(495);
  });

  it("keeps three leading digits on big prices", () => {
    expect(roundPrice(1161.6, "THB")).toBe(1160);
    expect(roundPrice(143_520, "KHR")).toBe(144_000);
    expect(roundPrice(123.44, "USD")).toBe(123);
  });

  it("never rounds a real price down to nothing", () => {
    expect(roundPrice(0.01, "USD")).toBe(0.05);
    expect(roundPrice(20, "KHR")).toBe(100);
    expect(roundPrice(0, "THB")).toBe(0);
  });
});

describe("convertPrice", () => {
  it("converts through the dollar", () => {
    expect(convertPrice(1.5, "USD", "THB", rates)).toBe(51);
    expect(convertPrice(1.5, "USD", "KHR", rates)).toBe(6200);
    expect(convertPrice(6000, "KHR", "USD", rates)).toBe(1.45);
    expect(convertPrice(100, "THB", "LKR", rates)).toBe(970);
  });

  it("leaves a price alone when the currency doesn't change", () => {
    expect(convertPrice(12.34, "USD", "USD", rates)).toBe(12.34);
  });
});

describe("convertPrices", () => {
  it("gives every priced product its new price, and skips the rest", () => {
    const products = [
      { id: "rice", price: 1.5 },
      { id: "ask", price: null },
      { id: "free", price: 0 },
    ];
    expect(convertPrices(products, "USD", "THB", rates)).toEqual([{ id: "rice", price: 51 }]);
    expect(convertPrices(products, "USD", "USD", rates)).toEqual([]);
  });
});

describe("saneRates", () => {
  it("uses today's rates", () => {
    expect(saneRates({ USD: 1, KHR: 4093.9, LKR: 332.8, THB: 33.6 })).toEqual({ USD: 1, KHR: 4093.9, LKR: 332.8, THB: 33.6 });
  });

  it("falls back, currency by currency, on missing or absurd numbers", () => {
    expect(saneRates({ KHR: 41, LKR: "330", THB: 33.6 })).toEqual({ ...FALLBACK_RATES, THB: 33.6 });
    expect(saneRates({})).toEqual(FALLBACK_RATES);
  });
});
