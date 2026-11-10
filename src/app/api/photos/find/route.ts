import { MAX_SHOT_FRAME_BYTES, shotProductsSchema, type ShotProduct } from "@/domain/photos";
import { AuthError, requireUser } from "@/server/auth";
import { extractionProvider, findProductShots, type ShotFrame } from "@/server/extraction";

// POST multipart: products (JSON ShotProduct[]), frame × n in product order → { picks }.
// 501 in mock mode.

export const maxDuration = 60;

export async function POST(request: Request) {
  const started = performance.now();
  try {
    await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) return problem(401, error.message);
    throw error;
  }
  if (extractionProvider() !== "gemini") return problem(501, "The Photo finder needs the real AI");

  const form = await request.formData().catch(() => null);
  const products = parseProducts(form?.get("products"));
  if (!products) return problem(400, "`products` must be a JSON list of products");

  const frames = (form?.getAll("frame") ?? []).filter((frame): frame is File => frame instanceof Blob);
  const expected = products.reduce((sum, product) => sum + product.frames, 0);
  if (frames.length !== expected) return problem(400, `Expected ${expected} frames, got ${frames.length}`);
  if (frames.some((frame) => !frame.type.startsWith("image/") || frame.size > MAX_SHOT_FRAME_BYTES)) {
    return problem(400, "Each `frame` must be an image under 512 KB");
  }

  try {
    const shots: ShotFrame[] = frames.map((frame) => ({ data: frame, mimeType: frame.type }));
    const picks = await findProductShots(products, shots);
    console.info(
      JSON.stringify({
        message: "photo finder timings",
        products: products.length,
        frames: frames.length,
        picked: picks.filter((pick) => pick.frame !== null).length,
        totalMs: Math.round(performance.now() - started),
      }),
    );
    return Response.json({ picks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Photo finder failed", error);
    return problem(502, "Couldn't pick the photos");
  }
}

function parseProducts(value: FormDataEntryValue | null | undefined): ShotProduct[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = shotProductsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
