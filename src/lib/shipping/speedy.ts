// Speedy REST API v1 (https://api.speedy.bg/v1, docs: https://api.speedy.bg/web-api.html).
// Every request is a JSON POST with userName/password in the body. Errors come back as { error: { message } },
// often with HTTP 200, so every response is checked for it.
import "server-only";
import { parse } from "csv-parse/sync";
import { CONTENTS, type CarrierAdapter } from "./adapter";
import { CourierError, DAY_MS, cached, courierFetch, eur, isRecord, phoneBG, rankBy, rankCities, readJson, sender, str } from "./common";
import type { City, Office } from "./types";

const BASE = "https://api.speedy.bg/v1";
const BULGARIA = 100;
/** "СТАНДАРТ 24 ЧАСА", the domestic parcel service on the contract. */
const DEFAULT_SERVICE_ID = 505;
const SOFIA_SITE_ID = 68134;

type SpeedyOffice = {
  id: number;
  name: string;
  siteId: number;
  type?: string;
  address?: { siteName?: string; postCode?: string; fullAddressString?: string; localAddressString?: string };
};
type Site = City & { nameEn?: string; town: boolean };

function credentials() {
  return { userName: process.env.SPEEDY_USERNAME ?? "", password: process.env.SPEEDY_PASSWORD ?? "" };
}

function isConfigured() {
  const c = credentials();
  return Boolean(c.userName && c.password);
}

function speedyError(body: unknown, status: number): CourierError | null {
  if (isRecord(body) && isRecord(body.error)) {
    const msg = str(body.error.message) || "Неизвестна грешка";
    // Drop Speedy's internal request id "(EE2026...)" from the end of the message.
    return new CourierError("speedy", `Speedy: ${msg.replace(/\s*\(EE[0-9A-Z]+\)\s*$/, "")}`, status, str(body.error.code) || undefined);
  }
  if (status >= 400) {
    if (status === 401 || status === 403) return new CourierError("speedy", "Speedy: невалидно потребителско име или парола.", status);
    const msg = isRecord(body) ? str(body.message) : "";
    return new CourierError("speedy", `Speedy: грешка ${status}${msg ? ` – ${msg}` : ""}`, status);
  }
  return null;
}

async function request(path: string, body: Record<string, unknown>, timeoutMs?: number): Promise<Response> {
  if (!isConfigured()) throw new CourierError("speedy", "Speedy не е свързан: липсват SPEEDY_USERNAME / SPEEDY_PASSWORD в .env.local.");
  return courierFetch(
    "speedy",
    BASE + path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json, application/pdf" },
      body: JSON.stringify({ ...credentials(), language: "BG", ...body }),
    },
    timeoutMs,
  );
}

async function call<T extends Record<string, unknown>>(path: string, body: Record<string, unknown>, timeoutMs?: number): Promise<T> {
  const res = await request(path, body, timeoutMs);
  const json = await readJson(res);
  const err = speedyError(json, res.status);
  if (err) throw err;
  return (isRecord(json) ? json : {}) as T;
}

function mapOffice(o: SpeedyOffice): Office {
  const a = o.address ?? {};
  return {
    id: String(o.id),
    name: o.name,
    address: a.localAddressString || a.fullAddressString || "",
    city: a.siteName ?? "",
    cityId: String(o.siteId),
    postcode: a.postCode || undefined,
    kind: o.type === "APT" ? "locker" : "office",
  };
}

