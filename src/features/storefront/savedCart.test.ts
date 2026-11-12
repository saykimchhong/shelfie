import { describe, expect, it } from "vitest";
import { lineKey } from "./order";
import {
  createCartStore,
  decodeCart,
  EMPTY_CART,
  encodeCart,
  KEEP_MS,
  KEEP_SENT_MS,
  markSent,
  withNote,
  withQuantity,
  type Cart,
} from "./savedCart";

const rice = lineKey("rice");
const shirt = lineKey("shirt", { size: "M", color: "Red" });
const NOW = 1_700_000_000_000;

const cart: Cart = { quantities: { [rice]: 2, [shirt]: 1 }, notes: { [rice]: "no bag" } };

describe("changing the cart", () => {
  it("adds, changes and removes a line, taking its note with it", () => {
    expect(withQuantity(EMPTY_CART, rice, 1).quantities).toEqual({ [rice]: 1 });
    expect(withQuantity(cart, rice, 5).quantities[rice]).toBe(5);
    expect(withQuantity(cart, rice, 0)).toEqual({ quantities: { [shirt]: 1 }, notes: {} });
  });

  it("sets and clears a note", () => {
    expect(withNote(cart, shirt, "gift wrap").notes[shirt]).toBe("gift wrap");
    expect(withNote(cart, rice, "").notes).toEqual({});
  });

  it("is a new order again once it changes after sending", () => {
    const sent = markSent(cart, NOW);
    expect(sent.sentAt).toBe(NOW);
    expect(withQuantity(sent, rice, 3).sentAt).toBeUndefined();
    expect(withNote(sent, rice, "ripe").sentAt).toBeUndefined();
  });
});

describe("saving the cart", () => {
  it("comes back as it was saved", () => {
    expect(decodeCart(encodeCart(cart, NOW), NOW + 60_000)).toEqual(cart);
  });

  it("saves nothing for an empty cart", () => {
    expect(encodeCart(EMPTY_CART, NOW)).toBeNull();
    expect(encodeCart(withQuantity(withQuantity(cart, rice, 0), shirt, 0), NOW)).toBeNull();
  });

  it("forgets a cart after a few days", () => {
    const saved = encodeCart(cart, NOW);
    expect(decodeCart(saved, NOW + KEEP_MS - 1)).toEqual(cart);
    expect(decodeCart(saved, NOW + KEEP_MS + 1)).toBe(EMPTY_CART);
  });

  it("keeps an ordered cart only long enough to come back and fix it", () => {
    const saved = encodeCart(markSent(cart, NOW), NOW);
    expect(decodeCart(saved, NOW + KEEP_SENT_MS - 1).quantities).toEqual(cart.quantities);
    expect(decodeCart(saved, NOW + KEEP_SENT_MS + 1)).toBe(EMPTY_CART);
  });

  it("ignores anything it can't read", () => {
    expect(decodeCart(null, NOW)).toBe(EMPTY_CART);
    expect(decodeCart("not json", NOW)).toBe(EMPTY_CART);
    expect(decodeCart(JSON.stringify({ quantities: { [rice]: 1 } }), NOW)).toBe(EMPTY_CART);
    expect(decodeCart(JSON.stringify({ savedAt: NOW, quantities: { [rice]: -2 }, notes: {} }), NOW)).toBe(EMPTY_CART);
  });

  it("drops lines whose key isn't one of ours", () => {
    const saved = JSON.stringify({ savedAt: NOW, quantities: { [rice]: 1, rice: 4, "{}": 2 }, notes: { rice: "x" } });
    expect(decodeCart(saved, NOW)).toEqual({ quantities: { [rice]: 1 }, notes: {} });
  });
});

describe("createCartStore", () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const items = new Map(Object.entries(initial));
    return {
      items,
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    };
  }

  it("reads the saved cart, and saves every change", () => {
    const storage = fakeStorage({ "shelfie:cart:kamal": encodeCart(cart, NOW)! });
    const store = createCartStore("shelfie:cart:kamal", { storage: () => storage, now: () => NOW });
    expect(store.getServerSnapshot()).toBe(EMPTY_CART);
    expect(store.getSnapshot()).toEqual(cart);

    store.update((current) => withQuantity(current, rice, 3));
    expect(decodeCart(storage.items.get("shelfie:cart:kamal")!, NOW).quantities[rice]).toBe(3);

    store.update(() => EMPTY_CART);
    expect(storage.items.has("shelfie:cart:kamal")).toBe(false);
  });

  it("returns the same snapshot until something changes", () => {
    const storage = fakeStorage({ k: encodeCart(cart, NOW)! });
    const store = createCartStore("k", { storage: () => storage, now: () => NOW });
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("still works when storage is blocked", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    const store = createCartStore("k", { storage: blocked, now: () => NOW });
    expect(store.getSnapshot()).toBe(EMPTY_CART);
    store.update((current) => withQuantity(current, rice, 1));
    expect(store.getSnapshot().quantities).toEqual({ [rice]: 1 });
  });

  it("keeps a preview's cart in memory only", () => {
    const storage = fakeStorage();
    const store = createCartStore(null, { storage: () => storage, now: () => NOW });
    store.update((current) => withQuantity(current, rice, 1));
    expect(store.getSnapshot().quantities).toEqual({ [rice]: 1 });
    expect(storage.items.size).toBe(0);
  });
});
