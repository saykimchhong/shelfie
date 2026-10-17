import { describe, expect, it } from "vitest";
import { ndjsonStream, readNdjson } from "./ndjson";

async function collect(stream: ReadableStream<Uint8Array>) {
  const messages: unknown[] = [];
  for await (const message of readNdjson(stream)) messages.push(message);
  return messages;
}

// Splits text into arbitrary chunks, like a slow network would.
function chunked(text: string, size: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let at = 0; at < bytes.length; at += size) controller.enqueue(bytes.slice(at, at + size));
      controller.close();
    },
  });
}

describe("ndjson", () => {
  it("round-trips messages in order", async () => {
    const stream = ndjsonStream<object>(async (send) => {
      send({ step: 1 });
      await Promise.resolve();
      send({ step: 2, text: "line\nbreak" });
    });
    expect(await collect(stream)).toEqual([{ step: 1 }, { step: 2, text: "line\nbreak" }]);
  });

  it("joins messages split across chunks, including multi-byte characters", async () => {
    const text = `${JSON.stringify({ name: "ស្បែកជើង" })}\n${JSON.stringify({ price: 25 })}`;
    expect(await collect(chunked(text, 3))).toEqual([{ name: "ស្បែកជើង" }, { price: 25 }]);
  });

  it("errors the stream when the writer fails", async () => {
    const stream = ndjsonStream(async (send) => {
      send({ ok: true });
      throw new Error("boom");
    });
    await expect(collect(stream)).rejects.toThrow("boom");
  });
});
