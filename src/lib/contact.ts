// Ordering happens in the chat apps sellers already use. We never touch payments.
import type { PriceUnit } from "@/domain/product";
import type { FulfillmentMethod } from "@/domain/store";
import { wordsFor, type Words } from "./words";

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
// note: the customer's request for this item, e.g. "no ice".
export type OrderLine = { name: string; quantity: number; unit?: PriceUnit; lineTotal: number | null; note?: string };

// How the customer gets the order. The address is optional free text; when is
// already worded, e.g. "as soon as possible" or "tomorrow at 09:00".
export type OrderFulfillment = { method: FulfillmentMethod; address?: string; when?: string };

export const ORDER_NOTE_MAX = 80;

const oneLine = (text: string | undefined) => text?.trim().replace(/\s+/g, " ") ?? "";

export function orderMessage(input: {
  storeName: string;
  lines: OrderLine[];
  total: string | null;
  formatLineTotal: (amount: number) => string;
  fulfillment?: OrderFulfillment;
  // The seller's language; English when left out.
  words?: Words["message"];
}): string {
  const words = input.words ?? wordsFor("en").message;
  const items = input.lines.map((line) => {
    const price = line.lineTotal === null ? "" : ` (${input.formatLineTotal(line.lineTotal)})`;
    const note = oneLine(line.note).slice(0, ORDER_NOTE_MAX);
    return `• ${words.quantity(line.quantity, line.unit ?? "each")} × ${line.name}${price}${note ? ` – ${note}` : ""}`;
  });
  return [
    words.greeting(input.storeName),
    ...items,
    input.total ? words.total(input.total) : null,
    input.fulfillment ? fulfillmentLine(input.fulfillment, words) : null,
    input.fulfillment?.when ? words.when(input.fulfillment.when) : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function fulfillmentLine({ method, address }: OrderFulfillment, words: Words["message"]): string {
  if (method === "pickup") return words.pickup;
  const where = oneLine(address);
  return where ? words.deliverTo(where) : words.deliver;
}
