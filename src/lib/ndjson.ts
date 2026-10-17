// Newline-delimited JSON over a web stream: one message per line, so the
// browser can act on each message as it arrives.

export const NDJSON_CONTENT_TYPE = "application/x-ndjson";

export type Send<T> = (message: T) => void;

// The stream stays open until `write` settles; a rejection errors the stream.
export function ndjsonStream<T>(write: (send: Send<T>) => Promise<void>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const send: Send<T> = (message) => controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      write(send).then(
        () => controller.close(),
        (error: unknown) => controller.error(error),
      );
    },
  });
}

export async function* readNdjson(stream: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) yield JSON.parse(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield JSON.parse(buffer);
  } finally {
    reader.releaseLock();
  }
}
