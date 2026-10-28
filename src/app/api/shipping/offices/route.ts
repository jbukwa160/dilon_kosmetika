// Checkout: offices and lockers of one courier in one place. GET ?carrier=speedy&cityId=68134
// The place is required, so the whole country is never sent at once.
import type { NextRequest } from "next/server";
import { courierErrorMessage, getCarrier, isCarrier } from "@/lib/shipping";

const MAX_RESULTS = 400;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const carrier = params.get("carrier");
  if (!isCarrier(carrier)) return Response.json({ offices: [], error: "Unknown carrier" }, { status: 400 });
  const cityId = (params.get("cityId") ?? "").trim().slice(0, 100);
  if (!cityId) return Response.json({ offices: [] });
  try {
    const offices = await getCarrier(carrier).listOffices({ cityId });
    // Offices first, lockers after them, each in the courier's order.
    const sorted = [...offices.filter((o) => o.kind === "office"), ...offices.filter((o) => o.kind === "locker")];
    return Response.json({ offices: sorted.slice(0, MAX_RESULTS) }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (e) {
    console.error(`[shipping] ${carrier} office list failed:`, courierErrorMessage(e));
    return Response.json({ offices: [], error: courierErrorMessage(e) }, { status: 502 });
  }
}
