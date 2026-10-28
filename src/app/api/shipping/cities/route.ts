// Checkout: places of one courier matching what the customer types. GET ?carrier=speedy&q=соф
import type { NextRequest } from "next/server";
import { courierErrorMessage, getCarrier, isCarrier } from "@/lib/shipping";

const MAX_RESULTS = 20;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const carrier = params.get("carrier");
  if (!isCarrier(carrier)) return Response.json({ cities: [], error: "Unknown carrier" }, { status: 400 });
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ cities: [] });
  try {
    const cities = (await getCarrier(carrier).searchCities(q)).slice(0, MAX_RESULTS);
    return Response.json({ cities }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (e) {
    console.error(`[shipping] ${carrier} city search failed:`, courierErrorMessage(e));
    return Response.json({ cities: [], error: courierErrorMessage(e) }, { status: 502 });
  }
}
