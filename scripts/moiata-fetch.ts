// Reads product descriptions from moiatakozmetika.com and matches them to our catalog, for `npm run enrich`.
//
//   npm run moiata                  (read the pages not read yet, then match)
//   npm run moiata -- --match-only  (only match the pages already read)
//   npm run moiata -- --limit 50 --delay 90 --min-overlap 0.5   (the defaults, without the limit)
//
// The shop is read the way its /agents.md allows: product addresses from its sitemap, one product page at a time, with
// a request name that says what we are, a pause between pages and a longer pause whenever it answers 429. When it keeps
// refusing, the run stops; the next run continues where this one stopped. Pages whose title shares a brand with our
// catalog are read first, those most like our products in stock before the rest.
//
// Results: data/moiata/pages.json (what each page says) and data/moiata/matches.json (our SKU → page). A page matches a
// product by barcode (EAN), or by brand, name and size when the page has no barcode.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "../src/lib/types";

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "data", "moiata");
const PAGES = path.join(DIR, "pages.json");
const MATCHES = path.join(DIR, "matches.json");
const SITE = "https://www.moiatakozmetika.com";
const AGENT = "OmayaCatalogBot/1.0 (reads public product pages for product descriptions; one page per minute)";

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DELAY = Number(arg("--delay") ?? 90) * 1000;
const LIMIT = Number(arg("--limit") ?? Infinity);
/** Keep the raw pages here too (for checking the parser). */
const HTML_DIR = arg("--html-dir");
/** Pages are read only when their title covers at least this share of the words of one of our product names. */
const MIN_OVERLAP = Number(arg("--min-overlap") ?? 0.5);
/** Consecutive refusals (429) after which the run gives up for now. */
const GIVE_UP = 10;

export type MoiataPage = {
  url: string;
  title: string;
  fetched: string;
  /** Barcodes of the page's variants. */
  gtins: string[];
  brand: string;
  /** The description as plain text, paragraphs separated by blank lines. */
  text: string;
  /** Other sections of the page ("Начин на употреба") as [title, text]. */
  sections: [string, string][];
  /** The ingredient list (INCI) from the page's "Съдържание" tab, or "". */
  ingredients: string;
  /** The product's pictures (missing on pages read before pictures were kept). */
  images?: string[];
};
export type MoiataMatch = { handle: string; how: "ean" | "name" };

type SitemapItem = { url: string; handle: string; title: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": AGENT, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(60_000) });
}

// ── Sitemap ──

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

