import type { Product } from "@/domain/product";
import {
  DEFAULT_FULFILLMENT,
  DELIVERY_ADDRESS_MAX,
  type FulfillmentMethod,
  type FulfillmentOffer,
  type PublicStore,
} from "@/domain/store";
import { lineLink, orderMessage, whatsappLink } from "@/lib/contact";
import { formatPrice } from "@/lib/format";

export type CartLine = { product: Product; quantity: number };

// What the customer chose in the cart. Only used when the store offers both.
export type FulfillmentChoice = { method: FulfillmentMethod; address: string };

export const DEFAULT_CHOICE: FulfillmentChoice = { method: "pickup", address: "" };

// The store's only option, or the customer's pick when it offers both.
export function orderMethod(offer: FulfillmentOffer, picked: FulfillmentMethod): FulfillmentMethod {
  return offer === "both" ? picked : offer;
}

export type OrderSummary = {
  count: number;
  // "$12.50", "$12.50+" when some items have no price yet, or null when none do.
  total: string | null;
  whatsappHref: string | null;
  lineHref: string | null;
  // How this order would be fulfilled, given the store's offer and the choice.
  method: FulfillmentMethod;
};

// Everything the order bar and the cart sheet need, from one place.
export function summarizeOrder(
  store: PublicStore,
  lines: CartLine[],
  choice: FulfillmentChoice = DEFAULT_CHOICE,
): OrderSummary {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (line.product.price ?? 0) * line.quantity, 0);
  const hasUnpriced = lines.some((line) => line.product.price === null);
  const price = (amount: number) => formatPrice(amount, store.currency);
  const total = subtotal > 0 ? `${price(subtotal)}${hasUnpriced ? "+" : ""}` : null;
  const method = orderMethod(store.fulfillment ?? DEFAULT_FULFILLMENT, choice.method);

  const message = orderMessage({
    storeName: store.name,
    lines: lines.map((line) => ({
      name: line.product.name,
      quantity: line.quantity,
      lineTotal: line.product.price === null ? null : line.product.price * line.quantity,
    })),
    total,
    formatLineTotal: price,
    fulfillment: {
      method,
      address: method === "delivery" ? choice.address.slice(0, DELIVERY_ADDRESS_MAX) : undefined,
    },
  });

  return {
    count,
    total,
    whatsappHref: store.contact.whatsapp ? whatsappLink(store.contact.whatsapp, message) : null,
    lineHref: store.contact.line ? lineLink(store.contact.line, message) : null,
    method,
  };
}
