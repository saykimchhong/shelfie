import { z } from "zod";
import {
  describeChange,
  MAX_CHAT_TURNS,
  MAX_TURN_TEXT,
  productChangeSchema,
  type ChatTurn,
  type ProductChange,
  type UpdatesResponse,
} from "@/domain/updates";

// The chat as the seller sees it. It lives in the browser tab, not on the server.

// waiting: can be saved. moved: carried into a later message. saved / dropped: finished.
const proposalSchema = z.object({
  changes: z.array(productChangeSchema),
  skipped: z.array(z.number().int()),
  state: z.enum(["waiting", "moved", "saved", "dropped"]),
  // The kept changes in plain words, written when the seller saves or drops them.
  note: z.string().optional(),
});

export type Proposal = z.infer<typeof proposalSchema>;

const messageSchema = z.discriminatedUnion("role", [
  z.object({
    id: z.string(),
    role: z.literal("owner"),
    text: z.string(),
    voice: z.boolean().optional(),
    failed: z.boolean().optional(),
  }),
  z.object({
    id: z.string(),
    role: z.literal("assistant"),
    text: z.string(),
    error: z.boolean().optional(),
    proposal: proposalSchema.optional(),
  }),
]);

export type ChatMessage = z.infer<typeof messageSchema>;
export type AssistantMessage = Extract<ChatMessage, { role: "assistant" }>;

const MAX_KEPT_MESSAGES = 60;

export const keptChanges = (proposal: Proposal): ProductChange[] =>
  proposal.changes.filter((_, index) => !proposal.skipped.includes(index));

// The changes the seller can still save, if any.
export function waitingMessage(messages: readonly ChatMessage[]): (AssistantMessage & { proposal: Proposal }) | null {
  const found = messages.find((message) => message.role === "assistant" && message.proposal?.state === "waiting");
  return found?.role === "assistant" && found.proposal ? { ...found, proposal: found.proposal } : null;
}

export const waitingChanges = (messages: readonly ChatMessage[]): ProductChange[] => {
  const waiting = waitingMessage(messages);
  return waiting ? keptChanges(waiting.proposal) : [];
};

// The answer arrived: fill in what was heard, and move the waiting changes under the new reply.
export function withReply(
  messages: readonly ChatMessage[],
  ownerId: string,
  replyId: string,
  response: Pick<UpdatesResponse, "heard" | "reply" | "changes">,
): ChatMessage[] {
  const earlier = messages.map((message): ChatMessage => {
    if (message.role === "owner") return message.id === ownerId && response.heard ? { ...message, text: response.heard } : message;
    return message.proposal?.state === "waiting" ? { ...message, proposal: { ...message.proposal, state: "moved" } } : message;
  });
  const proposal: Proposal | undefined =
    response.changes.length > 0 ? { changes: response.changes, skipped: [], state: "waiting" } : undefined;
  return [...earlier, { id: replyId, role: "assistant", text: response.reply, proposal }];
}

// The message didn't go through. Waiting changes stay where they are.
export function withFailure(messages: readonly ChatMessage[], ownerId: string, replyId: string, text: string): ChatMessage[] {
  return [
    ...messages.map((message) => (message.id === ownerId ? { ...message, failed: true } : message)),
    { id: replyId, role: "assistant", text, error: true },
  ];
}

export function withProposal(
  messages: readonly ChatMessage[],
  id: string,
  change: (proposal: Proposal) => Proposal,
): ChatMessage[] {
  return messages.map((message) =>
    message.id === id && message.role === "assistant" && message.proposal
      ? { ...message, proposal: change(message.proposal) }
      : message,
  );
}

// "Milo 400g: price 99; new product Eggs: price 4, each"
export function describeChanges(changes: readonly ProductChange[], nameOf: (id: string) => string | undefined): string {
  return changes
    .map((change) => describeChange(change, change.kind === "add" ? "" : (nameOf(change.id) ?? "a product")))
    .join("; ");
}

const clip = (text: string) => (text.length > MAX_TURN_TEXT ? `${text.slice(0, MAX_TURN_TEXT - 1)}…` : text);

// What the AI is told about the chat so far: the last turns, with notes on what was saved.
export function toHistory(messages: readonly ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === "owner") {
      if (!message.failed && message.text.trim()) turns.push({ role: "owner", text: clip(message.text.trim()) });
      continue;
    }
    if (message.error) continue;
    const { proposal } = message;
    const note =
      proposal?.state === "saved"
        ? ` [The owner saved: ${proposal.note}]`
        : proposal?.state === "dropped"
          ? ` [The owner did not save: ${proposal.note}]`
          : "";
    const text = `${message.text.trim()}${note}`.trim();
    if (text) turns.push({ role: "assistant", text: clip(text) });
  }
  return turns.slice(-MAX_CHAT_TURNS);
}

export const chatStorageKey = (slug: string) => `shelfie:assistant:${slug}`;

export const encodeChat = (messages: readonly ChatMessage[]): string => JSON.stringify(messages.slice(-MAX_KEPT_MESSAGES));

export function decodeChat(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    return z.array(messageSchema).safeParse(JSON.parse(raw)).data ?? [];
  } catch {
    return [];
  }
}

// Kept for this browser tab only, so going back to the product list doesn't lose the chat.
export function loadChat(slug: string): ChatMessage[] {
  try {
    return decodeChat(sessionStorage.getItem(chatStorageKey(slug)));
  } catch {
    return [];
  }
}

export function saveChat(slug: string, messages: readonly ChatMessage[]): void {
  try {
    if (messages.length === 0) sessionStorage.removeItem(chatStorageKey(slug));
    else sessionStorage.setItem(chatStorageKey(slug), encodeChat(messages));
  } catch {
    // Private mode or full storage: the chat just isn't kept.
  }
}
