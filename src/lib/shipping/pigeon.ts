// Pigeon Express API v1 (docs: https://api-docs.pigeonexpress.com/). JSON over REST with X-API-Key / X-API-Secret
// headers. Base URLs as used by Pigeon Express's own WooCommerce plugin: https://api.pigeonexpress.com/v1 and
// https://api-demo.pigeonexpress.com/v1 (sandbox). Responses are { success, data, meta? }; errors
// { success: false, message, errors?: { "field.path": [msg] } } (422 = validation). Limit: 300 requests/min per IP.
import "server-only";
import type { Order } from "@/lib/orders";
import { CONTENTS, type CarrierAdapter } from "./adapter";
import { CourierError, DAY_MS, cached, courierFetch, eur, isRecord, phoneBG, rankBy, rankCities, readJson, sender, str } from "./common";
import type { City, Office } from "./types";

const PER_PAGE = 100;
/** Parcel size in cm (the API wants dimensions; products have none). Fits a medium locker box. */
const DEFAULT_SIZE = { length: 30, width: 20, height: 15 };

function baseUrl() {
  const custom = (process.env.PIGEON_API_URL ?? "").trim().replace(/\/+$/, "");
  if (custom) return /^https?:\/\//.test(custom) ? custom : `https://${custom}`;
  return process.env.PIGEON_ENV === "demo" ? "https://api-demo.pigeonexpress.com/v1" : "https://api.pigeonexpress.com/v1";
}

function isConfigured() {
  return Boolean(process.env.PIGEON_API_KEY && process.env.PIGEON_API_SECRET);
}

function pigeonError(body: unknown, status: number): CourierError {
  let message = isRecord(body) ? str(body.message) : "";
  const fields =
    isRecord(body) && isRecord(body.errors)
      ? Object.entries(body.errors).map(([field, v]) => `${field}: ${Array.isArray(v) ? v.map(str).join(", ") : str(v)}`)
      : [];
  if (!message) {
    message =
      status === 401
        ? "невалиден API ключ или секрет (PIGEON_API_KEY / PIGEON_API_SECRET)"
        : status === 429
          ? "твърде много заявки, опитайте отново след минута"
          : status === 404
            ? "не е намерено"
            : `грешка ${status}`;
  }
  return new CourierError("pigeon", `Pigeon Express: ${message}${fields.length ? ` (${fields.join("; ")})` : ""}`, status);
}

type RequestOptions = { method?: "GET" | "POST"; query?: Record<string, string | number | undefined>; body?: unknown; accept?: string };

async function request(path: string, { method = "GET", query, body, accept = "application/json" }: RequestOptions = {}, timeoutMs?: number) {
  if (!isConfigured()) throw new CourierError("pigeon", "Pigeon Express не е свързан: липсват PIGEON_API_KEY / PIGEON_API_SECRET в .env.local.");
  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  return courierFetch(
    "pigeon",
    url.toString(),
    {
      method,
      headers: {
        // Without Accept: application/json the API may answer errors with HTML.
        Accept: accept,
        "X-API-Key": process.env.PIGEON_API_KEY ?? "",
        "X-API-Secret": process.env.PIGEON_API_SECRET ?? "",
        ...(body !== undefined ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    timeoutMs,
  );
}

async function call<T extends Record<string, unknown>>(path: string, options?: RequestOptions, timeoutMs?: number): Promise<T> {
  const res = await request(path, options, timeoutMs);
  const json = await readJson(res);
  if (!res.ok || (isRecord(json) && json.success === false)) throw pigeonError(json, res.status);
  return (isRecord(json) ? json : {}) as T;
}

/** Every page of a list, four pages at a time (rate limit: 300 requests per minute). */
async function allPages<T>(path: string): Promise<T[]> {
  const page = (n: number) => call<{ data?: T[]; meta?: { last_page?: number } }>(path, { query: { page: n, per_page: PER_PAGE } }, 30000);
  const first = await page(1);
  const out = [...(first.data ?? [])];
  const last = Math.min(Number(first.meta?.last_page) || 1, 200);
  for (let n = 2; n <= last; n += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, last - n + 1) }, (_, i) => page(n + i)));
    for (const b of batch) out.push(...(b.data ?? []));
  }
  return out;
}

// ─── Lists ───

type PigeonCity = { id: number; name: string; name_en?: string | null; type?: string; postal_code?: string; municipality?: string; district?: string };
type PigeonOffice = {
  id: number;
  name: string;
  type?: string;
  address?: string;
  city?: { id?: number; name?: string; postal_code?: string } | null;
  postal_code?: string | null;
};
type SlimCity = City & { nameEn?: string; town: boolean };

