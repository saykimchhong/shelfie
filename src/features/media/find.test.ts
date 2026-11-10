import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SHOT_PRODUCTS, type ShotProduct } from "@/domain/photos";
import { pickShots } from "./find";
import type { ShotTarget } from "./shots";

const phone = vi.hoisted(() => ({ signedIn: true, failedStills: new Set<number>(), stillCalls: [] as number[][] }));

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: () => ({ currentUser: phone.signedIn ? { getIdToken: async () => "token" } : null }),
}));

vi.mock("./video", () => ({
  captureStills: async (_url: string, seconds: number[]) => {
    phone.stillCalls.push(seconds);
    return seconds.map((time, index) =>
      phone.failedStills.has(index) ? null : new Blob([`still@${time}`], { type: "image/webp" }),
    );
  },
}));

const box = { left: 0.1, top: 0.1, width: 0.2, height: 0.2 };
const found = { left: 0.4, top: 0.3, width: 0.3, height: 0.2 };
const rice: ShotTarget = { name: "Rice", localName: "ข้าว", seconds: 4, box };
const sauce: ShotTarget = { name: "Fish Sauce", localName: null, seconds: 9, box: null };

let sent: { products: ShotProduct[]; frames: string[] } | null;

function answer(response: Response | ((products: ShotProduct[]) => unknown)) {
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const form = init.body as FormData;
    const products = JSON.parse(String(form.get("products"))) as ShotProduct[];
    sent = { products, frames: await Promise.all(form.getAll("frame").map((frame) => (frame as Blob).text())) };
    return response instanceof Response ? response : Response.json(response(products));
  });
}

beforeEach(() => {
  phone.signedIn = true;
  phone.failedStills = new Set();
  phone.stillCalls = [];
  sent = null;
});

afterEach(() => vi.unstubAllGlobals());

describe("pickShots", () => {
  it("sends three stills per product and crops the frames the finder picked", async () => {
    answer(() => ({ picks: [{ frame: 2, box: found }, { frame: 0, box: found }] }));

    const requests = await pickShots("blob:video", [rice, sauce]);

    expect(sent?.products).toEqual([
      { name: "Rice", localName: "ข้าว", hint: box, frames: 3 },
      { name: "Fish Sauce", localName: null, hint: null, frames: 3 },
    ]);
    expect(sent?.frames).toEqual(["still@3.5", "still@4", "still@4.5", "still@8.5", "still@9", "still@9.5"]);
    expect(requests).toEqual([
      { seconds: 4.5, box: found, exact: true },
      { seconds: 8.5, box: found, exact: true },
    ]);
  });

  it("leaves out stills that failed and maps picks to the ones sent", async () => {
    phone.failedStills = new Set([0, 3, 4, 5]); // Rice's first, all of Fish Sauce's
    answer(() => ({ picks: [{ frame: 0, box: found }] }));

    const requests = await pickShots("blob:video", [rice, sauce]);

    expect(sent?.products).toEqual([{ name: "Rice", localName: "ข้าว", hint: box, frames: 2 }]);
    expect(sent?.frames).toEqual(["still@4", "still@4.5"]);
    expect(requests).toEqual([
      { seconds: 4, box: found, exact: true },
      { seconds: 9, box: null },
    ]);
  });

  it("asks about at most the request limit and crops the rest where the Watcher saw them", async () => {
    const many = Array.from({ length: MAX_SHOT_PRODUCTS + 1 }, (_, i) => ({ ...rice, name: `Item ${i}` }));
    answer((products) => ({ picks: products.map(() => ({ frame: 1, box: found })) }));

    const requests = await pickShots("blob:video", many);

    expect(sent?.products).toHaveLength(MAX_SHOT_PRODUCTS);
    expect(requests.slice(0, MAX_SHOT_PRODUCTS).every((request) => request.exact)).toBe(true);
    expect(requests[MAX_SHOT_PRODUCTS]).toEqual({ seconds: 4, box });
  });

  it.each([
    ["the server says no (mock mode)", () => answer(new Response(null, { status: 501 }))],
    ["the answer isn't picks", () => answer(() => ({ nope: true }))],
    ["the request fails", () => vi.stubGlobal("fetch", async () => Promise.reject(new Error("offline")))],
  ])("keeps the Watcher's frames when %s", async (_, setup) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setup();
    expect(await pickShots("blob:video", [rice, sauce])).toEqual([
      { seconds: 4, box },
      { seconds: 9, box: null },
    ]);
  });

  it("doesn't capture or send anything when signed out", async () => {
    phone.signedIn = false;
    answer(() => ({ picks: [] }));
    expect(await pickShots("blob:video", [rice])).toEqual([{ seconds: 4, box }]);
    expect(phone.stillCalls).toEqual([]);
    expect(sent).toBeNull();
  });
});
