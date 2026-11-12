import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/domain/product";
import { renderShareImage, SHARE_IMAGE, sharePhotos, shareTiles } from "./shareImage";

const photo = (name: string) => `https://firebasestorage.googleapis.com/v0/b/shop/o/${name}.webp?alt=media`;

const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id,
  name: id,
  price: 100,
  inStock: true,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  imageUrl: photo(id),
  ...extra,
});

describe("sharePhotos", () => {
  it("takes the first three photos on the shelf", () => {
    const products = ["a", "b", "c", "d"].map((id) => product(id));
    expect(sharePhotos(products)).toEqual([photo("a"), photo("b"), photo("c")]);
  });

  it("shows what's in stock before what's sold out", () => {
    const products = [product("a", { inStock: false }), product("b"), product("c", { imageUrl: undefined })];
    expect(sharePhotos(products)).toEqual([photo("b"), photo("a")]);
  });

  it("skips photos that aren't our own uploads", () => {
    const products = [
      product("a", { imageUrl: "https://example.com/a.jpg" }),
      product("b", { imageUrl: "http://firebasestorage.googleapis.com/b.jpg" }),
      product("c", { imageUrl: "not a url" }),
    ];
    expect(sharePhotos(products)).toEqual([]);
  });
});

describe("shareTiles", () => {
  it.each([1, 2, 3])("fits %i square tiles inside the picture, centered", (count) => {
    const tiles = shareTiles(count);
    expect(tiles).toHaveLength(count);
    const first = tiles[0];
    const last = tiles[count - 1];
    expect(first.left).toBeGreaterThanOrEqual(48);
    expect(first.top).toBeGreaterThanOrEqual(48);
    expect(first.top + first.size).toBeLessThanOrEqual(SHARE_IMAGE.height - 48);
    // The same space on both sides.
    expect(Math.abs(first.left - (SHARE_IMAGE.width - last.left - last.size))).toBeLessThanOrEqual(1);
  });
});

describe("renderShareImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  const webp = (color: string) => sharp({ create: { width: 300, height: 200, channels: 3, background: color } }).webp().toBuffer();

  it("draws the photos onto one small JPEG", async () => {
    const red = await webp("#ff0000");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(red))));

    const image = await renderShareImage([photo("a"), photo("b")], "#25211e");
    const { data, info } = await sharp(image!).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.format]).toEqual([1200, 630, "raw"]);
    expect((await sharp(image!).metadata()).format).toBe("jpeg");
    expect(image!.byteLength).toBeLessThan(300_000);

    const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    const [tile] = shareTiles(2);
    // Red inside the first tile, the store's background at the picture's edge.
    expect(pixel(tile.left + tile.size / 2, 315)[0]).toBeGreaterThan(200);
    expect(pixel(4, 4).every((channel) => channel < 60)).toBe(true);
  });

  it("leaves out a photo it can't read, and gives up when none can be", async () => {
    const blue = await webp("#0000ff");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(new Uint8Array(blue)))
      .mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await renderShareImage([photo("a"), photo("b")])).not.toBeNull();
    expect(await renderShareImage([photo("a")])).toBeNull();
    expect(await renderShareImage([])).toBeNull();
  });
});
