import { getRates } from "@/server/rates";

// GET /api/rates: today's exchange rates, for converting a shop's prices
// when its currency changes.
export async function GET() {
  return Response.json(await getRates());
}
