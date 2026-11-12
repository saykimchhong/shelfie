import { z } from "zod";
import { ORDER_NOTE_MAX } from "@/lib/contact";
import { isLineKey } from "./order";

// The customer's cart: quantities and notes by cart line (see lineKey).
// sentAt is set when they tap Order, and cleared by the next change.
export type Cart = {
  quantities: Readonly<Record<string, number>>;
  notes: Readonly<Record<string, string>>;
  sentAt?: number;
};

export const EMPTY_CART: Cart = { quantities: {}, notes: {} };

const HOUR_MS = 60 * 60 * 1000;
// An unsent cart is still wanted a few days later; a sent one isn't for long.
export const KEEP_MS = 3 * 24 * HOUR_MS;
export const KEEP_SENT_MS = HOUR_MS / 2;

export function withQuantity(cart: Cart, key: string, quantity: number): Cart {
  const quantities = { ...cart.quantities };
  const notes = { ...cart.notes };
  if (quantity > 0) quantities[key] = quantity;
  else {
    delete quantities[key];
    delete notes[key];
  }
  return { quantities, notes };
}

export function withNote(cart: Cart, key: string, note: string): Cart {
  const notes = { ...cart.notes };
  if (note) notes[key] = note;
  else delete notes[key];
  return { quantities: cart.quantities, notes };
}

export function markSent(cart: Cart, now: number): Cart {
  return { ...cart, sentAt: now };
}

const savedSchema = z.object({
  savedAt: z.number(),
  sentAt: z.number().optional(),
  quantities: z.record(z.string(), z.number().positive().max(999)),
  notes: z.record(z.string(), z.string().max(ORDER_NOTE_MAX)),
});

// What goes in the browser's storage; null for an empty cart (nothing to keep).
export function encodeCart(cart: Cart, now: number): string | null {
  if (Object.keys(cart.quantities).length === 0) return null;
  return JSON.stringify({ ...cart, savedAt: now } satisfies z.infer<typeof savedSchema>);
}

// Anything unreadable, too old or already ordered comes back as an empty cart.
export function decodeCart(raw: string | null, now: number): Cart {
  if (!raw) return EMPTY_CART;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_CART;
  }
  const saved = savedSchema.safeParse(json);
  if (!saved.success) return EMPTY_CART;

  const { savedAt, sentAt, quantities, notes } = saved.data;
  if (now - savedAt > KEEP_MS) return EMPTY_CART;
  if (sentAt !== undefined && now - sentAt > KEEP_SENT_MS) return EMPTY_CART;

  const keys = Object.keys(quantities).filter(isLineKey);
  if (keys.length === 0) return EMPTY_CART;
  return {
    quantities: Object.fromEntries(keys.map((key) => [key, quantities[key]])),
    notes: Object.fromEntries(keys.filter((key) => notes[key]).map((key) => [key, notes[key]])),
    ...(sentAt === undefined ? {} : { sentAt }),
  };
}

export type CartStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Cart;
  getServerSnapshot: () => Cart;
  update: (change: (cart: Cart) => Cart) => void;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

// One shop's cart. With a storage key it's kept on this phone, and follows
// the same shop open in another tab; without one it lives in memory only.
export function createCartStore(
  key: string | null,
  { storage = browserStorage, now = Date.now }: { storage?: () => Storage | null; now?: () => number } = {},
): CartStore {
  let cart = EMPTY_CART;
  let loaded = key === null;
  const listeners = new Set<() => void>();

  // Private windows and blocked site data throw: the cart then just isn't kept.
  function load() {
    try {
      cart = decodeCart(storage()?.getItem(key!) ?? null, now());
    } catch {
      cart = EMPTY_CART;
    }
    loaded = true;
  }

  function save() {
    if (key === null) return;
    try {
      const encoded = encodeCart(cart, now());
      if (encoded === null) storage()?.removeItem(key);
      else storage()?.setItem(key, encoded);
    } catch {}
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== key) return;
    load();
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener) {
      if (key !== null && listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (key !== null && listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      if (!loaded) load();
      return cart;
    },
    getServerSnapshot: () => EMPTY_CART,
    update(change) {
      if (!loaded) load();
      cart = change(cart);
      save();
      listeners.forEach((listener) => listener());
    },
  };
}

export function cartStorageKey(slug: string): string {
  return `shelfie:cart:${slug}`;
}

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
