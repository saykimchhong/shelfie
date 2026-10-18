import { describe, expect, it } from "vitest";
import type { Product } from "@/domain/product";
import type { PublicStore } from "@/domain/store";
import { orderMethod, summarizeOrder } from "./order";

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
  const lines = [{ product: rice, quantity: 2 }];

  it("treats stores without the setting as pickup", () => {
    const summary = summarizeOrder(store, lines);
    expect(summary.method).toBe("pickup");
    expect(message(summary.whatsappHref)).toMatch(/I'll pick it up\.$/);
  });

  it("puts the customer's delivery address in the message when the store offers both", () => {
    const summary = summarizeOrder({ ...store, fulfillment: "both" }, lines, { method: "delivery", address: "Colombo 3" });
    expect(summary.method).toBe("delivery");
    expect(message(summary.whatsappHref)).toMatch(/Please deliver to: Colombo 3$/);
  });

  it("ignores a typed address for pickup", () => {
    const summary = summarizeOrder({ ...store, fulfillment: "both" }, lines, { method: "pickup", address: "Colombo 3" });
    expect(message(summary.whatsappHref)).not.toContain("Colombo 3");
  });
});
