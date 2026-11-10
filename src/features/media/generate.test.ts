import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateProductPhoto } from "./generate";

const seller = vi.hoisted(() => ({ signedIn: true }));

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: () => ({ currentUser: seller.signedIn ? { getIdToken: async () => "token" } : null }),
}));

// No canvas in Node: the local tile draws onto a no-op context.
vi.mock("./image", () => {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get: (_target, key) => (key === "createLinearGradient" ? () => gradient : () => {}) });
  return {
    centerSquare: () => ({ sx: 0, sy: 0, side: 1 }),
    createCanvas: () => [{}, context],
    canvasToBlob: async () => new Blob(["local tile"], { type: "image/webp" }),
  };
});

const aiPhoto = () => new Response(new Blob(["gemini"], { type: "image/png" }));

function answer(...responses: Response[]) {
  const fetch = vi.fn(async () => responses.shift() ?? aiPhoto());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const make = () => generateProductPhoto({ name: "Rice", frame: null });

beforeEach(() => {
  seller.signedIn = true;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("generateProductPhoto", () => {
  it("uses the Gemini photo", async () => {
    answer(aiPhoto());
    expect(await (await make()).text()).toBe("gemini");
  });

  it("makes the local look in mock mode or when signed out", async () => {
    const fetch = answer(Response.json({ error: "mock" }, { status: 501 }));
    expect(await (await make()).text()).toBe("local tile");

    seller.signedIn = false;
    expect(await (await make()).text()).toBe("local tile");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once when Gemini is busy", async () => {
    const fetch = answer(Response.json({}, { status: 429 }), aiPhoto());
    const photo = make();
    await vi.runAllTimersAsync();
    expect(await (await photo).text()).toBe("gemini");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails instead of swapping in the local look when Gemini keeps failing", async () => {
    const fetch = answer(Response.json({}, { status: 502 }), Response.json({}, { status: 502 }));
    const photo = make();
    const failed = expect(photo).rejects.toThrow("AI photo failed (502)");
    await vi.runAllTimersAsync();
    await failed;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry a bad request", async () => {
    const fetch = answer(Response.json({}, { status: 400 }));
    await expect(make()).rejects.toThrow("AI photo failed (400)");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
