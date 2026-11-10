import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListedProduct } from "@/domain/updates";
import { POST } from "./route";

const server = vi.hoisted(() => ({ provider: "mock", signedIn: true, readUpdate: vi.fn() }));

vi.mock("@/server/auth", () => {
  class AuthError extends Error {}
  return {
    AuthError,
    requireUser: async () => {
      if (!server.signedIn) throw new AuthError("Sign in first");
      return { uid: "seller" };
    },
  };
});

vi.mock("@/server/extraction", () => ({ extractionProvider: () => server.provider }));

vi.mock("@/server/updates/reader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/updates/reader")>()),
  readUpdate: server.readUpdate,
}));

const products: ListedProduct[] = [
  { id: "milo", name: "Milo 400g", price: 95, unit: "each", inStock: true },
  { id: "rice", name: "Jasmine Rice", price: 40, unit: "kg", inStock: true },
];

function request(fields: Record<string, string | Blob>) {
  const body = new FormData();
  body.append("products", JSON.stringify(products));
  body.append("currency", "THB");
  body.append("labelLanguage", "th");
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request("http://localhost/api/updates", { method: "POST", body });
}

const voice = () => new File(["RIFF"], "voice.wav", { type: "audio/wav" });

beforeEach(() => {
  server.provider = "mock";
  server.signedIn = true;
  server.readUpdate.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/updates", () => {
  it("turns a typed message into changes (mock AI)", async () => {
    const response = await POST(request({ text: "Milo 99, rice sold out" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: "mock",
      heard: null,
      changes: [
        { kind: "update", id: "milo", edit: { price: 99 } },
        { kind: "update", id: "rice", edit: { inStock: false } },
      ],
    });
  });

  it("sends a voice note to the real AI with the shop's settings", async () => {
    server.provider = "gemini";
    server.readUpdate.mockResolvedValue({ heard: "milo is ninety nine", changes: [] });

    const response = await POST(request({ audio: voice() }));

    expect(await response.json()).toEqual({ provider: "gemini", heard: "milo is ninety nine", changes: [] });
    const [message, sentProducts, settings] = server.readUpdate.mock.calls[0];
    expect(await message.audio.text()).toBe("RIFF");
    expect(sentProducts).toEqual(products);
    expect(settings).toEqual({ currency: "THB", labelLanguage: "th" });
  });

  it("asks for typing when voice can't be read in mock mode", async () => {
    const response = await POST(request({ audio: voice() }));
    expect(response.status).toBe(501);
    expect((await response.json()).error).toMatch(/Type it instead/);
  });

  it("says when the AI fails", async () => {
    server.provider = "gemini";
    server.readUpdate.mockRejectedValue(new Error("model down"));
    expect((await POST(request({ text: "Milo 99" }))).status).toBe(502);
  });

  it.each([
    ["nothing said", {}],
    ["too much text", { text: "x".repeat(501) }],
    ["a file that isn't audio", { audio: new File(["x"], "a.png", { type: "image/png" }) }],
    ["products that aren't JSON", { text: "Milo 99", products: "nope" }],
    ["an unknown currency", { text: "Milo 99", currency: "EUR" }],
  ])("rejects %s", async (_, fields) => {
    expect((await POST(request(fields))).status).toBe(400);
  });

  it("needs a signed-in seller", async () => {
    server.signedIn = false;
    expect((await POST(request({ text: "Milo 99" }))).status).toBe(401);
  });
});