/** All ~5300 Pigeon Express towns and villages (54 pages), cached for 24 h. */
function allCities(): Promise<SlimCity[]> {
  return cached("pigeon-cities-v1", DAY_MS, async () => {
    const cities = (await allPages<PigeonCity>("/cities")).map((c): SlimCity => {
      const town = c.type !== "село";
      const region = [
        town ? "" : "село",
        c.municipality && c.municipality !== c.name ? `общ. ${c.municipality}` : "",
        c.district ? `обл. ${c.district}` : "",
      ].filter(Boolean);
      return { id: String(c.id), name: c.name, nameEn: c.name_en || undefined, postcode: c.postal_code || undefined, region: region.join(", ") || undefined, town };
    });
    if (!cities.length) throw new CourierError("pigeon", "Pigeon Express върна празен списък с населени места.");
    return cities;
  });
}

function mapOffice(o: PigeonOffice): Office {
  const city = str(o.city?.name);
  const postcode = str(o.postal_code) || str(o.city?.postal_code);
  // "Разград, 7200, АПРИЛСКО ВЪСТАНИЕ, № 39": the city and postcode are shown separately.
  let address = str(o.address);
  if (city && address.startsWith(`${city}, `)) address = address.slice(city.length + 2);
  if (postcode && address.startsWith(`${postcode}, `)) address = address.slice(postcode.length + 2);
  return {
    id: String(o.id),
    name: o.name,
    address,
    city,
    cityId: o.city?.id != null ? String(o.city.id) : undefined,
    postcode: postcode || undefined,
    kind: o.type === "locker" ? "locker" : "office",
  };
}

/** All Pigeon Express offices and lockers (~450), cached for 24 h. */
function allOffices(): Promise<Office[]> {
  return cached("pigeon-offices-v1", DAY_MS, async () => {
    const offices = (await allPages<PigeonOffice>("/offices")).map(mapOffice);
    if (!offices.length) throw new CourierError("pigeon", "Pigeon Express върна празен списък с офиси.");
    return offices;
  });
}

/** Pigeon city id: the one chosen at checkout, else the only place with that name (and postcode). */
async function findCityId(place: { cityId?: string; city: string; postcode?: string }): Promise<number | null> {
  const fromId = Number.parseInt(place.cityId ?? "", 10);
  if (fromId > 0) return fromId;
  const city = place.city.replace(/^(гр|с)\.\s*/i, "").trim().toLocaleLowerCase("bg-BG");
  if (!city) return null;
  const exact = (await allCities()).filter((c) => c.name.toLocaleLowerCase("bg-BG") === city);
  const towns = exact.filter((c) => c.town);
  const pick = exact.find((c) => place.postcode && c.postcode === place.postcode) ?? (exact.length === 1 ? exact[0] : towns.length === 1 ? towns[0] : undefined);
  return pick ? Number(pick.id) : null;
}

/** The API wants "office" or "locker" depending on the point; the checkout lists both together. */
async function pointType(officeId: number): Promise<"office" | "locker"> {
  const office = (await allOffices()).find((o) => o.id === String(officeId));
  return office?.kind === "locker" ? "locker" : "office";
}

/** Where Pigeon takes the parcel: the drop-off office (PIGEON_DROPOFF_OFFICE_ID), else the sender's address. */
async function pickupPart(): Promise<Record<string, unknown>> {
  const s = sender();
  const officeId = Number.parseInt(s.pigeonOfficeId, 10);
  if (officeId > 0) return { pickup_type: await pointType(officeId), pickup_office_id: officeId };
  if (!s.city || s.address.length < 3) {
    throw new CourierError("pigeon", "Попълнете SENDER_CITY и SENDER_ADDRESS или PIGEON_DROPOFF_OFFICE_ID в .env.local.");
  }
  const cityId = await findCityId({ city: s.city, postcode: s.postcode });
  if (cityId == null) throw new CourierError("pigeon", `Pigeon Express не разпозна еднозначно града на подателя „${s.city}“. Попълнете SENDER_POSTCODE.`);
  return {
    pickup_type: "address",
    pickup_address: {
      city_id: cityId,
      ...(s.postcode ? { postal_code: s.postcode } : {}),
      // Without a street id the API takes the address as free text.
      additional_info: s.address.slice(0, 500),
      ...(s.contactName || s.name ? { contact_name: (s.contactName || s.name).slice(0, 255) } : {}),
      ...(s.phone ? { contact_phone: phoneBG(s.phone) } : {}),
    },
  };
}

function packageSize() {
  const m = (process.env.PIGEON_PACKAGE_SIZE ?? "").replace(/,/g, ".").match(/^\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*$/i);
  return m ? { length: Number(m[1]), width: Number(m[2]), height: Number(m[3]) } : DEFAULT_SIZE;
}

