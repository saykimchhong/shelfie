import { z } from "zod";
import { priceUnitSchema } from "./product";

// Shop assistant: the seller chats ("Coke is 25 now", "what is sold out?"), the
// AI answers and proposes product changes, and the seller saves them.

export const MAX_UPDATE_TEXT = 500;
export const MAX_UPDATE_SECONDS = 60;
// 60 s of 16 kHz mono 16-bit WAV is about 1.9 MB.
export const MAX_UPDATE_AUDIO_BYTES = 2.5 * 1024 * 1024;
export const MAX_UPDATE_PRODUCTS = 500;
// The browser keeps the chat and sends the last turns back; the server keeps nothing.
export const MAX_CHAT_TURNS = 12;
export const MAX_TURN_TEXT = 800;
export const MAX_WAITING_CHANGES = 60;

// A shop product as the AI sees it. `unit` is already resolved (unitOf).
export const listedProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  localName: z.string().optional(),
  price: z.number().nullable(),
  unit: priceUnitSchema,
  inStock: z.boolean(),
});

export type ListedProduct = z.infer<typeof listedProductSchema>;
export const listedProductsSchema = z.array(listedProductSchema).max(MAX_UPDATE_PRODUCTS);

const nameSchema = z.string().trim().min(1).max(120);

// Only the fields that change.
export const productEditSchema = z.object({
  name: nameSchema.optional(),
  localName: nameSchema.optional(),
  price: z.number().nonnegative().optional(),
  unit: priceUnitSchema.optional(),
  inStock: z.boolean().optional(),
});

export type ProductEdit = z.infer<typeof productEditSchema>;

export const newProductSchema = z.object({
  name: nameSchema,
  localName: nameSchema.nullable(),
  price: z.number().nonnegative().nullable(),
  unit: priceUnitSchema.nullable(),
});

export type NewProduct = z.infer<typeof newProductSchema>;

export const productChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("update"), id: z.string(), edit: productEditSchema }),
  z.object({ kind: z.literal("add"), product: newProductSchema }),
  z.object({ kind: z.literal("remove"), id: z.string() }),
]);

export type ProductChange = z.infer<typeof productChangeSchema>;

// Changes the seller hasn't saved yet. They ride along with the next message.
export const waitingChangesSchema = z.array(productChangeSchema).max(MAX_WAITING_CHANGES);

export const chatTurnSchema = z.object({
  role: z.enum(["owner", "assistant"]),
  text: z.string().min(1).max(MAX_TURN_TEXT),
});

export type ChatTurn = z.infer<typeof chatTurnSchema>;
export const chatHistorySchema = z.array(chatTurnSchema).max(MAX_CHAT_TURNS);

const per = (unit: string) => (unit === "each" ? "each" : `per ${unit}`);

// One change in plain words, for the AI's notes: "Milo 400g: price 99, sold out".
export function describeChange(change: ProductChange, name: string): string {
  if (change.kind === "remove") return `remove ${name}`;
  if (change.kind === "add") {
    const { name: added, localName, price, unit } = change.product;
    const label = localName ? `${added} (${localName})` : added;
    return `new product ${label}: ${price === null ? "no price" : `price ${price}`}${unit ? `, ${per(unit)}` : ""}`;
  }
  const { edit } = change;
  const parts = [
    edit.name ? `renamed to ${edit.name}` : null,
    edit.localName ? `label ${edit.localName}` : null,
    edit.price !== undefined ? `price ${edit.price}` : null,
    edit.unit ? per(edit.unit) : null,
    edit.inStock === undefined ? null : edit.inStock ? "back in stock" : "sold out",
  ].filter(Boolean);
  return `${name}: ${parts.join(", ")}`;
}

// What POST /api/updates returns.
export const updatesResponseSchema = z.object({
  provider: z.enum(["mock", "gemini"]),
  // A voice note written out, so the seller sees what the AI heard.
  heard: z.string().nullable(),
  // The assistant's answer, in the seller's language.
  reply: z.string(),
  // Every change waiting to be saved: earlier unsaved ones plus this message's.
  changes: z.array(productChangeSchema),
});

export type UpdatesResponse = z.infer<typeof updatesResponseSchema>;
