// Extra product pictures from lillydrogerie.bg (`npm run lilly`).
//
// The shop's public product sitemap lists every product page with its main picture, and the picture's file name
// carries the barcode ("…/1/4/144658-4059729547286.jpg"). Our products are matched by that barcode, then each matched
// page is read once (robots.txt allows product pages) and the pictures of its gallery are kept, at their original
// size. One page every 2 s with an honest User-Agent; products in stock first; stops after 10 refusals in a row and
// continues where it stopped on the next run.
//
//   npm run lilly                    every matched product
//   npm run lilly -- --limit 50      only 50 pages, for a test
//   npm run lilly -- --delay 3       seconds between pages
//
// Results: data/lilly/matches.json (SKU → page), data/lilly/pages.json (page → pictures). `npm run import` adds the
// pictures to the product pages.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "../src/lib/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "data", "lilly");
const SITEMAP = "https://lillydrogerie.bg/media/sitemap_products.xml";
const AGENT = "OmayaCatalogBot/1.0 (reads public product pages for product pictures; one page every 2 s)";
const GIVE_UP = 10;

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DELAY = Number(arg("--delay") ?? 2) * 1000;
const LIMIT = Number(arg("--limit") ?? Infinity);

export type LillyPage = { fetched: string; status: number; images: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);
function writeJson(file: string, data: unknown) {
  writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 1) + "\n");
  renameSync(`${file}.tmp`, file);
}

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": AGENT, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(30_000) });
}

/** Barcode (no leading zeros) → product page, from the barcodes in the main pictures' file names. */
async function sitemap(): Promise<Map<string, string>> {
  const res = await get(SITEMAP);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  const byEan = new Map<string, string>();
  for (const m of xml.matchAll(/<loc>(https:\/\/lillydrogerie\.bg\/[^<]+)<\/loc>[\s\S]*?<image:loc>([^<]+)<\/image:loc>/g)) {
    const file = m[2].split("/").pop() ?? "";
    for (const code of file.match(/(?<!\d)\d{8,14}(?!\d)/g) ?? []) {
      const key = code.replace(/^0+/, "");
      if (!byEan.has(key)) byEan.set(key, m[1]);
    }
  }
  return byEan;
}

/** The gallery of a Magento product page, as original-size picture URLs (the /cache/<hash>/ copies are resized). */
export function galleryOf(html: string): string[] {
  const urls = [...html.matchAll(/"full":"(https:[^"]+)"/g)].map((m) => m[1].replace(/\\\//g, "/").replace(/\/cache\/[0-9a-f]{32}\//, "/"));
  return [...new Set(urls)].filter((u) => /\/media\/catalog\/product\//.test(u) && !/placeholder/i.test(u));
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const catalog = JSON.parse(readFileSync(path.join(ROOT, "data", "catalog.json"), "utf8")) as Product[];
  const byEan = await sitemap();
  const matches: Record<string, string> = {};
  for (const p of catalog) {
    const page = p.ean ? byEan.get(p.ean.replace(/^0+/, "")) : undefined;
    if (page) matches[p.sku] = page;
  }
  writeJson(path.join(DIR, "matches.json"), matches);

  const pagesFile = path.join(DIR, "pages.json");
  const pages = readJson<Record<string, LillyPage>>(pagesFile, {});
  const stock = new Map(catalog.map((p) => [p.sku, p.stock]));
  // In stock first; each page once (shades of one product can share a page).
  const todo = [...new Set(
    Object.entries(matches)
      .sort((a, b) => Number((stock.get(b[0]) ?? 0) > 0) - Number((stock.get(a[0]) ?? 0) > 0))
      .map(([, page]) => page),
  )].filter((page) => !pages[page]).slice(0, LIMIT);
  console.log(`${byEan.size} barcodes on lillydrogerie.bg, ${Object.keys(matches).length} of our products matched, ${todo.length} pages to read`);

  let refused = 0;
  let read = 0;
  for (const page of todo) {
    let res: Response | Error;
    try {
      res = await get(page);
    } catch (e) {
      res = e as Error;
    }
    if (res instanceof Error || res.status === 429 || res.status === 403 || res.status >= 500) {
      refused++;
      const status = res instanceof Error ? res.message : res.status;
      if (refused >= GIVE_UP) {
        console.log(`✗ ${refused} refusals in a row (last: ${status}); stopping. Run again later to continue.`);
        break;
      }
      const wait = res instanceof Error ? 30 : Number(res.headers.get("retry-after")) || 60;
      console.log(`  ${status} for ${page} (${refused} in a row), waiting ${wait * refused} s`);
      await sleep(wait * refused * 1000);
      continue;
    }
    refused = 0;
    const html = res.ok ? await res.text() : "";
    pages[page] = { fetched: new Date().toISOString(), status: res.status, images: res.ok ? galleryOf(html) : [] };
    if (++read % 25 === 0) {
      writeJson(pagesFile, pages);
      const extra = Object.values(pages).filter((p) => p.images.length > 1).length;
      console.log(`  ${read} read, ${extra} pages so far with more than one picture`);
    }
    await sleep(DELAY);
  }
  writeJson(pagesFile, pages);
  const all = Object.values(pages);
  console.log(`✓ ${all.length} pages read in total; ${all.filter((p) => p.images.length > 1).length} with more than one picture.`);
  console.log("  Run `npm run import` to add the pictures to the product pages.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
