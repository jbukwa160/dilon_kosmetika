import "server-only";
import { randomInt } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { z } from "zod";
import { applyBundles, type BundleClaim } from "./bundle-math";
import { getBySku } from "./catalog";
import { dataDir } from "./data-dir";
import { price } from "./format";
import { isBundle } from "./pairs";
import { findOffice, officeLabel, trackingUrl, type Shipment } from "./shipping";
import { bundleDiscount, CARRIERS, SHIPPING, shippingMethod, shippingPrice, SITE, type CarrierId, type ShippingMethodId } from "./site";
import { waybillUrl } from "./waybill-link";

const METHOD_IDS = SHIPPING.methods.map((m) => m.id) as [ShippingMethodId, ...ShippingMethodId[]];

export const MESSAGES = {
  name: "Въведете име и фамилия",
  tooLong: "Текстът е твърде дълъг",
  phone: "Въведете български телефонен номер, напр. 0888 123 456",
  email: "Въведете валиден имейл",
  method: "Изберете начин на доставка",
  city: "Въведете населено място",
  note: "Бележката е до 500 знака",
  qty: "До 20 бройки от продукт",
  empty: "Количката е празна",
  terms: "Нужно е да приемете общите условия",
  office: "Изберете офис или автомат от списъка",
  officeGone: "Този офис вече не приема пратки. Изберете друг.",
  address: "Въведете улица, номер, блок, вход, етаж",
  postcode: "Пощенският код е 4 цифри",
  required: "Попълнете това поле",
  check: "Моля, проверете отбелязаните полета.",
  busy: "Твърде много опити. Опитайте отново след няколко минути или ни се обадете.",
  invalid: "Невалидна заявка.",
  failed: "Поръчката не беше записана поради техническа грешка. Опитайте отново или ни се обадете.",
  gone: "Един от продуктите вече не се предлага. Премахнете го от количката.",
} as const;

/** True for messages written by us (zod's own default messages are English and technical). */
export function isOwnMessage(message: string): boolean {
  return (Object.values(MESSAGES) as string[]).includes(message);
}

export function orderSchema() {
  const m = MESSAGES;
  const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max, m.tooLong);
  return z
    .object({
      name: text(3, 80, m.name).refine((v) => v.split(/\s+/).length >= 2, m.name),
      phone: z
        .string()
        .transform((v) => v.replace(/[\s\-().]/g, ""))
        .pipe(z.string().regex(/^(?:\+359|00359|0)\d{8,9}$/, m.phone)),
      email: z.string().trim().max(120).pipe(z.email(m.email)),
      method: z.enum(METHOD_IDS, m.method),
      city: text(2, 60, m.city),
      /** The courier's id of the place, when it was picked from the courier's list. */
      cityId: z.string().trim().max(40).optional().default(""),
      postcode: z.string().trim().max(4).optional().default(""),
      /** The courier's id of the chosen office or locker. */
      officeId: z.string().trim().max(40).optional().default(""),
      /** The chosen office as shown to the customer, or what they typed when the courier's list could not load. */
      office: z.string().trim().max(240).optional().default(""),
      address: z.string().trim().max(160).optional().default(""),
      note: z.string().trim().max(500, m.note).optional().default(""),
      items: z
        .array(z.object({ sku: z.string().max(80), qty: z.number().int().min(1).max(20, m.qty) }))
        .min(1, m.empty)
        .max(60),
      /** Sets from "Перфектни заедно" (product first); checked and priced again here. */
      bundles: z
        .array(z.object({ skus: z.array(z.string().max(80)).min(2).max(4) }))
        .max(30)
        .optional()
        .default([]),
      terms: z.literal(true, m.terms),
      /** Honeypot: hidden from people, bots fill it in. */
      website: z.string().max(0).optional().default(""),
    })
    .superRefine((o, ctx) => {
      for (const [field, message] of Object.entries(deliveryIssues(o))) ctx.addIssue({ code: "custom", path: [field], message });
    });
}

/**
 * Office / address checks depend on the chosen method. Kept separate so the API can report them together with the
 * other field errors (zod skips refinements while any other field is invalid).
 */
export function deliveryIssues(o: Record<string, unknown>): Record<string, string> {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const needs = shippingMethod(str(o.method))?.needs;
  const issues: Record<string, string> = {};
  if (needs === "office" && !str(o.officeId) && str(o.office).length < 3) issues.office = MESSAGES.office;
  if (needs === "address") {
    if (str(o.address).length < 5) issues.address = MESSAGES.address;
    if (!/^\d{4}$/.test(str(o.postcode))) issues.postcode = MESSAGES.postcode;
  }
  return issues;
}

