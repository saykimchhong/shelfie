import type { Product } from "@/domain/product";
import type { PublicStore } from "@/domain/store";
import { lineLink, orderMessage, whatsappLink } from "@/lib/contact";
import { formatPrice } from "@/lib/format";

export type CartLine = { product: Product; quantity: number };

export type OrderSummary = {
  count: number;
  // "$12.50", "$12.50+" when some items have no price yet, or null when none do.
  total: string | null;
  whatsappHref: string | null;
  lineHref: string | null;
};

// Everything the order bar and the cart sheet need, from one place.
export function summarizeOrder(store: PublicStore, lines: CartLine[]): OrderSummary {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (line.product.price ?? 0) * line.quantity, 0);
  const hasUnpriced = lines.some((line) => line.product.price === null);
  const price = (amount: number) => formatPrice(amount, store.currency);
  const total = subtotal > 0 ? `${price(subtotal)}${hasUnpriced ? "+" : ""}` : null;

  const message = orderMessage({
    storeName: store.name,
    lines: lines.map((line) => ({
      name: line.product.name,
      quantity: line.quantity,
      lineTotal: line.product.price === null ? null : line.product.price * line.quantity,
    })),
    total,
    formatLineTotal: price,
  });

  return {
    count,
    total,
    whatsappHref: store.contact.whatsapp ? whatsappLink(store.contact.whatsapp, message) : null,
    lineHref: store.contact.line ? lineLink(store.contact.line, message) : null,
  };
}
