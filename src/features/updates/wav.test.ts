import { describe, expect, it } from "vitest";
import { encodeWav } from "./wav";

describe("encodeWav", () => {
  it("writes a 16-bit mono PCM WAV with clamped samples", async () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2]), 16000);
    const bytes = new DataView(await wav.arrayBuffer());
    const text = (offset: number, length: number) =>
      String.fromCharCode(...Array.from({ length }, (_, index) => bytes.getUint8(offset + index)));

    expect(wav.type).toBe("audio/wav");
    expect(bytes.byteLength).toBe(44 + 4 * 2);
    expect([text(0, 4), text(8, 4), text(12, 4), text(36, 4)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(bytes.getUint32(4, true)).toBe(36 + 8);
    expect(bytes.getUint16(22, true)).toBe(1);
    expect(bytes.getUint32(24, true)).toBe(16000);
    expect(bytes.getUint32(40, true)).toBe(8);
    expect([0, 1, 2, 3].map((index) => bytes.getInt16(44 + index * 2, true))).toEqual([0, 32767, -32768, 32767]);
  });
});
