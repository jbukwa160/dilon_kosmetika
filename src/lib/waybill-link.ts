// The link in the shop's order e-mail to /tovaritelnitsa/<number>?k=<key>. The key is an HMAC of the order number
// with WAYBILL_SECRET, so only someone with the e-mail can open the order's waybill page.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "./site";

const secret = () => (process.env.WAYBILL_SECRET ?? "").trim();

/** The key in an order's waybill link, or null while WAYBILL_SECRET is not set (no links, the page answers 404). */
export function waybillKey(number: string): string | null {
  const s = secret();
  if (s.length < 16) return null;
  return createHmac("sha256", s).update(`waybill:${number}`).digest("base64url").slice(0, 32);
}

export function waybillUrl(number: string): string | null {
  const key = waybillKey(number);
  return key ? `${SITE.url}/tovaritelnitsa/${encodeURIComponent(number)}?k=${key}` : null;
}

export function isWaybillKey(number: string, key: unknown): boolean {
  const want = waybillKey(number);
  if (!want || typeof key !== "string" || key.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(want));
}
