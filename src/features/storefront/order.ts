import { unitOf, type Product } from "@/domain/product";
import { shopTypeOf } from "@/domain/shop";
import {
  DEFAULT_FULFILLMENT,
  DELIVERY_ADDRESS_MAX,
  type FulfillmentMethod,
  type FulfillmentOffer,
  type PublicStore,
} from "@/domain/store";
import { lineLink, orderMessage, whatsappLink } from "@/lib/contact";
import { formatPrice } from "@/lib/format";

export type CartLine = { product: Product; quantity: number; note?: string };

// What the customer chose in the cart. method only matters when the store
// offers both; when/at only for shop types that ask for a time.
export type FulfillmentChoice = {
  method: FulfillmentMethod;
  address: string;
  when: "soon" | "later";
  // A datetime-local value, "2025-11-15T12:30".
  at: string;
};

export const DEFAULT_CHOICE: FulfillmentChoice = { method: "pickup", address: "", when: "soon", at: "" };

const DAY_MS = 24 * 60 * 60 * 1000;

// "today at 12:30", "tomorrow at 09:00", "Sat 15 Nov at 12:30".
export function whenLabel(at: string, now: Date): string {
  const [date, time] = at.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const picked = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((picked.getTime() - today.getTime()) / DAY_MS);
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  const named = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(picked);
  return `${named} at ${time}`;
}

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
// closed: the shop is closed right now, so "soon" means when it opens.
export function summarizeOrder(
  store: PublicStore,
  lines: CartLine[],
  choice: FulfillmentChoice = DEFAULT_CHOICE,
  { now, closed = false }: { now?: Date; closed?: boolean } = {},
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
      unit: unitOf(line.product, store.priceUnit),
      lineTotal: line.product.price === null ? null : line.product.price * line.quantity,
      note: line.note,
    })),
    total,
    formatLineTotal: price,
    fulfillment: {
      method,
      address: method === "delivery" ? choice.address.slice(0, DELIVERY_ADDRESS_MAX) : undefined,
      when: shopTypeOf(store).orderTime ? orderWhen(choice, now, closed) : undefined,
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

// The clock is read only for a picked time: prerendering forbids new Date().
function orderWhen(choice: FulfillmentChoice, now: Date | undefined, closed: boolean): string {
  if (choice.when === "later" && choice.at) return whenLabel(choice.at, now ?? new Date());
  return closed ? "when you open" : "as soon as possible";
}
