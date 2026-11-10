import { describe, expect, it } from "vitest";
import type { Product } from "@/domain/product";
import { toPublicStore, toStore } from "@/lib/firebase/convert";
import { DEFAULT_CHOICE, summarizeOrder } from "./order";

// Firestore store doc → public store → order message.

const doc = {
  ownerId: "seller",
  name: "Kamal Stores",
  currency: "LKR",
  labelLanguage: "si",
  contact: { whatsapp: "+94 77 123 4567" },
  published: true,
  createdAt: 0,
  updatedAt: 0,
};

const QR_URL =
  "https://firebasestorage.googleapis.com/v0/b/demo.firebasestorage.app/o/sellers%2Fseller%2Fstores%2Fkamal-stores%2Fpayment%2Fqr.webp?alt=media";

const rice: Product = { id: "rice", name: "Rice", price: 250, inStock: true, position: 0, createdAt: 0, updatedAt: 0 };

const orderText = (href: string | null) => new URL(href!).searchParams.get("text")!;

describe("store docs to the public storefront", () => {
  it("reads stores saved before pickup/delivery and payment QR existed", () => {
    const store = toStore("kamal-stores", doc)!;
    expect(store).not.toBeNull();
    expect(store.fulfillment).toBeUndefined();
    expect(store.paymentQrUrl).toBeUndefined();
    expect(orderText(summarizeOrder(toPublicStore(store), [{ key: rice.id, product: rice, quantity: 1 }]).whatsappHref)).toMatch(
      /I'll pick it up\.$/,
    );
  });

  it("passes the pickup/delivery offer and payment QR to the public store, without the owner", () => {
    const store = toStore("kamal-stores", { ...doc, fulfillment: "both", paymentQrUrl: QR_URL })!;
    const publicStore = toPublicStore(store);
    expect(publicStore).toMatchObject({ fulfillment: "both", paymentQrUrl: QR_URL });
    expect(publicStore).not.toHaveProperty("ownerId");
  });

  it("orders for delivery from a delivery-only store, whatever the cart's default choice", () => {
    const store = toPublicStore(toStore("kamal-stores", { ...doc, fulfillment: "delivery" })!);
    const summary = summarizeOrder(store, [{ key: rice.id, product: rice, quantity: 1 }], DEFAULT_CHOICE);
    expect(summary.method).toBe("delivery");
    expect(orderText(summary.whatsappHref)).toMatch(/Please deliver it\. I'll send the address\.$/);
  });

  it("keeps an inline payment QR (the no-Storage-bucket fallback)", () => {
    const inline = "data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
    expect(toStore("kamal-stores", { ...doc, paymentQrUrl: inline })?.paymentQrUrl).toBe(inline);
  });

  it("caps a delivery address in the order message", () => {
    const store = toPublicStore(toStore("kamal-stores", { ...doc, fulfillment: "both" })!);
    const summary = summarizeOrder(store, [{ key: rice.id, product: rice, quantity: 1 }], {
      ...DEFAULT_CHOICE,
      method: "delivery",
      address: "x".repeat(500),
    });
    expect(orderText(summary.whatsappHref)).toMatch(/Please deliver to: x{200}$/);
  });
});