async function sitemap(): Promise<SitemapItem[]> {
  const index = await (await get(`${SITE}/sitemap.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]*sitemap_products_[^<]*)<\/loc>/g)].map((m) => decode(m[1]));
  const items: SitemapItem[] = [];
  for (const map of maps) {
    await sleep(3000);
    const xml = await (await get(map)).text();
    for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const url = /<loc>([^<]*)<\/loc>/.exec(block)?.[1];
      if (!url || !url.includes("/products/")) continue;
      const title = /<image:title>([\s\S]*?)<\/image:title>/.exec(block)?.[1] ?? "";
      items.push({ url: decode(url), handle: decode(url).split("/products/")[1], title: decode(title).trim() });
    }
  }
  return items;
}

// ── One product page ──

const textOf = (html: string) =>
  decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|tr|section)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** The JSON object that starts at `from` (a "{"), as text. */
function jsonObjectAt(html: string, from: number): string {
  let depth = 0;
  let inString = false;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return html.slice(from, i + 1);
  }
  return "";
}

type ShopifyProduct = { title?: string; description?: string; vendor?: string; variants?: { barcode?: string | null }[]; images?: string[] };

/** The theme's product data for this page: {"id":…,"title":…,"handle":"<handle>","description":"<p>…",…}. */
function productJson(html: string, handle: string): ShopifyProduct | null {
  const at = html.indexOf(`"handle":${JSON.stringify(handle)}`);
  if (at < 0) return null;
  const from = html.lastIndexOf('{"id":', at);
  if (from < 0) return null;
  try {
    return JSON.parse(jsonObjectAt(html, from)) as ShopifyProduct;
  } catch {
    return null;
  }
}

/** A tab of the product page ("Описание", "Съдържание") as text. */
function tab(html: string, title: RegExp): string {
  for (const [, summary, body] of html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) {
    if (title.test(textOf(summary).replace(/\s+/g, " ").trim())) return textOf(body);
  }
  return "";
}

/** Paragraphs that only point to the shop's own categories ("Разгледайте продуктите ни от категорията …"). */
const SHOP_LINES = /разгледайте|вижте още|категорията|moiatakozmetika|разгледай/i;

export function parsePage(html: string, url: string, handle: string, sitemapTitle: string): MoiataPage {
  const product = productJson(html, handle);
  const gtins = new Set<string>();
  for (const v of product?.variants ?? []) if (digits(v.barcode).length >= 8) gtins.add(digits(v.barcode));
  for (const [, code] of html.matchAll(/"gtin1?[2-4]?"\s*:\s*"(\d{8,14})"/g)) gtins.add(code);

  const text = textOf(product?.description ?? tab(html, /^Описание$/i))
    .split(/\n\s*\n|\n/)
    .map((l) => l.trim())
    .filter((l) => l && !SHOP_LINES.test(l))
    .join("\n\n");
  const sections: [string, string][] = [];
  const usage = tab(html, /употреба|приложение|как се нанася|how to use/i);
  if (usage.length >= 20) sections.push(["Начин на употреба", usage]);
  const ingredients = tab(html, /^(?:Съдържание|Състав|Съставки|Ingredients)$/i)
    .replace(/^\s*(?:Състав|Съставки|Ingredients)\s*:\s*/i, "")
    .replace(/\*?\s*Този списък със съставки[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    url,
    title: product?.title ? decode(product.title) : sitemapTitle,
    fetched: new Date().toISOString(),
    gtins: [...gtins],
    brand: decode(product?.vendor ?? ""),
    text,
    sections,
    ingredients: ingredients.length >= 20 && ingredients.length <= 3000 ? ingredients : "",
    images: [...new Set((product?.images ?? []).filter((src) => typeof src === "string").map((src) => (src.startsWith("//") ? `https:${src}` : src)))],
  };
}

// ── Matching ──

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ё/g, "е");
const tokens = (s: string) => fold(s).match(/[\p{L}\p{N}]+/gu) ?? [];
const SIZE = /(\d+(?:[.,]\d+)?)\s?(мл|ml|г|g|гр)\b/iu;
const sizeOf = (s: string) => {
  const m = SIZE.exec(s);
  return m ? `${Number(m[1].replace(",", "."))}${/м|m/i.test(m[2]) ? "ml" : "g"}` : "";
};

/** How much of our product's name the page title covers: 1 = every word of our name is in the title. */
function overlap(p: Product, title: string): number {
  const brandWords = new Set(tokens(p.brand));
  const mine = [...new Set(tokens(p.name))].filter((t) => !brandWords.has(t) && !/^\d+$/.test(t) && t.length > 1);
  if (!mine.length) return 0;
  const theirs = new Set(tokens(title));
  return mine.filter((t) => theirs.has(t)).length / mine.length;
}

const brandIn = (p: Product, title: string) => Boolean(p.brand) && ` ${tokens(title).join(" ")} `.includes(` ${tokens(p.brand).join(" ")} `);

function match(products: Product[], pages: Record<string, MoiataPage>): Record<string, MoiataMatch> {
  const byEan = new Map<string, string>();
  for (const [handle, page] of Object.entries(pages)) for (const g of page.gtins) byEan.set(g.replace(/^0+/, ""), handle);
  // Pages per brand of ours, so a product is compared only with the pages of its brand.
  const byBrand = new Map<string, [string, MoiataPage][]>();
  for (const brand of new Set(products.map((p) => p.brand).filter(Boolean))) {
    const list = Object.entries(pages).filter(([, page]) => brandIn({ brand } as Product, page.title));
    if (list.length) byBrand.set(brand, list);
  }
  const out: Record<string, MoiataMatch> = {};
  for (const p of products) {
    const ean = digits(p.ean).replace(/^0+/, "");
    const handle = ean.length >= 8 ? byEan.get(ean) : undefined;
    if (handle) {
      out[p.sku] = { handle, how: "ean" };
      continue;
    }
    // Without a barcode match: every word of our name in the title, the same size, and only one such page. A page with
    // barcodes is the product with those barcodes, not ours.
    const found = (byBrand.get(p.brand) ?? []).filter(([, page]) => {
      if (page.gtins.length && ean.length >= 8) return false;
      if (overlap(p, page.title) < 1) return false;
      const a = sizeOf(p.name);
      const b = sizeOf(page.title);
      return !a || !b || a === b;
    });
    if (found.length === 1 && p.name.split(/\s+/).length >= 2) out[p.sku] = { handle: found[0][0], how: "name" };
  }
  return out;
}

// ── Run ──

async function main() {
  mkdirSync(DIR, { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "data", "catalog.json"), "utf8")) as Product[];
  const pages = readJson<Record<string, MoiataPage>>(PAGES, {});

  if (!args.includes("--match-only")) {
    const items = await sitemap();
    console.log(`${items.length} products in the moiatakozmetika.com sitemap, ${Object.keys(pages).length} read before`);
    // Read first the pages most like our products in stock.
    const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
    const byBrand = new Map<string, Product[]>();
    for (const p of products) if (p.brand) byBrand.set(p.brand, [...(byBrand.get(p.brand) ?? []), p]);
    // Pages matched by barcode that were read before pictures were kept are read once more, after the new ones.
    const matched = new Set(Object.values(readJson<Record<string, MoiataMatch>>(MATCHES, {})).filter((m) => m.how === "ean").map((m) => m.handle));
    const again = (handle: string) => Boolean(pages[handle]) && !pages[handle].images && matched.has(handle);
    const scored = items
      .filter((it) => !pages[it.handle] || again(it.handle))
      .map((it) => {
        let best = 0;
        for (const b of brands) {
          if (!brandIn({ brand: b } as Product, it.title)) continue;
          for (const p of byBrand.get(b)!) {
            const o = overlap(p, it.title);
            if (o >= MIN_OVERLAP) best = Math.max(best, o + (p.stock > 0 ? 1 : 0));
          }
        }
        return { it, best };
      })
      .filter((x) => x.best > 0)
      .sort((a, b) => Number(again(a.it.handle)) - Number(again(b.it.handle)) || b.best - a.best)
      .slice(0, LIMIT);
    console.log(`${scored.length} pages to read, one every ${DELAY / 1000} s`);

    let refused = 0;
    let read = 0;
    for (const { it } of scored) {
      await sleep(DELAY);
      const res = await get(it.url).catch((err: Error) => err);
      if (res instanceof Error || res.status === 429 || res.status >= 500) {
        refused++;
        const wait = res instanceof Error ? 60 : Number(res.headers.get("retry-after")) || 60;
        console.warn(`  ${res instanceof Error ? res.message : res.status} for ${it.handle} (${refused} in a row), waiting ${wait * refused} s`);
        if (refused >= GIVE_UP) {
          console.error(`✗ The shop keeps refusing (${refused} times in a row); stopped. Run \`npm run moiata\` later to continue.`);
          break;
        }
        await sleep(wait * refused * 1000);
        continue;
      }
      refused = 0;
      if (res.ok) {
        const html = await res.text();
        if (HTML_DIR) {
          mkdirSync(HTML_DIR, { recursive: true });
          writeFileSync(path.join(HTML_DIR, `${it.handle}.html`), html);
        }
        pages[it.handle] = parsePage(html, it.url, it.handle, it.title);
        writeFileSync(PAGES, JSON.stringify(pages, null, 1) + "\n");
        if (++read % 10 === 0) {
          const matches = match(products, pages);
          writeFileSync(MATCHES, JSON.stringify(matches, null, 1) + "\n");
          console.log(`  ${read} read, ${Object.keys(matches).length} of our products matched so far`);
        }
      }
    }
    console.log(`  ${read} pages read this run, ${Object.keys(pages).length} in total`);
  }

  const matches = match(products, pages);
  writeFileSync(MATCHES, JSON.stringify(matches, null, 1) + "\n");
  const byEan = Object.values(matches).filter((m) => m.how === "ean").length;
  console.log(`✓ ${Object.keys(matches).length} of our products matched (${byEan} by barcode) → data/moiata/matches.json`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
