// Ordering happens in the chat apps sellers already use. We never touch payments.

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

export type OrderLine = { name: string; quantity: number; lineTotal: number | null };

export function orderMessage(input: {
  storeName: string;
  lines: OrderLine[];
  total: string | null;
  formatLineTotal: (amount: number) => string;
}): string {
  const items = input.lines.map((line) => {
    const price = line.lineTotal === null ? "" : ` (${input.formatLineTotal(line.lineTotal)})`;
    return `• ${line.quantity} × ${line.name}${price}`;
  });
  return [
    `Hi ${input.storeName}! I'd like to order:`,
    ...items,
    input.total ? `Total: ${input.total}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
