import { describe, expect, it } from "vitest";
import type { ShotProduct } from "@/domain/photos";
import { describeProduct, toGridBox, toPicks } from "./photo-finder";
import { toFrameBox } from "./watcher";

const rice: ShotProduct = {
  name: "Jasmine Rice 5kg",
  localName: "ข้าวหอมมะลิ",
  hint: { left: 0.1, top: 0.2, width: 0.3, height: 0.4 },
  frames: 3,
};
const sauce: ShotProduct = { name: "Fish Sauce", localName: null, hint: null, frames: 2 };

describe("toGridBox", () => {
  it("turns a box of fractions into Gemini's grid, and back", () => {
    expect(toGridBox(rice.hint!)).toEqual([200, 100, 600, 400]);
    expect(toFrameBox(toGridBox(rice.hint!))).toEqual(rice.hint);
  });
});

describe("describeProduct", () => {
  it("names the product, its label and where it was seen", () => {
    expect(describeProduct(rice, 1)).toBe("Product 1: Jasmine Rice 5kg (ข้าวหอมมะลิ). Hint: [200, 100, 600, 400].");
    expect(describeProduct(sauce, 2)).toBe("Product 2: Fish Sauce. Hint: none.");
  });
});

describe("toPicks", () => {
  it("maps the model's 1-based picks back to each product's frames", () => {
    const output = {
      picks: [
        { product: 2, frame: 2, box: [0, 0, 500, 500] },
        { product: 1, frame: 1, box: [200, 100, 600, 400] },
      ],
    };
    expect(toPicks(output, [rice, sauce])).toEqual([
      { frame: 0, box: rice.hint },
      { frame: 1, box: { left: 0, top: 0, width: 0.5, height: 0.5 } },
    ]);
  });

  it("drops picks it can't use: unknown products, frames not offered, bad boxes, no frame", () => {
    const output = {
      picks: [
        { product: 3, frame: 1, box: [0, 0, 500, 500] },
        { product: 2, frame: 3, box: [0, 0, 500, 500] }, // sauce only had 2 frames
        { product: 1, frame: 1, box: [600, 100, 200, 400] }, // upside down
      ],
    };
    expect(toPicks(output, [rice, sauce])).toEqual([
      { frame: null, box: null },
      { frame: null, box: null },
    ]);
    expect(toPicks({ picks: [{ product: 1, frame: null, box: null }] }, [rice])).toEqual([{ frame: null, box: null }]);
  });

  it("treats output that doesn't fit the schema as no picks", () => {
    expect(toPicks("nonsense", [rice])).toEqual([{ frame: null, box: null }]);
  });
});
