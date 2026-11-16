import "server-only";
import { LlmAgent } from "@google/adk";
import { createPartFromBase64, createUserContent, type Part, type ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { PRICE_UNIT_GUIDE, PRICE_UNITS } from "@/domain/product";
import { aboutShop, type ShopType } from "@/domain/shop";
import { LANGUAGE_NAMES, type Currency, type LabelLanguage } from "@/domain/store";
import {
  describeChange,
  MAX_TURN_TEXT,
  type ChatTurn,
  type ListedProduct,
  type NewProduct,
  type ProductChange,
  type ProductEdit,
} from "@/domain/updates";
import { geminiModel, runWorkflow } from "@/server/adk";

// Shop assistant: answers the owner's message and turns it into product changes.

export const readerSchema = z.object({
  heard: z
    .string()
    .nullable()
    .describe("For a voice note: what the owner said, written out in the language they spoke. null for typed text."),
  changes: z.array(
    z.object({
      action: z.enum(["update", "add", "remove", "cancel"]),
      product: z
        .number()
        .int()
        .nullable()
        .describe("The listed product's number, for update, remove and cancel. null for add."),
      name: z
        .string()
        .nullable()
        .describe("update: the new name, only when renamed. add: the new product's name. cancel: a waiting new product's name."),
      localName: z
        .string()
        .nullable()
        .describe("update: the new label-language name, only when renamed. add: the name in the label language."),
      price: z.number().nullable().describe("The new price, only when said."),
      unit: z
        .enum(PRICE_UNITS)
        .nullable()
        .describe(`update: the new unit, only when the owner says it. add: always set. ${PRICE_UNIT_GUIDE}`),
      inStock: z.boolean().nullable().describe("false when sold out, true when back in stock, null when not said."),
    }),
  ),
  reply: z
    .string()
    .describe("Your short answer, in the language of the owner's latest message (English for English). Plain text."),
});

export type ReaderOutput = z.infer<typeof readerSchema>;

export type ShopSettings = { currency: Currency; labelLanguage: LabelLanguage; shopType?: ShopType };

export type UpdateMessage = { text: string } | { audio: Blob };

// What the chat remembers: earlier turns, and changes not saved yet.
export type ChatMemory = { history?: readonly ChatTurn[]; waiting?: readonly ProductChange[] };

function instruction({ currency, labelLanguage, shopType }: ShopSettings): string {
  const language = LANGUAGE_NAMES[labelLanguage];
  return `You are the assistant of a small shop, chatting with its owner. You answer questions about the product list and keep it up to date. Messages are typed or voice notes, often mixing ${language} and English.
${aboutShop(shopType)}The shop's products are listed, numbered, with their real values right now. Prices are in ${currency}.

Changes. You save nothing yourself: the app shows your changes to the owner, who saves them with a button. "Waiting changes" are ones from earlier in this chat that the owner hasn't saved yet. Return only what this message adds or corrects. Waiting changes stay as they are unless you correct or cancel them.
- update: a listed product changes. Fill only what the owner asked to change (name, localName, price, unit, inStock) and leave the rest null. Naming a product to point at it is not a rename.
- add: a product that isn't listed. Give its name in English, localName in ${language} when said, its price when said, and always its unit.
- remove: the owner stops selling a listed product. Sold out is not remove: it is update with inStock false.
- cancel: the owner takes back a waiting change ("no, leave the Coke", "forget that one"). Give the product's number, or the name of a waiting new product. A correction is not a cancel: "no, make it 30" is an update with the new price.
- Match products by meaning: names may be short, misspelled, translated or said differently.
- "it", "that one", "the same" and "also" point at the earlier messages and the waiting changes.
- Prices are plain numbers in ${currency}: "25", "twenty five" and "25 baht" are all 25. Never convert currency.
- inStock is false for sold out, finished or none left, and true for back in stock or restocked.
- When a name fits more than one listed product ("Coke" with both a bottle and a can listed), or you are not sure, don't guess and don't change them all: return no change for it and ask which one in reply, naming the choices. When the owner then answers, make the change they first asked for. A plural or "all" ("all the Cokes") does mean every one.
- Never invent changes the owner didn't ask for. When a product already has the value asked for, return no change and say so.

Reply. Always write one, in short plain words. No markdown.
- Write in the language of the owner's latest message, whatever the shop's label language is: English gets English, ${language} gets ${language}.
- Call products by their listed names. Never mention their numbers.
- A question: answer from the product list (what is sold out, a price, what has no price, how many products, the cheapest). Put each product on its own line, at most 12, then say how many more there are.
- Changes: say in one short line what is ready, and ask the owner to check it and tap "Save" (keep that button name in English). Don't repeat every detail, the app shows the list. Nothing is changed until the owner saves, so say "ready", never "changed", "updated", "done" or "saved".
- You only know the product list. You don't know how many of each are left, or anything about sales, orders or customers. Say so simply when asked.
- You can change names, prices, units and in stock or sold out, add products and remove them. Anything else (photos, categories, sizes, opening hours, the shop's look) is done on the dashboard: tap the product, or "Edit store".
- Notes in [square brackets] in earlier messages say what the owner saved or didn't save.`;
}

function describeProducts(products: readonly ListedProduct[], currency: Currency): string {
  if (products.length === 0) return "The shop has no products yet.";
  const lines = products.map((product, index) => {
    const name = product.localName ? `${product.name} (${product.localName})` : product.name;
    const price = product.price === null ? "no price" : `${product.price} ${currency} ${product.unit === "each" ? "each" : `per ${product.unit}`}`;
    return `${index + 1}. ${name}: ${price}, ${product.inStock ? "in stock" : "sold out"}`;
  });
  return `Products:\n${lines.join("\n")}`;
}

function describeHistory(history: readonly ChatTurn[]): string | null {
  if (history.length === 0) return null;
  const lines = history.map((turn) => `${turn.role === "owner" ? "Owner" : "You"}: ${turn.text}`);
  return `Earlier in this chat, oldest first:\n${lines.join("\n")}`;
}

function describeWaiting(waiting: readonly ProductChange[], products: readonly ListedProduct[]): string | null {
  const lines = waiting.flatMap((change) => {
    if (change.kind === "add") return [`- ${describeChange(change, "")}`];
    const index = products.findIndex((product) => product.id === change.id);
    return index < 0 ? [] : [`- ${describeChange(change, `product ${index + 1} (${products[index].name})`)}`];
  });
  return lines.length > 0 ? `Waiting changes, not saved yet:\n${lines.join("\n")}` : null;
}

async function messageParts(message: UpdateMessage): Promise<Part[]> {
  // Said last, next to the message, or the shop's own language wins.
  const language = { text: "Write your reply in the language of this message, not the language of the product list." };
  if ("text" in message) return [{ text: `The owner typed:\n${message.text}` }, language];
  const base64 = Buffer.from(await message.audio.arrayBuffer()).toString("base64");
  return [{ text: "The owner's voice note:" }, createPartFromBase64(base64, message.audio.type || "audio/wav"), language];
}

export async function readUpdate(
  message: UpdateMessage,
  products: readonly ListedProduct[],
  settings: ShopSettings,
  { thinkingLevel, history = [], waiting = [] }: { thinkingLevel?: ThinkingLevel } & ChatMemory = {},
): Promise<{ heard: string | null; reply: string; changes: ProductChange[] }> {
  const reader = new LlmAgent({
    name: "updateReader",
    description: "Answers the owner and turns their message into product changes.",
    model: geminiModel(),
    instruction: instruction(settings),
    outputSchema: readerSchema,
    generateContentConfig: thinkingLevel ? { thinkingConfig: { thinkingLevel } } : undefined,
  });
  const context = [describeProducts(products, settings.currency), describeHistory(history), describeWaiting(waiting, products)];
  const parts = [...context.flatMap((text) => (text ? [{ text }] : [])), ...(await messageParts(message))];
  const output = await runWorkflow("updateReader", (run) => run(reader, createUserContent(parts)));
  const parsed = readerSchema.parse(output);
  return {
    heard: "audio" in message ? clean(parsed.heard) : null,
    reply: parsed.reply.trim().slice(0, MAX_TURN_TEXT),
    changes: toChanges(parsed, products, waiting),
  };
}

const clean = (value: string | null | undefined) => value?.trim() || null;
const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
const validPrice = (price: number | null) => (price !== null && Number.isFinite(price) && price >= 0 ? price : null);

type Change = ReaderOutput["changes"][number];

// A waiting edit, replayed as an earlier mention of the product.
const asMention = (index: number, edit: ProductEdit): Change => ({
  action: "update",
  product: index + 1,
  name: edit.name ?? null,
  localName: edit.localName ?? null,
  price: edit.price ?? null,
  unit: edit.unit ?? null,
  inStock: edit.inStock ?? null,
});

// Keeps only real differences from the list. Waiting changes go first, so this message can correct them.
export function toChanges(
  output: Pick<ReaderOutput, "changes">,
  products: readonly ListedProduct[],
  waiting: readonly ProductChange[] = [],
): ProductChange[] {
  const edits = new Map<number, Change[]>();
  const removed = new Set<number>();
  // Removals waiting from before: a new update to the product takes them back.
  const carried = new Set<number>();
  let added: NewProduct[] = [];
  const editOf = (index: number, change: Change) => edits.set(index, [...(edits.get(index) ?? []), change]);

  for (const change of waiting) {
    if (change.kind === "add") {
      added.push(change.product);
      continue;
    }
    const index = products.findIndex((product) => product.id === change.id);
    if (index < 0) continue;
    if (change.kind === "update") editOf(index, asMention(index, change.edit));
    else {
      removed.add(index);
      carried.add(index);
    }
  }

  for (const change of output.changes) {
    const index = (change.product ?? 0) - 1;
    const listed = index >= 0 && index < products.length;

    if (change.action === "cancel") {
      if (listed) {
        edits.delete(index);
        removed.delete(index);
      }
      added = added.filter(
        (product) => !sameText(product.name, change.name) && !sameText(product.localName, change.localName),
      );
    } else if (change.action === "add") {
      const name = clean(change.name);
      if (!name) continue;
      // "Adding" a product the shop already lists means updating it.
      const known = products.findIndex(
        (product) => sameText(product.name, name) || sameText(product.localName, change.localName),
      );
      if (known >= 0) {
        editOf(known, { ...change, name: null, localName: null });
        continue;
      }
      const product = { name, localName: clean(change.localName), price: validPrice(change.price), unit: change.unit };
      const again = added.findIndex((other) => sameText(other.name, name));
      if (again < 0) added.push(product);
      else added[again] = mergeNew(added[again], product);
    } else if (listed && change.action === "remove") {
      removed.add(index);
      carried.delete(index);
    } else if (listed) {
      editOf(index, change);
      if (carried.delete(index)) removed.delete(index);
    }
  }

  const updates: ProductChange[] = [...edits]
    .filter(([index]) => !removed.has(index))
    .flatMap(([index, changes]) => {
      const edit = diff(products[index], changes);
      return Object.keys(edit).length > 0 ? [{ kind: "update" as const, id: products[index].id, edit }] : [];
    });
  return [
    ...updates,
    ...added.map((product) => ({ kind: "add" as const, product })),
    ...[...removed].map((index) => ({ kind: "remove" as const, id: products[index].id })),
  ];
}

// A new product named twice: the later details win, the first spelling stays.
const mergeNew = (first: NewProduct, later: NewProduct): NewProduct => ({
  name: first.name,
  localName: later.localName ?? first.localName,
  price: later.price ?? first.price,
  unit: later.unit ?? first.unit,
});

// Later mentions win; going back to the current value drops the change.
function diff(product: ListedProduct, changes: readonly Change[]): ProductEdit {
  const edit: ProductEdit = {};
  const set = <Key extends keyof ProductEdit>(key: Key, value: ProductEdit[Key] | null, current: unknown) => {
    if (value === null || value === undefined) return;
    if (value === current) delete edit[key];
    else edit[key] = value;
  };
  for (const change of changes) {
    set("name", clean(change.name)?.slice(0, 120) ?? null, product.name);
    set("localName", clean(change.localName)?.slice(0, 120) ?? null, product.localName);
    set("price", validPrice(change.price), product.price);
    set("unit", change.unit, product.unit);
    set("inStock", change.inStock, product.inStock);
  }
  return edit;
}
