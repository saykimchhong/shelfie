import { describe, expect, it } from "vitest";
import { qrMatrix, wrapLines } from "./qr";

describe("qrMatrix", () => {
  const matrix = qrMatrix("https://shelfie.app/kamal-stores");

  it("is a square grid", () => {
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it("has the three corner markers scanners look for", () => {
    const size = matrix.length;
    const marker = (top: number, left: number) =>
      // A dark 7×7 ring around a light ring around a dark 3×3 centre.
      [0, 6].every((edge) => matrix[top + edge].slice(left, left + 7).every(Boolean)) &&
      matrix[top + 1].slice(left + 1, left + 6).every((dark) => !dark) &&
      matrix[top + 3][left + 3];
    expect(marker(0, 0)).toBe(true);
    expect(marker(0, size - 7)).toBe(true);
    expect(marker(size - 7, 0)).toBe(true);
  });

  it("changes with the link", () => {
    expect(qrMatrix("https://shelfie.app/other-shop")).not.toEqual(matrix);
  });
});

describe("wrapLines", () => {
  const spaces = (text: string) => text.split(/(?<=\s)/);
  const fits = (max: number) => (line: string) => line.length <= max;

  it("keeps a short name on one line", () => {
    expect(wrapLines("Kamal Stores", 2, fits(20), spaces)).toEqual(["Kamal Stores"]);
  });

  it("breaks between words", () => {
    expect(wrapLines("Auntie Mali's Fresh Market", 2, fits(16), spaces)).toEqual(["Auntie Mali's", "Fresh Market"]);
  });

  it("ends in … when it still doesn't fit", () => {
    const lines = wrapLines("The Very Long Shop Name Of Colombo Three", 2, fits(12), spaces);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(lines[1].length).toBeLessThanOrEqual(12);
  });

  it("keeps one word that's too wide rather than dropping it", () => {
    expect(wrapLines("Supercalifragilistic", 2, fits(8), spaces)).toEqual(["Supercalifragilistic"]);
  });
});