/** All ~5300 Speedy places (towns and villages) in Bulgaria from the CSV list, cached for 24 h. */
function allSites(): Promise<Site[]> {
  return cached("speedy-sites-v1", DAY_MS, async () => {
    const res = await request(`/location/site/csv/${BULGARIA}`, {}, 60000);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("csv")) {
      throw speedyError(await readJson(res), res.status) ?? new CourierError("speedy", "Speedy не върна списъка с населени места.");
    }
    const rows = parse(await res.text(), { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
    const sites = rows.map((r): Site => {
      const region = [
        r.type === "с." ? "село" : "",
        r.municipality && r.municipality !== r.name ? `общ. ${r.municipality}` : "",
        r.region ? `обл. ${r.region}` : "",
      ].filter(Boolean);
      return { id: r.id, name: r.name, nameEn: r.nameEn || undefined, postcode: r.postCode || undefined, region: region.join(", ") || undefined, town: r.type !== "с." };
    });
    if (!sites.length) throw new CourierError("speedy", "Speedy върна празен списък с населени места.");
    return sites;
  });
}

/** All Speedy offices and lockers in Bulgaria (~1300), cached for 24 h. */
function allOffices(): Promise<Office[]> {
  return cached("speedy-offices-v1", DAY_MS, async () => {
    const res = await call<{ offices?: SpeedyOffice[] }>("/location/office", { countryId: BULGARIA }, 60000);
    const offices = (res.offices ?? []).map(mapOffice);
    if (!offices.length) throw new CourierError("speedy", "Speedy върна празен списък с офиси.");
    return offices;
  });
}

/** The recipient's Speedy site: the id chosen at checkout, else the only place with that name (and postcode). */
async function siteId(place: { cityId: string; city: string; postcode: string }): Promise<number> {
  const fromId = Number.parseInt(place.cityId, 10);
  if (Number.isFinite(fromId) && fromId > 0) return fromId;
  const city = place.city.replace(/^(гр|с)\.\s*/i, "").trim().toLocaleLowerCase("bg-BG");
  const exact = (await allSites()).filter((s) => s.name.toLocaleLowerCase("bg-BG") === city);
  const pick = exact.find((s) => place.postcode && s.postcode === place.postcode) ?? (exact.length === 1 ? exact[0] : undefined);
  if (!pick) throw new CourierError("speedy", `Speedy не разпозна еднозначно населеното място „${place.city}“${place.postcode ? ` (${place.postcode})` : ""}.`);
  return Number(pick.id);
}

const serviceId = () => Number.parseInt(process.env.SPEEDY_SERVICE_ID ?? "", 10) || DEFAULT_SERVICE_ID;

export const speedy: CarrierAdapter = {
  id: "speedy",
  isConfigured,

  async searchCities(query) {
    if (query.trim().length < 2) return [];
    return rankCities(await allSites(), query).map(({ id, name, postcode, region }) => ({ id, name, postcode, region }));
  },

  async listOffices({ cityId, query }) {
    let offices = await allOffices();
    if (cityId) offices = offices.filter((o) => o.cityId === cityId);
    if (query?.trim()) offices = rankBy(offices, query, (o) => [o.name, o.address, o.city, o.postcode, o.id]);
    return offices;
  },

  async createShipment(order, options) {
    const s = sender();
    const d = order.delivery;
    // Without an address the courier collects from the contract's own address; a drop-off office overrides it.
    const from: Record<string, unknown> = {};
    if (s.phone) from.phone1 = { number: phoneBG(s.phone) };
    if (s.contactName) from.contactName = s.contactName.slice(0, 60);
    if (s.email) from.email = s.email;
    const dropoff = Number.parseInt(s.speedyOfficeId, 10);
    if (dropoff > 0) from.dropoffOfficeId = dropoff;

    const recipient: Record<string, unknown> = {
      privatePerson: true,
      clientName: order.customer.name.slice(0, 60),
      phone1: { number: phoneBG(order.customer.phone) },
      email: order.customer.email,
    };
    if (d.needs === "address") {
      recipient.address = {
        countryId: BULGARIA,
        siteId: await siteId(d),
        ...(d.postcode ? { postCode: d.postcode } : {}),
        addressNote: d.address.slice(0, 200),
      };
    } else {
      const office = Number.parseInt(d.officeId, 10);
      if (!(office > 0)) throw new CourierError("speedy", "В поръчката няма избран офис или автомат на Speedy.");
      recipient.pickupOfficeId = office;
    }

    const services: Record<string, unknown> = {};
    if (options.codAmount > 0) services.cod = { amount: eur(options.codAmount), currencyCode: "EUR", processingType: "CASH" };
    if (options.declaredValue > 0) services.declaredValue = { amount: eur(options.declaredValue), fragile: false };

    const res = await call<{ id?: string; parcels?: { id: string }[]; price?: Record<string, unknown>; deliveryDeadline?: string }>(
      "/shipment",
      {
        ...(Object.keys(from).length ? { sender: from } : {}),
        recipient,
        service: { serviceId: serviceId(), autoAdjustPickupDate: true, ...(Object.keys(services).length ? { additionalServices: services } : {}) },
        content: { parcelsCount: options.parcels, totalWeight: Math.max(0.1, eur(options.weightKg)), contents: CONTENTS, package: "BOX" },
        // The customer paid for delivery at checkout, so the shop pays Speedy.
        payment: { courierServicePayer: process.env.SPEEDY_PAYER === "RECIPIENT" ? "RECIPIENT" : "SENDER" },
        ref1: order.number,
      },
      30000,
    );
    if (!res.id) throw new CourierError("speedy", "Speedy не върна номер на товарителница.");
    return {
      shipmentId: String(res.id),
      trackingNumber: String(res.id),
      data: {
        parcels: (res.parcels ?? []).map((p) => String(p.id)),
        price: res.price?.total ?? null,
        currency: res.price?.currency ?? null,
        deliveryDeadline: res.deliveryDeadline ?? null,
      },
    };
  },

  async getLabelPdf(shipment) {
    const listed = Array.isArray(shipment.data?.parcels) ? shipment.data.parcels.map(str).filter(Boolean) : [];
    const ids = listed.length ? listed : [shipment.shipmentId];
    const res = await request("/print", { format: "pdf", paperSize: "A6", parcels: ids.map((id) => ({ parcel: { id } })) }, 30000);
    if (res.ok && (res.headers.get("content-type") ?? "").includes("pdf")) return Buffer.from(await res.arrayBuffer());
    throw speedyError(await readJson(res), res.status) ?? new CourierError("speedy", "Speedy не върна PDF с етикета.");
  },

  async cancelShipment(shipment, orderNumber) {
    await call("/shipment/cancel", { shipmentId: shipment.shipmentId, comment: `Анулирана от магазина (поръчка ${orderNumber})` });
  },

  async test() {
    const res = await call<{ offices?: unknown[] }>("/location/office", { countryId: BULGARIA, siteId: SOFIA_SITE_ID });
    return res.offices?.length ?? 0;
  },
};