export type OrderInput = z.output<ReturnType<typeof orderSchema>>;

export type OrderLine = { sku: string; name: string; brand: string; slug: string; price: number; qty: number; total: number };

export type Order = {
  number: string;
  createdAt: string;
  customer: { name: string; phone: string; email: string };
  delivery: {
    method: ShippingMethodId;
    /** Missing in orders placed before the couriers were connected. */
    carrier?: CarrierId;
    needs: "office" | "address";
    label: string;
    city: string;
    /** The courier's id of the place ("" when typed by hand). */
    cityId: string;
    postcode: string;
    /** The office or locker as written for people; "" for delivery to an address. */
    office: string;
    /** The courier's id of the office ("" when typed by hand because the courier's list was down). */
    officeId: string;
    address: string;
  };
  note: string;
  lines: OrderLine[];
  /** All products at their own prices. */
  subtotal: number;
  /** Sets from "Перфектни заедно": which products, how many sets, the rate and how much off. */
  bundles: { skus: string[]; names: string[]; sets: number; discount: number; amount: number }[];
  /** What the sets save in total. */
  discount: number;
  shipping: number;
  total: number;
  payment: "cod";
  /** True while any product price in the order is an import estimate, not a confirmed price. */
  hasEstimatedPrices: boolean;
};

export class OrderError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Prices and stock always come from the catalog, never from the browser. */
export function buildOrder(input: OrderInput): Order {
  const lines: OrderLine[] = [];
  const problems: string[] = [];
  let estimated = false;
  const merged = new Map<string, number>();
  for (const item of input.items) merged.set(item.sku, (merged.get(item.sku) ?? 0) + item.qty);
  for (const [sku, qty] of merged) {
    const p = getBySku(sku);
    if (!p) {
      problems.push(MESSAGES.gone);
      continue;
    }
    if (p.stock < qty) {
      problems.push(p.stock > 0 ? `„${p.name}“: налични са само ${p.stock} бр.` : `„${p.name}“ вече е изчерпан.`);
      continue;
    }
    if (!p.priceConfirmed) estimated = true;
    lines.push({ sku, name: p.name, brand: p.brand, slug: p.slug, price: p.price, qty, total: round(p.price * qty) });
  }
  if (problems.length) throw new OrderError([...new Set(problems)].join(" "));

  const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
  // Only sets the product pages could offer get a discount, at the rate for their size and today's prices.
  const claims: BundleClaim[] = input.bundles.filter((b) => isBundle(b.skus)).map((b) => ({ skus: b.skus, discount: bundleDiscount(b.skus.length) }));
  const sets = applyBundles(lines, claims);
  const goods = round(subtotal - sets.discount);
  const shipping = shippingPrice(input.method, goods);
  const method = shippingMethod(input.method)!;
  const office = method.needs === "office";
  const now = new Date();
  return {
    number: orderNumber(now),
    createdAt: now.toISOString(),
    customer: { name: input.name, phone: input.phone, email: input.email },
    delivery: {
      method: input.method,
      carrier: method.carrier,
      needs: method.needs,
      label: method.label,
      city: input.city,
      cityId: input.cityId,
      postcode: input.postcode,
      office: office ? input.office : "",
      officeId: office ? input.officeId : "",
      address: office ? "" : input.address,
    },
    note: input.note,
    lines,
    subtotal,
    bundles: sets.applied.map((b) => ({ ...b, names: b.skus.map((sku) => lineName(lines.find((l) => l.sku === sku)!)) })),
    discount: sets.discount,
    shipping,
    total: round(goods + shipping),
    payment: "cod",
    hasEstimatedPrices: estimated,
  };
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function orderNumber(d: Date): string {
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `OM-${ymd}-${tail}`;
}

/**
 * Checks the chosen office against the courier's own list and writes it the courier's way. When the list cannot be
 * loaded the order is taken as the customer chose it; the shop confirms every order by phone anyway.
 */
export async function checkOffice(input: OrderInput): Promise<OrderInput> {
  const method = shippingMethod(input.method)!;
  if (method.needs !== "office" || !input.officeId) return input;
  const office = await findOffice(method.carrier, input.officeId);
  if (office === null) throw new OrderError(MESSAGES.check, { office: MESSAGES.officeGone });
  if (!office) return input;
  return { ...input, office: officeLabel(office), city: office.city || input.city, postcode: office.postcode ?? "" };
}

const ordersFile = () => path.join(dataDir(), "orders.jsonl");

/** One JSON object per line. This file is the order book of the shop: back it up. */
export async function saveOrder(order: Order): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await appendFile(ordersFile(), JSON.stringify(order) + "\n", "utf8");
}

