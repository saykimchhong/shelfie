import { describe, expect, it } from "vitest";
import { pairPrices } from "./price-matcher";
import { listToWatch, localOnly, photosToWatch, type PhotoRead } from "./readers";

const photoProduct = (name: string, photo: number, price: number | null, box: number[] | null = [100, 100, 500, 400]) => ({
  name,
  localName: null,
  category: null,
  unit: "each" as const,
  photo,
  box,
  price,
  confidence: 0.9,
});

describe("photosToWatch", () => {
  it("places each product on its photo, with its written price", () => {
    const read: PhotoRead = { products: [photoProduct("Fish Sauce", 1, 35), photoProduct("Rice", 2, null)] };
    const watch = photosToWatch(read, 2);

    expect(watch.products.map(({ clearestSeconds, box }) => [clearestSeconds, box])).toEqual([
      [0, [100, 100, 500, 400]],
      [1, [100, 100, 500, 400]],
    ]);
    expect(watch.prices).toEqual([{ atSeconds: 0, heard: "35", amount: 35, product: 0 }]);
    expect(pairPrices(watch).products.map((product) => product.price)).toEqual([35, null]);
  });

  it("drops the box when the photo number doesn't exist", () => {
    const watch = photosToWatch({ products: [photoProduct("Soap", 7, 10)] }, 2);
    expect(watch.products[0]).toMatchObject({ clearestSeconds: 0, box: null });
  });
});

describe("listToWatch", () => {
  it("keeps the owner's order and skips impossible prices", () => {
    const watch = listToWatch({
      products: [
        { name: "Coke 1.5L", localName: null, category: null, unit: "each", price: 25 },
        { name: "Toothpaste", localName: null, category: null, unit: "each", price: null },
        { name: "Soap", localName: null, category: null, unit: "kg", price: -3 },
      ],
    });

    expect(watch.products.map(({ name, clearestSeconds, box }) => [name, clearestSeconds, box])).toEqual([
      ["Coke 1.5L", 0, null],
      ["Toothpaste", 1, null],
      ["Soap", 2, null],
    ]);
    expect(watch.prices.map(({ product, amount }) => [product, amount])).toEqual([[0, 25]]);
  });

  it("keeps each product's own unit", () => {
    const list = listToWatch({
      products: [
        { name: "Rice", localName: null, category: null, unit: "kg", price: 45 },
        { name: "Mint", localName: null, category: null, unit: "bunch", price: 10 },
      ],
    });
    expect(list.products.map((product) => product.unit)).toEqual(["kg", "bunch"]);

    const photos = photosToWatch({ products: [{ ...photoProduct("Mango", 1, 60), unit: "kg" }] }, 1);
    expect(photos.products[0].unit).toBe("kg");
  });
});

describe("localOnly", () => {
  it("keeps names in a local script and drops English copies", () => {
    expect(localOnly(" น้ำปลา ")).toBe("น้ำปลา");
    expect(localOnly("ស្ករ")).toBe("ស្ករ");
    expect(localOnly("Mama Tom Yum Noodles")).toBeNull();
    expect(localOnly(null)).toBeNull();
  });
});
