import "server-only";
import { createPartFromBase64, type Part } from "@google/genai";
import { serverEnv } from "./env";
import { gemini } from "./gemini";

// "AI photo": one Gemini image call that both checks and fixes. The frame was
// grabbed where the Watcher said the product was, which can be off by a
// second (a hand, the next fruit). So Gemini cleans the photo up when it shows
// the product, and draws the product from its name when it doesn't.

// Image model names change between releases; the first one that exists wins.
const FALLBACK_MODELS = ["gemini-2.5-flash-image", "gemini-3.1-flash-image"];

export type ProductPhoto = { bytes: Buffer; mimeType: string };

export async function makeProductPhoto(input: { name: string; frame: Blob | null }): Promise<ProductPhoto> {
  const parts: Part[] = [{ text: prompt(input.name, input.frame !== null) }];
  if (input.frame) {
    const base64 = Buffer.from(await input.frame.arrayBuffer()).toString("base64");
    parts.push(createPartFromBase64(base64, input.frame.type || "image/jpeg"));
  }

  const models = [serverEnv().GEMINI_IMAGE_MODEL, ...FALLBACK_MODELS].filter(
    (model, index, all): model is string => !!model && all.indexOf(model) === index,
  );
  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "1:1" } },
      });
      const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
      if (!image?.data) throw new Error("Gemini returned no image");
      return { bytes: Buffer.from(image.data, "base64"), mimeType: image.mimeType ?? "image/png" };
    } catch (error) {
      lastError = error;
      // Only an unknown model is worth trying the next name for.
      if (!/not found|404|not supported/i.test(String(error))) break;
    }
  }
  throw lastError;
}

function prompt(name: string, hasFrame: boolean): string {
  const style =
    "Square product photo for a small shop's online catalog: the product alone, centered, filling most of the frame, " +
    "on a plain light background with a soft shadow, bright natural light. No hands, people, text, price tags or watermarks.";
  if (!hasFrame) return `Create a realistic photo of: ${name}. ${style}`;
  return [
    `The product is: ${name}.`,
    "The attached image is a frame from the seller's own shop video.",
    `If it clearly shows ${name}, turn it into a clean photo of that same item, keeping its real look (variety, colour, packaging).`,
    `If it doesn't clearly show ${name} (another product, a hand, blur), ignore it and create a realistic photo of ${name}.`,
    style,
  ].join(" ");
}
