import { describe, expect, it } from "vitest";
import type { Product } from "@/domain/product";
import type { PublicStore } from "@/domain/store";
import { cartLines, DEFAULT_CHOICE, lineKey, orderMethod, quantityOf, summarizeOrder, whenLabel } from "./order";

const store: PublicStore = {
  slug: "kamal-stores",
  name: "Kamal Stores",
  currency: "LKR",
  labelLanguage: "si",
  contact: { whatsapp: "+94 77 123 4567" },
  published: true,
  createdAt: 0,
  updatedAt: 0,
};

const rice: Product = {
  id: "rice",
  name: "Rice",
  price: 250,
  inStock: true,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

const message = (href: string | null) => decodeURIComponent(new URL(href!).searchParams.get("text")!);

describe("orderMethod", () => {
  it("uses the store's only option, or the customer's pick when it offers both", () => {
    expect(orderMethod("pickup", "delivery")).toBe("pickup");
    expect(orderMethod("delivery", "pickup")).toBe("delivery");
    expect(orderMethod("both", "delivery")).toBe("delivery");
  });
});

describe("summarizeOrder", () => {
  const lines = [{ key: rice.id, product: rice, quantity: 2 }];

  it("treats stores without the setting as pickup", () => {
    const summary = summarizeOrder(store, lines);
    expect(summary.method).toBe("pickup");
    expect(message(summary.whatsappHref)).toMatch(/I'll pick it up\.$/);
  });

  it("puts the customer's delivery address in the message when the store offers both", () => {
    const summary = summarizeOrder({ ...store, fulfillment: "both" }, lines, { ...DEFAULT_CHOICE, method: "delivery", address: "Colombo 3" });
    expect(summary.method).toBe("delivery");
    expect(message(summary.whatsappHref)).toMatch(/Please deliver to: Colombo 3$/);
  });

  it("ignores a typed address for pickup", () => {
    const summary = summarizeOrder({ ...store, fulfillment: "both" }, lines, { ...DEFAULT_CHOICE, method: "pickup", address: "Colombo 3" });
    expect(message(summary.whatsappHref)).not.toContain("Colombo 3");
  });
});

describe("summarizeOrder units", () => {
  it("uses the shop's default unit in the message", () => {
    const summary = summarizeOrder({ ...store, priceUnit: "kg" }, [{ key: rice.id, product: rice, quantity: 2 }]);
    expect(message(summary.whatsappHref)).toContain("• 2 kg × Rice");
  });
});

describe("food orders", () => {
  const cafe: PublicStore = { ...store, shopType: "food" };
  const coffee: Product = { ...rice, id: "coffee", name: "Iced Coffee" };
  const now = new Date(2025, 10, 12, 10, 0);

  it("adds each item's note and when the customer wants it", () => {
    const summary = summarizeOrder(cafe, [{ key: coffee.id, product: coffee, quantity: 2, note: "  no   ice " }], DEFAULT_CHOICE, { now });
    expect(message(summary.whatsappHref)).toMatch(/• 2 × Iced Coffee \(Rs\s500\) – no ice/u);
    expect(message(summary.whatsappHref)).toMatch(/When: as soon as possible$/);
  });

  it("says the picked time in words", () => {
    const later = { ...DEFAULT_CHOICE, when: "later" as const, at: "2025-11-13T09:00" };
    expect(message(summarizeOrder(cafe, [{ key: coffee.id, product: coffee, quantity: 1 }], later, { now }).whatsappHref)).toMatch(
      /When: tomorrow at 09:00$/,
    );
  });

  it("asks for it when the shop opens if it's closed now", () => {
    const summary = summarizeOrder(cafe, [{ key: coffee.id, product: coffee, quantity: 1 }], DEFAULT_CHOICE, { now, closed: true });
    expect(message(summary.whatsappHref)).toMatch(/When: when you open$/);
  });

  it("doesn't ask when for shop types that don't need it", () => {
    expect(message(summarizeOrder(store, [{ key: rice.id, product: rice, quantity: 1 }], DEFAULT_CHOICE, { now }).whatsappHref)).not.toContain(
      "When:",
    );
  });
});

describe("whenLabel", () => {
  const now = new Date(2025, 10, 12, 22, 0);
  it("says today, tomorrow, or the day and date", () => {
    expect(whenLabel("2025-11-12T23:15", now)).toBe("today at 23:15");
    expect(whenLabel("2025-11-13T07:00", now)).toBe("tomorrow at 07:00");
    expect(whenLabel("2025-11-15T12:30", now)).toBe("Sat 15 Nov at 12:30");
  });
});

describe("sizes and colours", () => {
  const shirt: Product = { ...rice, id: "shirt", name: "Linen Shirt", position: 1, sizes: ["S", "M"], colors: ["Black"] };
  const products = [rice, shirt];
  const quantities = {
    [lineKey("shirt", { size: "M", color: "Black" })]: 1,
    [lineKey("rice")]: 2,
    [lineKey("shirt", { size: "S", color: "Black" })]: 2,
    [lineKey("gone")]: 1,
  };

  it("keeps one cart line per size and colour, in shelf order", () => {
    const lines = cartLines(products, quantities);
    expect(lines.map(({ product, variant, quantity }) => [product.id, variant, quantity])).toEqual([
      ["rice", undefined, 2],
      ["shirt", { size: "M", color: "Black" }, 1],
      ["shirt", { size: "S", color: "Black" }, 2],
    ]);
    expect(quantityOf(lines, "shirt")).toBe(3);
  });

  it("names the choice in the order message", () => {
    const summary = summarizeOrder(store, cartLines(products, quantities));
    expect(message(summary.whatsappHref)).toMatch(/• 1 × Linen Shirt \(Size M, Black\)/);
  });
});
