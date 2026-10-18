import { AuthError, requireUser } from "@/server/auth";
import { extractionProvider } from "@/server/extraction";
import { makeProductPhoto } from "@/server/photos";

// POST multipart/form-data: name (string), frame? (image from the video)
//      Header: Authorization: Bearer <Firebase ID token>
//      → the photo's bytes (image/*), or 4xx/5xx JSON { error }.
// 501 in mock mode: the browser then makes its local "studio shot" instead.

export const maxDuration = 60;

// Frames are small JPEG/WebP grabs; anything bigger isn't one.
const MAX_FRAME_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) return problem(401, error.message);
    throw error;
  }
  if (extractionProvider() !== "gemini") return problem(501, "AI photos need the real AI");

  const form = await request.formData().catch(() => null);
  const name = String(form?.get("name") ?? "").trim().slice(0, 120);
  const frame = form?.get("frame");
  const hasFrame = frame instanceof Blob && frame.size > 0;
  if (!name) return problem(400, "Missing `name`");
  if (hasFrame && (!frame.type.startsWith("image/") || frame.size > MAX_FRAME_BYTES)) {
    return problem(400, "`frame` must be an image under 4 MB");
  }

  try {
    const photo = await makeProductPhoto({ name, frame: hasFrame ? frame : null });
    return new Response(new Uint8Array(photo.bytes), {
      headers: { "Content-Type": photo.mimeType, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("AI photo failed", error);
    return problem(502, "Couldn't make the photo");
  }
}

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
