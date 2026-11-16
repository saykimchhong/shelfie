import { describe, expect, it } from "vitest";
import type { ProductChange } from "@/domain/updates";
import {
  dayLabel,
  decodeChat,
  describeChanges,
  encodeChat,
  KEEP_CHAT_MS,
  startsNewDay,
  toHistory,
  waitingChanges,
  waitingMessage,
  withFailure,
  withProposal,
  withReply,
  type ChatMessage,
} from "./chat";

const milo: ProductChange = { kind: "update", id: "milo", edit: { price: 99 } };
const rice: ProductChange = { kind: "update", id: "rice", edit: { inStock: false } };
const eggs: ProductChange = { kind: "add", product: { name: "Eggs", localName: null, price: 4, unit: "each" } };
const owner = (id: string, text: string, at?: number): ChatMessage => ({ id, role: "owner", text, at });
const NOW = Date.UTC(2026, 10, 16, 12);
const names = (id: string) => ({ milo: "Milo 400g", rice: "Jasmine Rice" })[id];

describe("withReply", () => {
  it("adds the answer with the changes to save", () => {
    const chat = withReply([owner("1", "milo 99")], "1", "2", { heard: null, reply: "Milo is ready.", changes: [milo] }, NOW);

    expect(chat[1]).toEqual({
      id: "2",
      role: "assistant",
      text: "Milo is ready.",
      at: NOW,
      proposal: { changes: [milo], skipped: [], state: "waiting" },
    });
    expect(waitingChanges(chat)).toEqual([milo]);
  });

  it("moves the waiting changes under the newest answer", () => {
    const first = withReply([owner("1", "milo 99")], "1", "2", { heard: null, reply: "Ready.", changes: [milo] });
    const second = withReply([...first, owner("3", "rice sold out")], "3", "4", {
      heard: null,
      reply: "Ready.",
      changes: [milo, rice],
    });

    expect(second[1]).toMatchObject({ proposal: { state: "moved" } });
    expect(waitingMessage(second)?.id).toBe("4");
    expect(waitingChanges(second)).toEqual([milo, rice]);
  });

  it("shows what a voice note said, and an answer with nothing to save", () => {
    const chat = withReply([{ id: "1", role: "owner", text: "", voice: true }], "1", "2", {
      heard: "what is sold out",
      reply: "Nothing is sold out.",
      changes: [],
    });

    expect(chat).toEqual([
      { id: "1", role: "owner", text: "what is sold out", voice: true },
      { id: "2", role: "assistant", text: "Nothing is sold out.", at: expect.any(Number), proposal: undefined },
    ]);
  });
});

describe("waitingChanges", () => {
  it("leaves out the changes the seller unticked", () => {
    const chat = withReply([owner("1", "x")], "1", "2", { heard: null, reply: "Ready.", changes: [milo, rice, eggs] });
    const unticked = withProposal(chat, "2", (proposal) => ({ ...proposal, skipped: [1] }));

    expect(waitingChanges(unticked)).toEqual([milo, eggs]);
  });

  it("has nothing once they are saved", () => {
    const chat = withReply([owner("1", "x")], "1", "2", { heard: null, reply: "Ready.", changes: [milo] });
    expect(waitingChanges(withProposal(chat, "2", (proposal) => ({ ...proposal, state: "saved" })))).toEqual([]);
  });
});

describe("withFailure", () => {
  it("keeps the waiting changes and marks the message as not sent", () => {
    const chat = withReply([owner("1", "milo 99")], "1", "2", { heard: null, reply: "Ready.", changes: [milo] });
    const failed = withFailure([...chat, owner("3", "rice sold out")], "3", "4", "Couldn't read that.");

    expect(failed[2]).toMatchObject({ failed: true });
    expect(failed[3]).toMatchObject({ error: true });
    expect(waitingChanges(failed)).toEqual([milo]);
  });
});

