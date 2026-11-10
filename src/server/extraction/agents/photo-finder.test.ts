import type { Content } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import type { ShotProduct } from "@/domain/photos";
import { describeProduct, findShots, toGridBox, toPicks } from "./photo-finder";
import { toFrameBox } from "./watcher";

// Fake Gemini: picks frame 1 of every product it's shown; fails calls naming "broken".
const calls = vi.hoisted(() => ({ active: 0, peak: 0, count: 0 }));
vi.mock("@/server/adk", () => ({
  geminiModel: () => "gemini-test",
  runWorkflow: async (_name: string, entry: (run: (node: unknown, input: Content) => Promise<unknown>) => unknown) =>
    entry(async (_node, input) => {
      calls.count++;
      calls.active++;
      calls.peak = Math.max(calls.peak, calls.active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      calls.active--;
      const texts = (input.parts ?? []).map((part) => part.text ?? "");
      if (texts.some((text) => text.includes("broken"))) throw new Error("model down");
      const products = texts.filter((text) => /^Product \d+: /.test(text)).length;
      return { picks: Array.from({ length: products }, (_, i) => ({ product: i + 1, frame: 1, box: [0, 0, 500, 500] })) };
    }),
}));

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

describe("findShots", () => {
  const product = (name: string): ShotProduct => ({ name, localName: null, hint: null, frames: 2 });
  const framesFor = (count: number) =>
    Array.from({ length: count * 2 }, () => ({ data: new Blob(["x"], { type: "image/webp" }), mimeType: "image/webp" }));
  const picked = { frame: 0, box: { left: 0, top: 0, width: 0.5, height: 0.5 } };
  const none = { frame: null, box: null };

  it("asks six products per call, a few calls at a time, and keeps their order", async () => {
    Object.assign(calls, { active: 0, peak: 0, count: 0 });
    const products = Array.from({ length: 30 }, (_, i) => product(`Item ${i}`));

    const picks = await findShots(products, framesFor(30));

    expect(picks).toHaveLength(30);
    expect(picks.every((pick) => pick.frame === 0)).toBe(true);
    expect(calls.count).toBe(5);
    expect(calls.peak).toBeLessThanOrEqual(4);
  });

  it("leaves only a failed call's products without a pick", async () => {
    const products = [...Array.from({ length: 6 }, (_, i) => product(`Item ${i}`)), product("broken scale")];

    const picks = await findShots(products, framesFor(7));

    expect(picks.slice(0, 6)).toEqual(Array.from({ length: 6 }, () => picked));
    expect(picks[6]).toEqual(none);
  });
});
