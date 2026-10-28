// Server-side entry point for the courier integrations. Client components import from "./types" instead.
import "server-only";
import { getBySku } from "@/lib/catalog";
import type { CarrierId } from "@/lib/site";
import type { CarrierAdapter } from "./adapter";
import { boxnow } from "./boxnow";
import { CourierError } from "./common";
import { econt } from "./econt";
import { pigeon } from "./pigeon";
import { speedy } from "./speedy";
import type { Office } from "./types";

export * from "./types";
export type { Shipment, ShipmentOptions } from "./adapter";
export { CourierError } from "./common";

const ADAPTERS: Record<CarrierId, CarrierAdapter> = { speedy, econt, boxnow, pigeon };

export function getCarrier(id: CarrierId): CarrierAdapter {
  return ADAPTERS[id];
}

/** Readable (Bulgarian) message for any error thrown by an adapter. */
export function courierErrorMessage(e: unknown): string {
  if (e instanceof CourierError) return e.message;
  if (e instanceof Error) return `Неочаквана грешка: ${e.message}`;
  return "Неочаквана грешка";
}

/**
 * The office or locker with this id, `null` when the courier does not list it, `undefined` when the list cannot be
 * loaded right now (the order is then taken with the office as the customer chose it).
 */
export async function findOffice(carrier: CarrierId, officeId: string): Promise<Office | null | undefined> {
  try {
    const all = await getCarrier(carrier).listOffices({});
    return all.find((o) => o.id === officeId) ?? null;
  } catch (e) {
    console.error(`[shipping] ${carrier} offices unavailable while checking an order:`, courierErrorMessage(e));
    return undefined;
  }
}

/**
 * Estimated parcel weight in kg from the sizes in the product names (ml ≈ g, plus the bottle or jar), 150 g for a
 * product without a size, plus 150 g for the box; rounded up to 0.1 kg. The waybill page lets the shop correct it.
 */
export function parcelWeightKg(lines: { sku: string; qty: number }[]): number {
  let kg = 0.15;
  for (const l of lines) {
    const facts = getBySku(l.sku)?.facts;
    const grams = facts?.ml ?? facts?.g ?? 150;
    kg += ((Math.min(grams, 5000) * 1.25 + 30) / 1000) * l.qty;
  }
  return Math.max(0.3, Math.ceil(kg * 10) / 10);
}
