// Ordering happens in the chat apps sellers already use. We never touch payments.
import type { PriceUnit } from "@/domain/product";
import type { FulfillmentMethod } from "@/domain/store";
import { quantityWithUnit } from "./format";

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

// LINE official accounts (@id) accept a prefilled message; personal IDs don't.
export function lineLink(lineId: string, text?: string): string {
  const id = lineId.trim();
  if (id.startsWith("@")) {
    return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/${text ? `?${encodeURIComponent(text)}` : ""}`;
  }
  return `https://line.me/ti/p/~${encodeURIComponent(id)}`;
}

// unit: what the quantity counts ("2 kg × Mango"); items when missing.
export type OrderLine = { name: string; quantity: number; unit?: PriceUnit; lineTotal: number | null };

// How the customer gets the order. The address is optional free text.
export type OrderFulfillment = { method: FulfillmentMethod; address?: string };

export function orderMessage(input: {
  storeName: string;
  lines: OrderLine[];
  total: string | null;
  formatLineTotal: (amount: number) => string;
  fulfillment?: OrderFulfillment;
}): string {
  const items = input.lines.map((line) => {
    const price = line.lineTotal === null ? "" : ` (${input.formatLineTotal(line.lineTotal)})`;
    return `• ${quantityWithUnit(line.quantity, line.unit ?? "each")} × ${line.name}${price}`;
  });
  return [
    `Hi ${input.storeName}! I'd like to order:`,
    ...items,
    input.total ? `Total: ${input.total}` : null,
    input.fulfillment ? fulfillmentLine(input.fulfillment) : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function fulfillmentLine({ method, address }: OrderFulfillment): string {
  if (method === "pickup") return "I'll pick it up.";
  const where = address?.trim().replace(/\s+/g, " ");
  return where ? `Please deliver to: ${where}` : "Please deliver it. I'll send the address.";
}
