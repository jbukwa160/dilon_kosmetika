// The label PDF of an order's waybill. GET ?n=OM-…&k=… (the key from the waybill link).
import type { NextRequest } from "next/server";
import { courierErrorMessage, getCarrier } from "@/lib/shipping";
import { getShipment, isWaybillKey } from "@/lib/waybills";

export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("n") ?? "";
  if (!isWaybillKey(number, req.nextUrl.searchParams.get("k"))) return new Response("Линкът не е валиден.", { status: 404 });
  const shipment = await getShipment(number);
  if (!shipment) return new Response("Поръчката няма товарителница.", { status: 404 });
  try {
    const pdf = await getCarrier(shipment.carrier).getLabelPdf(shipment);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etiket-${number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(`[waybills] label of ${shipment.trackingNumber} (${number}) failed:`, e);
    return new Response(`Етикетът не може да бъде изтеглен: ${courierErrorMessage(e)}`, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