describe("toHistory", () => {
  it("tells the AI what was said and what was saved, without failed messages", () => {
    const chat: ChatMessage[] = [
      owner("1", " milo 99 "),
      {
        id: "2",
        role: "assistant",
        text: "Milo is ready.",
        proposal: { changes: [milo], skipped: [], state: "saved", note: "Milo 400g: price 99" },
      },
      { id: "3", role: "owner", text: "rice sold out", failed: true },
      { id: "4", role: "assistant", text: "Couldn't read that.", error: true },
      owner("5", "remove the soap"),
      {
        id: "6",
        role: "assistant",
        text: "Ready.",
        proposal: { changes: [rice], skipped: [], state: "dropped", note: "remove Lux Soap" },
      },
      { id: "7", role: "owner", text: "", voice: true },
    ];

    expect(toHistory(chat)).toEqual([
      { role: "owner", text: "milo 99" },
      { role: "assistant", text: "Milo is ready. [The owner saved: Milo 400g: price 99]" },
      { role: "owner", text: "remove the soap" },
      { role: "assistant", text: "Ready. [The owner did not save: remove Lux Soap]" },
    ]);
  });

  it("keeps only the last turns, each cut to size", () => {
    const chat = Array.from({ length: 30 }, (_, index) => owner(String(index), index === 29 ? "x".repeat(2000) : `message ${index}`));
    const history = toHistory(chat);

    expect(history).toHaveLength(12);
    expect(history[0].text).toBe("message 18");
    expect(history[11].text).toHaveLength(800);
  });
});

describe("describeChanges", () => {
  it("puts changes in plain words", () => {
    expect(describeChanges([milo, rice, eggs, { kind: "remove", id: "gone" }], names)).toBe(
      "Milo 400g: price 99; Jasmine Rice: sold out; new product Eggs: price 4, each; remove a product",
    );
  });
});

describe("saved chat", () => {
  it("reads back what it wrote", () => {
    const chat = withReply([owner("1", "milo 99")], "1", "2", { heard: null, reply: "Ready.", changes: [milo] });
    expect(decodeChat(encodeChat(chat, NOW), NOW + 1000)).toEqual(JSON.parse(JSON.stringify(chat)));
  });

  it("forgets a chat nobody has written in for a month", () => {
    const saved = encodeChat([owner("1", "milo 99")], NOW);
    expect(decodeChat(saved, NOW + KEEP_CHAT_MS - 1)).toHaveLength(1);
    expect(decodeChat(saved, NOW + KEEP_CHAT_MS)).toEqual([]);
  });

  it("starts empty when the saved chat is missing or broken", () => {
    expect(decodeChat(null)).toEqual([]);
    expect(decodeChat("{nope")).toEqual([]);
    expect(decodeChat('[{"role":"robot"}]')).toEqual([]);
    expect(decodeChat('{"savedAt":1,"messages":[{"role":"robot"}]}', 2)).toEqual([]);
  });
});

describe("day lines", () => {
  const DAY = 24 * 60 * 60 * 1000;
  // Local noon, so "today" and "yesterday" don't straddle midnight in any time zone.
  const noon = new Date(2026, 10, 16, 12).getTime();

  it("names today, yesterday and older days", () => {
    expect(dayLabel(noon, noon)).toBe("Today");
    expect(dayLabel(noon - DAY, noon)).toBe("Yesterday");
    expect(dayLabel(noon - 5 * DAY, noon, "en-GB")).toBe("11 Nov");
  });

  it("puts a line before the first message of each day only", () => {
    const first = owner("1", "a", noon - DAY);
    const sameDay = owner("2", "b", noon - DAY + 1000);
    const nextDay = owner("3", "c", noon);
    expect(startsNewDay(first, undefined)).toBe(true);
    expect(startsNewDay(sameDay, first)).toBe(false);
    expect(startsNewDay(nextDay, sameDay)).toBe(true);
    expect(startsNewDay(owner("4", "old"), nextDay)).toBe(false);
  });
});
