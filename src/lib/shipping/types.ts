// Shared by the checkout (client) and the courier adapters (server). Client components import from here only;
// "./index" is server-only.
import { CARRIERS, type CarrierId } from "@/lib/site";

export type { CarrierId } from "@/lib/site";

export type City = {
  /** Courier specific id (Speedy site id, Econt / Pigeon city id, BOX NOW: the city name). */
  id: string;
  name: string;
  postcode?: string;
  /** "общ. Х, обл. Y" or "село, обл. Y", to tell places with the same name apart. */
  region?: string;
};

export type Office = {
  /** Courier specific id (Speedy office id, Econt office code, BOX NOW locker id, Pigeon office id). */
  id: string;
  name: string;
  address: string;
  city: string;
  cityId?: string;
  postcode?: string;
  kind: "office" | "locker";
  /** Extra info shown in the picker, e.g. "24/7, вътре в мола" (BOX NOW). */
  note?: string;
};

export const CARRIER_IDS = Object.keys(CARRIERS) as CarrierId[];

export function isCarrier(v: unknown): v is CarrierId {
  return typeof v === "string" && v in CARRIERS;
}

/** "Speedy офис „Люлин 5“, ул. … , София" — how a chosen office is written in the order and the e-mails. */
export function officeLabel(o: Pick<Office, "name" | "address" | "city">): string {
  const parts = [o.name];
  if (o.address && !o.name.includes(o.address)) parts.push(o.address);
  if (o.city && !parts.some((p) => p.includes(o.city))) parts.push(o.city);
  return parts.join(", ");
}

export function trackingUrl(carrier: CarrierId, trackingNumber: string): string {
  const n = encodeURIComponent(trackingNumber);
  switch (carrier) {
    case "speedy":
      return `https://www.speedy.bg/bg/track-shipment?shipmentNumber=${n}`;
    case "econt":
      return `https://www.econt.com/services/track-shipment/${n}`;
    case "boxnow":
      return `https://boxnow.bg/?track=${n}`;
    case "pigeon":
      return `https://track.pigeonexpress.com/?tracking_number=${n}`;
  }
}