/** Contents list (1–100 lines); lines past the 99th are summed into one. */
function inventory(order: Order) {
  const lines = order.lines.map((l) => ({ description: (l.brand ? `${l.brand} ${l.name}` : l.name).slice(0, 200), quantity: l.qty }));
  if (lines.length <= 100) return lines.length ? lines : [{ description: CONTENTS, quantity: 1 }];
  const rest = lines.slice(99).reduce((n, l) => n + l.quantity, 0);
  return [...lines.slice(0, 99), { description: CONTENTS, quantity: rest }];
}

export const pigeon: CarrierAdapter = {
  id: "pigeon",
  isConfigured,

  async searchCities(query) {
    if (query.trim().length < 2) return [];
    return rankCities(await allCities(), query).map(({ id, name, postcode, region }) => ({ id, name, postcode, region }));
  },

  async listOffices({ cityId, query }) {
    let offices = await allOffices();
    if (cityId) offices = offices.filter((o) => o.cityId === cityId);
    if (query?.trim()) offices = rankBy(offices, query, (o) => [o.name, o.address, o.city, o.postcode, o.id]);
    return offices;
  },

  async createShipment(order, options) {
    const d = order.delivery;
    let delivery: Record<string, unknown>;
    if (d.needs === "address") {
      const cityId = await findCityId(d);
      if (cityId == null) throw new CourierError("pigeon", `Pigeon Express не разпозна еднозначно населеното място „${d.city}“${d.postcode ? ` (${d.postcode})` : ""}.`);
      delivery = { delivery_type: "address", delivery_address: { city_id: cityId, ...(d.postcode ? { postal_code: d.postcode } : {}), additional_info: d.address.slice(0, 500) } };
    } else {
      const officeId = Number.parseInt(d.officeId, 10);
      if (!(officeId > 0)) throw new CourierError("pigeon", "В поръчката няма избран офис или автомат на Pigeon Express.");
      delivery = { delivery_type: await pointType(officeId), delivery_office_id: officeId };
    }
    const weight = Math.max(0.1, eur(options.weightKg / options.parcels));
    const codes: Record<string, number> = {};
    if (options.codAmount > 0) codes.cod_amount = eur(options.codAmount);
    if (options.declaredValue > 0) codes.declared_value = eur(options.declaredValue);

    const res = await call<{ data?: Record<string, unknown> }>(
      "/shipments",
      {
        method: "POST",
        body: {
          receiver_name: order.customer.name.slice(0, 255),
          receiver_phone: phoneBG(order.customer.phone),
          receiver_email: order.customer.email,
          ...(await pickupPart()),
          ...delivery,
          packages: Array.from({ length: options.parcels }, () => ({ weight, ...packageSize() })),
          inventory_items: inventory(order),
          service_type: process.env.PIGEON_SERVICE_TYPE === "express" ? "express" : "standard",
          // The customer paid for delivery at checkout, so the shop pays Pigeon.
          who_pays: process.env.PIGEON_WHO_PAYS === "receiver" ? "receiver" : "sender",
          ...(Object.keys(codes).length ? { service_codes: codes } : {}),
          external_reference: order.number,
        },
      },
      30000,
    );
    // The answer also holds the label as base64; it is fetched again when printed instead of being stored.
    const created = res.data ?? {};
    const ref = str(created.reference_number);
    if (!ref) throw new CourierError("pigeon", "Pigeon Express не върна номер на товарителница.");
    return {
      shipmentId: ref,
      trackingNumber: ref,
      data: {
        packages: Array.isArray(created.packages) ? created.packages.map((p) => (isRecord(p) ? str(p.tracking_number) : "")).filter(Boolean) : [],
        status: str(created.status) || null,
      },
    };
  },

  async getLabelPdf(shipment) {
    const f = process.env.PIGEON_LABEL_FORMAT;
    const format = f === "pdf150" || f === "a4" ? f : "default";
    // JSON first so errors come back as JSON; the label itself is a PDF in these formats.
    const res = await request(`/shipments/${encodeURIComponent(shipment.shipmentId)}/label`, { query: { format }, accept: "application/json, application/pdf" }, 30000);
    if (!res.ok) throw pigeonError(await readJson(res), res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new CourierError("pigeon", "Pigeon Express не върна PDF с етикета.");
    return buf;
  },

  async cancelShipment(shipment) {
    // Only while the shipment is "shipment_registered" (not handed over yet); otherwise 422.
    await call(`/shipments/${encodeURIComponent(shipment.shipmentId)}/cancel`, { method: "POST" });
  },

  /** One page of the office list: every endpoint needs the API key, so this proves it. */
  async test() {
    const res = await call<{ data?: unknown[]; meta?: { total?: number } }>("/offices", { query: { per_page: 1 } });
    return Number(res.meta?.total) || res.data?.length || 0;
  },
};