/** The saved order with this number, or null. */
export async function findOrder(number: string): Promise<Order | null> {
  let text: string;
  try {
    text = await readFile(ordersFile(), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const needle = `"number":${JSON.stringify(number)}`;
  for (const line of text.split("\n").reverse()) {
    if (!line.includes(needle)) continue;
    try {
      const order = JSON.parse(line) as Order;
      if (order.number === number) return order;
    } catch {
      // A line cut short by a crash; the others are still good.
    }
  }
  return null;
}

// ── E-mail ──

function transport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const lineName = (l: OrderLine) => (l.brand ? `${l.brand} ${l.name}` : l.name);

/** Where the parcel goes, in one line. */
export function where(o: Order): string {
  const d = o.delivery;
  if (d.office) return `Офис/автомат: ${d.office}`;
  return `Адрес: ${d.address}, ${[d.postcode, d.city].filter(Boolean).join(" ")}`;
}

function summaryText(o: Order): string {
  const rows = o.lines.map((l) => `• ${lineName(l)} × ${l.qty} = ${price(l.total)}`).join("\n");
  return [
    rows,
    "",
    `Междинна сума: ${price(o.subtotal)}`,
    ...o.bundles.map(
      (b) => `Отстъпка „Перфектни заедно“ −${Math.round(b.discount * 100)}%: ${b.names.join(" + ")}${b.sets > 1 ? ` × ${b.sets}` : ""}: −${price(b.amount)}`,
    ),
    `Доставка: ${o.shipping ? price(o.shipping) : "безплатна"}`,
    `Общо за плащане при получаване: ${price(o.total)}`,
    "",
    o.delivery.label,
    where(o),
  ].join("\n");
}

function summaryHtml(o: Order): string {
  const rows = o.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${esc(lineName(l))} × ${l.qty}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${price(l.total)}</td></tr>`,
    )
    .join("");
  const sets = o.bundles
    .map(
      (b) =>
        `<tr><td style="padding:6px 0;color:#7b1f2e">Отстъпка „Перфектни заедно“ −${Math.round(b.discount * 100)}%: ${esc(b.names.join(" + "))}${b.sets > 1 ? ` × ${b.sets}` : ""}</td><td style="padding:6px 0;text-align:right;white-space:nowrap;color:#7b1f2e">−${price(b.amount)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font:15px/1.5 Arial,sans-serif;color:#1e1916">${rows}${sets}
<tr><td style="padding-top:12px;border-top:1px solid #e2d8cd">Доставка</td><td style="padding-top:12px;border-top:1px solid #e2d8cd;text-align:right">${o.shipping ? price(o.shipping) : "безплатна"}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">Общо за плащане при получаване</td><td style="text-align:right;font-weight:bold">${price(o.total)}</td></tr></table>
<p style="font:15px/1.5 Arial,sans-serif;color:#4a403a">${esc(o.delivery.label)}<br>${esc(where(o))}</p>`;
}

/** Sends the shop and the customer an e-mail. Never throws: the order is already saved. */
export async function mailOrder(o: Order): Promise<void> {
  const tr = transport();
  const waybill = waybillUrl(o.number);
  if (!tr) {
    console.warn(`[orders] ${o.number}: SMTP is not configured, the order is only in ${ordersFile()}${waybill ? `; waybill: ${waybill}` : ""}`);
    return;
  }
  const from = process.env.MAIL_FROM || `${SITE.name} <${SITE.email}>`;
  const shopTo = process.env.SHOP_EMAIL || SITE.email;
  const customer = [`Клиент: ${o.customer.name}`, `Телефон: ${o.customer.phone}`, `Имейл: ${o.customer.email}`, ...(o.note ? [`Бележка: ${o.note}`] : [])];
  const warning = o.hasEstimatedPrices ? "ВНИМАНИЕ: поне една цена в поръчката е приблизителна (не е потвърдена в data/prices.csv)." : "";
  const carrier = o.delivery.carrier ? CARRIERS[o.delivery.carrier] : "";
  const button = waybill
    ? `<p style="margin:24px 0"><a href="${esc(waybill)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#7b1f2e;color:#fbf8f4;font-weight:bold;text-decoration:none">Създай товарителница${carrier ? ` (${esc(carrier)})` : ""}</a></p><p style="color:#6b5f57;font-size:13px">Линкът е само за магазина: не го препращайте.</p>`
    : "";
  const jobs = [
    tr.sendMail({
      from,
      to: shopTo,
      replyTo: o.customer.email,
      subject: `Нова поръчка ${o.number} — ${price(o.total)}`,
      text: [customer.join("\n"), summaryText(o), warning, waybill ? `Създай товарителница${carrier ? ` (${carrier})` : ""}: ${waybill}` : ""].filter(Boolean).join("\n\n"),
      html: `<div style="font:15px/1.6 Arial,sans-serif;color:#1e1916;max-width:560px"><p>${customer.map(esc).join("<br>")}</p>${summaryHtml(o)}${warning ? `<p style="color:#8f5410"><strong>${esc(warning)}</strong></p>` : ""}${button}</div>`,
    }),
    tr.sendMail({
      from,
      to: o.customer.email,
      subject: `Поръчка ${o.number} е приета`,
      text: `Здравейте, ${o.customer.name}!\n\nПолучихме поръчката ви ${o.number}. Ще се свържем с вас за потвърждение в работно време.\n\n${summaryText(o)}\n\n${SITE.name}\n${SITE.phone} · ${SITE.email}`,
      html: `<div style="font:15px/1.6 Arial,sans-serif;color:#1e1916;max-width:560px"><p>Здравейте, ${esc(o.customer.name)}!</p><p>Получихме поръчката ви <strong>${o.number}</strong>. Ще се свържем с вас за потвърждение в работно време.</p>${summaryHtml(o)}<p style="color:#6b5f57">${esc(SITE.name)} · ${SITE.phone} · ${SITE.email}</p></div>`,
    }),
  ];
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error(`[orders] ${o.number}: e-mail failed`, r.reason);
}

/** Tells the customer the parcel is on its way, with the tracking link. Never throws: the waybill is already made. */
export async function mailShipped(o: Order, shipment: Shipment): Promise<void> {
  const tr = transport();
  if (!tr) return;
  const url = trackingUrl(shipment.carrier, shipment.trackingNumber);
  const carrier = CARRIERS[shipment.carrier];
  try {
    await tr.sendMail({
      from: process.env.MAIL_FROM || `${SITE.name} <${SITE.email}>`,
      to: o.customer.email,
      subject: `Поръчка ${o.number} е изпратена`,
      text: `Здравейте, ${o.customer.name}!\n\nИзпращаме поръчката ви ${o.number} с ${carrier}. Номер на товарителницата: ${shipment.trackingNumber}.\nПроследяване: ${url}\n\n${where(o)}\nЗа плащане при получаване: ${price(shipment.codAmount)}\n\n${SITE.name}\n${SITE.phone} · ${SITE.email}`,
      html: `<div style="font:15px/1.6 Arial,sans-serif;color:#1e1916;max-width:560px"><p>Здравейте, ${esc(o.customer.name)}!</p><p>Изпращаме поръчката ви <strong>${o.number}</strong> с ${esc(carrier)}. Номер на товарителницата: <strong>${esc(shipment.trackingNumber)}</strong>.</p><p><a href="${esc(url)}" style="color:#7b1f2e;font-weight:bold">Проследете пратката</a></p><p style="color:#4a403a">${esc(where(o))}<br>За плащане при получаване: ${price(shipment.codAmount)}</p><p style="color:#6b5f57">${esc(SITE.name)} · ${SITE.phone} · ${SITE.email}</p></div>`,
    });
  } catch (e) {
    console.error(`[orders] ${o.number}: shipping e-mail failed`, e);
  }
}

// ── Simple per-IP limits against spam bots ──
// Attempts (including ones with typos) are generous; placed orders are strict.

const hits = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;

function recent(key: string): number[] {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW)) hits.delete(k);
  return list;
}

/** Records an attempt. True when the IP sent more than 30 order requests in 15 minutes. */
export function tooManyAttempts(ip: string): boolean {
  const list = recent(`a:${ip}`);
  list.push(Date.now());
  return list.length > 30;
}

/** True when the IP already placed 5 orders in the last 15 minutes. */
export function tooManyOrders(ip: string): boolean {
  return recent(`o:${ip}`).length >= 5;
}

export function recordOrder(ip: string): void {
  recent(`o:${ip}`).push(Date.now());
}
