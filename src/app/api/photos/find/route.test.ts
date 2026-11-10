import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShotProduct } from "@/domain/photos";
import { POST } from "./route";

const server = vi.hoisted(() => ({ provider: "gemini", findProductShots: vi.fn() }));

vi.mock("@/server/auth", () => ({
  AuthError: class AuthError extends Error {},
  requireUser: async () => ({ uid: "seller" }),
}));

vi.mock("@/server/extraction", () => ({
  extractionProvider: () => server.provider,
  findProductShots: server.findProductShots,
}));

const rice: ShotProduct = { name: "Rice", localName: null, hint: null, frames: 2 };
const sauce: ShotProduct = { name: "Fish Sauce", localName: "น้ำปลา", hint: null, frames: 1 };
const still = (label: string, type = "image/webp") => new File([label], `${label}.webp`, { type });

function request(products: unknown, frames: File[]) {
  const body = new FormData();
  body.append("products", typeof products === "string" ? products : JSON.stringify(products));
  for (const frame of frames) body.append("frame", frame);
  return new Request("http://localhost/api/photos/find", { method: "POST", body });
}

beforeEach(() => {
  server.provider = "gemini";
  server.findProductShots.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/photos/find", () => {
  it("passes every product's frames to the finder in order and returns its picks", async () => {
    const picks = [
      { frame: 1, box: { left: 0.1, top: 0.1, width: 0.2, height: 0.2 } },
      { frame: null, box: null },
    ];
    server.findProductShots.mockResolvedValue(picks);

    const response = await POST(request([rice, sauce], [still("rice-0"), still("rice-1"), still("sauce-0")]));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ picks });
    const [products, frames] = server.findProductShots.mock.calls[0];
    expect(products).toEqual([rice, sauce]);
    expect(await Promise.all(frames.map(({ data }: { data: Blob }) => data.text()))).toEqual(["rice-0", "rice-1", "sauce-0"]);
  });

  it("is off in mock mode, so the phone keeps the Watcher's crops", async () => {
    server.provider = "mock";
    expect((await POST(request([rice], [still("a"), still("b")]))).status).toBe(501);
    expect(server.findProductShots).not.toHaveBeenCalled();
  });

  it.each([
    ["products that aren't JSON", "not json", [still("a")]],
    ["no products", [], []],
    ["fewer frames than the products say", [rice], [still("a")]],
    ["a frame that isn't an image", [{ ...sauce }], [still("a", "text/plain")]],
    ["a frame over 512 KB", [{ ...sauce }], [new File([new Uint8Array(600 * 1024)], "big.webp", { type: "image/webp" })]],
  ])("rejects %s", async (_, products, frames) => {
    expect((await POST(request(products, frames))).status).toBe(400);
    expect(server.findProductShots).not.toHaveBeenCalled();
  });

  it("answers 502 when the finder itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server.findProductShots.mockRejectedValue(new Error("model down"));
    expect((await POST(request([sauce], [still("a")]))).status).toBe(502);
  });
});
