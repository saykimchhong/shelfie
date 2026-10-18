import { describe, expect, it } from "vitest";
import { orderMessage } from "./contact";

const base = {
  storeName: "Kamal Stores",
  lines: [{ name: "Rice 5kg", quantity: 2, lineTotal: 500 }],
  total: "Rs 500",
  formatLineTotal: (amount: number) => `Rs ${amount}`,
};

describe("orderMessage", () => {
  it("lists the items and total", () => {
    expect(orderMessage(base)).toBe("Hi Kamal Stores! I'd like to order:\n• 2 × Rice 5kg (Rs 500)\nTotal: Rs 500");
  });

  it("says when the customer will pick it up", () => {
    expect(orderMessage({ ...base, fulfillment: { method: "pickup" } })).toMatch(/\nI'll pick it up\.$/);
  });

  it("adds the delivery address on one tidy line", () => {
    const message = orderMessage({ ...base, fulfillment: { method: "delivery", address: "  12 Galle Rd,\n Colombo 3 " } });
    expect(message).toMatch(/\nPlease deliver to: 12 Galle Rd, Colombo 3$/);
  });

  it("asks for delivery without an address when none is given", () => {
    const message = orderMessage({ ...base, fulfillment: { method: "delivery", address: "   " } });
    expect(message).toMatch(/\nPlease deliver it\. I'll send the address\.$/);
  });
});
