import { describe, expect, it } from "vitest";
import { openState, type OpeningHours } from "@/domain/hours";
import { wordsFor } from "@/lib/words";
import { hoursLabel, perUnitText, productNames, variantText } from "./labels";

describe("productNames", () => {
  const rice = { name: "Jasmine Rice", localName: "ข้าวหอมมะลิ" };

  it("leads with the label name when the customer reads the shop's language", () => {
    expect(productNames(rice, "th", "th")).toEqual({ name: "ข้าวหอมมะลิ", other: "Jasmine Rice" });
  });

  it("leads with the English name for everyone else", () => {
    expect(productNames(rice, "en", "th")).toEqual({ name: "Jasmine Rice", other: "ข้าวหอมมะลิ" });
    expect(productNames(rice, "km", "th")).toEqual({ name: "Jasmine Rice", other: "ข้าวหอมมะลิ" });
  });

  it("has one name when there's no label name", () => {
    expect(productNames({ name: "Coke 1.5L" }, "th", "th")).toEqual({ name: "Coke 1.5L", other: undefined });
    expect(productNames({ name: "Coke 1.5L", localName: "  " }, "th", "th")).toEqual({ name: "Coke 1.5L", other: undefined });
  });
});

describe("hoursLabel", () => {
  const daily: OpeningHours = { open: "07:00", close: "21:00", closedDays: [] };
  // Wednesday 12 Nov 2025 in Bangkok.
  const at = (hours: OpeningHours, time: string) => openState(hours, new Date(`2025-11-12T${time}:00+07:00`), "Asia/Bangkok");

  it("says in English exactly what the shop's own label says", () => {
    const english = wordsFor("en");
    const closedThursFri = { ...daily, closedDays: [4, 5] };
    const cases = [
      at(daily, "12:00"),
      at(daily, "06:15"),
      at(daily, "22:00"),
      at(closedThursFri, "22:00"),
      at({ open: "00:00", close: "00:00", closedDays: [] }, "03:00"),
      at({ ...daily, closedDays: [0, 1, 2, 3, 4, 5, 6] }, "12:00"),
    ];
    for (const state of cases) expect(hoursLabel(state, english)).toBe(state.label);
  });

  it("says it in the customer's language", () => {
    const thai = wordsFor("th");
    expect(hoursLabel(at(daily, "12:00"), thai)).toBe("เปิดอยู่ · ถึง 21:00");
    expect(hoursLabel(at(daily, "22:00"), thai)).toBe("ปิดอยู่ · เปิด พรุ่งนี้ 07:00");
    expect(hoursLabel(at({ ...daily, closedDays: [4, 5] }, "22:00"), thai)).toBe("ปิดอยู่ · เปิด ส. 07:00");
  });
});

describe("variantText and perUnitText", () => {
  it("names a size and colour", () => {
    expect(variantText({ size: "M", color: "Black" }, wordsFor("en"))).toBe("Size M, Black");
    expect(variantText({ size: "M" }, wordsFor("th"))).toBe("ขนาด M");
    expect(variantText({ color: "Red" }, wordsFor("km"))).toBe("Red");
    expect(variantText(undefined, wordsFor("en"))).toBe("");
  });

  it("adds the unit after a price", () => {
    expect(perUnitText("each", wordsFor("th"))).toBe("");
    expect(perUnitText("kg", wordsFor("en"))).toBe(" / kg");
    expect(perUnitText("bunch", wordsFor("th"))).toBe(" / กำ");
  });
});
