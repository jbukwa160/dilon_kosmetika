// Waybills without an admin panel: the shop's order e-mail links to the order's waybill page (./waybill-link), which
// creates the waybill with the order's courier, prints its label and can cancel it. Waybills are kept in
// DATA_DIR/shipments.json (one per order) and every create / cancel is appended to DATA_DIR/shipments-log.jsonl.
import "server-only";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./data-dir";
import { mailShipped, type Order } from "./orders";
import { courierErrorMessage, getCarrier, type Shipment, type ShipmentOptions } from "./shipping";
import { CARRIERS } from "./site";

export { isWaybillKey, waybillUrl } from "./waybill-link";

const storeFile = () => path.join(dataDir(), "shipments.json");

export async function readShipments(): Promise<Record<string, Shipment>> {
  try {
    return JSON.parse(await readFile(storeFile(), "utf8")) as Record<string, Shipment>;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
}

export async function getShipment(number: string): Promise<Shipment | null> {
  return (await readShipments())[number] ?? null;
}

// Changes to shipments.json run one after another (read, change, write) so two orders never overwrite each other.
const g = globalThis as unknown as { __waybillQueue?: Promise<unknown>; __waybillBusy?: Set<string> };
function update(change: (all: Record<string, Shipment>) => void): Promise<void> {
  const run = (g.__waybillQueue ?? Promise.resolve()).then(async () => {
    const all = await readShipments();
    change(all);
    await mkdir(dataDir(), { recursive: true });
    await writeFile(`${storeFile()}.tmp`, JSON.stringify(all, null, 1));
    await rename(`${storeFile()}.tmp`, storeFile());
  });
  g.__waybillQueue = run.catch(() => {});
  return run;
}

async function log(entry: Record<string, unknown>) {
  try {
    await appendFile(path.join(dataDir(), "shipments-log.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  } catch (e) {
    console.error("[waybills] could not write the log:", (e as Error).message);
  }
}

/** Guards against a double click creating two paid waybills for one order. */
const busy = (g.__waybillBusy ??= new Set());

type Result = { ok: true; shipment?: Shipment } | { ok: false; error: string };

export async function createWaybill(order: Order, options: Omit<ShipmentOptions, "codAmount">): Promise<Result> {
  const { carrier } = order.delivery;
  if (!carrier) return { ok: false, error: "Поръчката е от преди куриерите да бъдат свързани. Създайте товарителницата в сайта на куриера." };
  if (busy.has(order.number)) return { ok: false, error: "Товарителницата вече се създава. Изчакайте няколко секунди." };
  busy.add(order.number);
  try {
    const existing = await getShipment(order.number);
    if (existing) return { ok: false, error: `Поръчката вече има товарителница ${existing.trackingNumber}. Анулирайте я, преди да създадете нова.` };
    const adapter = getCarrier(carrier);
    if (!adapter.isConfigured()) return { ok: false, error: `${CARRIERS[carrier]} не е свързан: липсват данни за достъп в .env.local. Създайте товарителницата в сайта на куриера.` };

    // Cash on delivery: the whole order, delivery included.
    const full = { ...options, codAmount: order.total };
    let result;
    try {
      result = await adapter.createShipment(order, full);
    } catch (e) {
      console.error(`[waybills] ${carrier} waybill for ${order.number} failed:`, e);
      return { ok: false, error: courierErrorMessage(e) };
    }
    const shipment: Shipment = { ...result, carrier, createdAt: new Date().toISOString(), ...full };
    try {
      await update((all) => {
        all[order.number] = shipment;
      });
    } catch (e) {
      console.error(`[waybills] waybill ${result.trackingNumber} for ${order.number} was created but not saved:`, e);
      return { ok: false, error: `Товарителница ${result.trackingNumber} е създадена в ${CARRIERS[carrier]}, но не беше записана (${(e as Error).message}). Запишете номера.` };
    }
    await log({ number: order.number, action: "create", carrier, trackingNumber: shipment.trackingNumber, weightKg: shipment.weightKg, parcels: shipment.parcels, codAmount: shipment.codAmount });
    await mailShipped(order, shipment);
    return { ok: true, shipment };
  } finally {
    busy.delete(order.number);
  }
}

export async function cancelWaybill(order: Order): Promise<Result> {
  if (busy.has(order.number)) return { ok: false, error: "В момента се обработва товарителница за тази поръчка. Опитайте отново след малко." };
  busy.add(order.number);
  try {
    const shipment = await getShipment(order.number);
    if (!shipment) return { ok: false, error: "Поръчката няма товарителница." };
    try {
      await getCarrier(shipment.carrier).cancelShipment(shipment, order.number);
    } catch (e) {
      console.error(`[waybills] cancelling ${shipment.trackingNumber} (${order.number}) failed:`, e);
      return { ok: false, error: courierErrorMessage(e) };
    }
    await update((all) => {
      delete all[order.number];
    });
    await log({ number: order.number, action: "cancel", carrier: shipment.carrier, trackingNumber: shipment.trackingNumber });
    return { ok: true };
  } finally {
    busy.delete(order.number);
  }
}
