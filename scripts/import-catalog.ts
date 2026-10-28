// Builds data/catalog.json from the company-wide product export.
//
//   npm run import                                   (reads ../entire products_export (9).csv)
//   npm run import -- --file <csv>
//   npm run import -- --prices data/prices.csv       (real prices: columns SKU and Price)
//   npm run import -- --skip-images                  (keep the last picture check, no network)
//   npm run import -- --recheck-images               (download every picture again)
//
// Every picture is downloaded once and checked (cached in data/image-check.json for 7 days), so the shop never shows
// a broken picture, a tiny thumbnail or a supplier's "no photo" placeholder.

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { CATEGORY_BY_ID, findSub } from "../src/lib/taxonomy";
import type { GalleryPicture, Product, ProductDetails } from "../src/lib/types";
import { brandKey, Brands, isCanonicalBrand } from "./brands";
import { loadSources, sourceHash, type StoredDescription } from "./enrich-descriptions";
import type { MoiataMatch, MoiataPage } from "./moiata-fetch";
import { buildGalleries } from "./gallery";
import { checkImages } from "./images";
import { cleanDisplayName } from "./names";
import { estimatePrice } from "./prices";
import { classify, type CsvRow, factsFor, type FactsOut, imageUrl, matchText, notCosmeticBrand, type Place, type Rejection, selectRow, tagsFor } from "./rules";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const csvFile = path.resolve(arg("--file") ?? path.join(ROOT, "..", "entire products_export (9).csv"));
const pricesFile = path.resolve(arg("--prices") ?? path.join(ROOT, "data", "prices.csv"));
const skipImages = args.includes("--skip-images");
const recheck = args.includes("--recheck-images");

const DATA = path.join(ROOT, "data");
const OVERRIDES = path.join(DATA, "overrides");
mkdirSync(OVERRIDES, { recursive: true });

/** Pictures smaller than this (shorter side, px) look blurry even in a small card. */
const MIN_IMAGE_SIDE = 160;
/** Next.js accepts at most 50 picture hosts in images.remotePatterns. */
const MAX_IMAGE_HOSTS = 50;
/** Products created this many days before the newest one count as "new". */
const NEW_DAYS = 60;

type Candidate = {
  row: CsvRow;
  brand: string;
  /** Name without the brand, as shown in the shop. */
  name: string;
  place: Place;
  facts: FactsOut;
  image: string;
  stock: number;
};

const report = {
  rows: 0,
  rejected: {} as Record<Rejection, number>,
  unclassified: [] as string[],
  duplicates: 0,
  brokenImages: [] as string[],
  smallImages: [] as string[],
  placeholderImages: [] as string[],
  otherHosts: [] as string[],
};

/** SKUs left out on purpose (wrong picture from the supplier, not for sale...): one per line, # for comments. */
function excludedSkus(): Set<string> {
  const file = path.join(OVERRIDES, "excluded-skus.txt");
  if (!existsSync(file)) return new Set();
  return new Set(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean),
  );
}

async function readCandidates(): Promise<Candidate[]> {
  if (!existsSync(csvFile)) throw new Error(`CSV not found: ${csvFile}`);
  const excluded = excludedSkus();
  const kept: CsvRow[] = [];
  const brandCounts = new Map<string, number>();
  const parser = createParser();
  for await (const row of parser as AsyncIterable<CsvRow>) {
    report.rows++;
    const why = excluded.has(row.SKU) ? "excluded" : selectRow(row);
    if (why) {
      report.rejected[why] = (report.rejected[why] ?? 0) + 1;
      continue;
    }
    kept.push(row);
    const b = (row.Brand ?? "").trim();
    brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1);
  }
  console.log(`  ${report.rows.toLocaleString("en")} rows read, ${kept.length.toLocaleString("en")} look like cosmetics`);

  const brands = new Brands(brandCounts);
  const out: Candidate[] = [];
  for (const row of kept) {
    const { brand, name } = brands.resolve(row.Brand ?? "", row.Name ?? "");
    // The brand found in the name counts too: Wenko's soap dispensers have "#N/A" in the brand column.
    if (notCosmeticBrand(brand)) {
      report.rejected.excluded = (report.rejected.excluded ?? 0) + 1;
      continue;
    }
    const full = `${brand} ${name}`;
    const place = classify(name, full, row.Category ?? "", brand);
    if (!place) {
      report.rejected.unclassified = (report.rejected.unclassified ?? 0) + 1;
      report.unclassified.push(`${row.SKU} | ${row.Category} | ${row.Brand} | ${row.Name}`);
      continue;
    }
    const inventory = Math.max(0, Math.floor(Number(row.Inventory) || 0));
    const reserved = Math.max(0, Math.floor(Number(row.Reserved) || 0));
    out.push({
      row,
      brand,
      name: cleanDisplayName(name, { perfume: place.category === "parfyumi", brand }),
      place,
      facts: factsFor(full, place, brand),
      image: imageUrl(row)!,
      stock: Math.max(0, inventory - reserved),
    });
  }
  console.log(`  ${out.length.toLocaleString("en")} sorted into the shop's categories, ${report.unclassified.length} not recognised`);
  unifyBrands(out);
  return out;
}

/**
 * One spelling per brand: "Mommy care" and "Mommy Care", "Waysilk" and "Way Silk" become one brand page. The shop's
 * own spelling wins, then the most common one, then the one with more capitals.
 */
function unifyBrands(items: Candidate[]) {
  const forms = new Map<string, Map<string, number>>();
  for (const c of items) {
    if (!c.brand) continue;
    const key = brandKey(c.brand);
    const counts = forms.get(key) ?? new Map<string, number>();
    counts.set(c.brand, (counts.get(c.brand) ?? 0) + 1);
    forms.set(key, counts);
  }
  const capitals = (v: string) => (v.match(/(?:^|\s)\p{Lu}/gu) ?? []).length;
  const best = new Map<string, string>();
  for (const [key, counts] of forms) {
    const ranked = [...counts.entries()].sort(
      (a, b) => Number(isCanonicalBrand(b[0])) - Number(isCanonicalBrand(a[0])) || b[1] - a[1] || capitals(b[0]) - capitals(a[0]),
    );
    best.set(key, ranked[0][0]);
  }
  for (const c of items) if (c.brand) c.brand = best.get(brandKey(c.brand)) ?? c.brand;
}

function createParser() {
  return createReadStream(csvFile).pipe(parse({ columns: true, bom: true, relax_quotes: true, relax_column_count: true, skip_records_with_error: true }));
}

/** Same product under several SKUs: keep the one with stock, then the newest. */
function dedupe(items: Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  const better = (a: Candidate, b: Candidate) => (a.stock !== b.stock ? a.stock > b.stock : a.row.Updated > b.row.Updated);
  for (const c of items) {
    const ean = (c.row.EAN ?? "").replace(/\D/g, "");
    const keys = [`n:${c.brand.toLowerCase()}|${c.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`];
    if (ean.length >= 8 && !/^0+$/.test(ean)) keys.push(`e:${ean}`);
    const existingKey = keys.find((k) => byKey.has(k));
    if (!existingKey) {
      for (const k of keys) byKey.set(k, c);
      continue;
    }
    report.duplicates++;
    const existing = byKey.get(existingKey)!;
    const winner = better(c, existing) ? c : existing;
    for (const [k, v] of byKey) if (v === existing) byKey.set(k, winner);
    for (const k of keys) byKey.set(k, winner);
  }
  return [...new Set(byKey.values())];
}

// ── Text helpers ──

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya", ё: "yo",
  ы: "y", э: "e",
};

export function translit(text: string): string {
  return text.toLowerCase().replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? ch);
}

export function slugify(text: string): string {
  return translit(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

// ── Perfume gender ──

type GenderFile = Record<string, { g: "w" | "m" | "u"; name?: string }>;

/**
 * Perfumes whose name does not say whom they are for: the checked list in data/overrides/perfume-gender.json decides
 * (SKU → "w" | "m" | "u"); without an entry they stay unisex and are listed in perfume-gender-todo.json for checking.
 * (Guessing from the house does not work: Verset, for one, marks only its men's line.)
 */
function settlePerfumeGender(items: Candidate[]) {
  const file = path.join(OVERRIDES, "perfume-gender.json");
  const known: GenderFile = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const todo: { sku: string; brand: string; name: string }[] = [];
  for (const c of items) {
    if (c.place.category !== "parfyumi") continue;
    const k = known[c.row.SKU];
    if (k && ["uniseks", "damski", "mazhki"].includes(c.place.sub)) {
      c.place = { category: "parfyumi", sub: k.g === "w" ? "damski" : k.g === "m" ? "mazhki" : "uniseks" };
      c.facts.gender = k.g;
      continue;
    }
    if (c.place.sub === "uniseks" && c.facts.gender !== "u" && !k) todo.push({ sku: c.row.SKU, brand: c.brand, name: c.name });
  }
  writeFileSync(path.join(OVERRIDES, "perfume-gender-todo.json"), JSON.stringify(todo, null, 1) + "\n");
  if (todo.length) console.log(`  ${todo.length} perfumes do not say whom they are for — listed in data/overrides/perfume-gender-todo.json`);
}

// ── Shades and sizes ──

const DIGIT_TOKEN = /\d/;

/**
 * Groups shades and sizes of one product: same brand, same subcategory, same name up to the first word with a digit
 * ("Color Expert лак за нокти N119" / "...N047"). The rest of the name is the variant label ("N119", "100 мл").
 */
function assignFamilies(products: Product[]) {
  const groups = new Map<string, { p: Product; label: string }[]>();
  for (const p of products) {
    const tokens = p.name.split(" ");
    const i = tokens.findIndex((t, idx) => idx > 0 && (DIGIT_TOKEN.test(t) || (/^(?:№|no\.?|n|nr\.?|#)$/i.test(t) && DIGIT_TOKEN.test(tokens[idx + 1] ?? ""))));
    if (i <= 0) continue;
    const stem = tokens.slice(0, i).join(" ").replace(/[\s,.;:\-–|/(]+$/u, "").trim();
    if (!/\p{L}{3}/u.test(stem)) continue;
    const label = tokens.slice(i).join(" ").replace(/^[\s,.;:\-–|/]+/u, "").trim();
    // A long rest of the name means another product of the line, not a shade or a size.
    if (!label || label.length > 30 || label.split(" ").length > 5) continue;
    const key = `${p.brandSlug}|${p.category}|${p.sub}|${stem.toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push({ p, label });
    groups.set(key, list);
  }
  let families = 0;
  for (const [key, list] of groups) {
    const labels = new Set(list.map((x) => x.label.toLowerCase()));
    if (list.length < 2 || labels.size < 2) continue;
    families++;
    const id = slugify(key).slice(0, 80) || key;
    for (const { p, label } of list) {
      p.family = id;
      p.variant = label;
    }
  }
  console.log(`  ${families} product lines come in several shades or sizes`);
}

// ── Prices ──

function readPrices(): Map<string, number> {
  const prices = new Map<string, number>();
  if (!existsSync(pricesFile)) return prices;
  const lines = readFileSync(pricesFile, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const skuCol = head.findIndex((h) => h === "sku");
  const priceCol = head.findIndex((h) => h === "price" || h === "цена");
  if (skuCol < 0 || priceCol < 0) throw new Error(`${pricesFile}: needs the columns "SKU" and "Price"`);
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const value = Number(cells[priceCol]?.replace(",", "."));
    if (cells[skuCol] && value > 0) prices.set(cells[skuCol], Math.round(value * 100) / 100);
  }
  console.log(`  ${prices.size} confirmed prices from ${path.relative(ROOT, pricesFile)}`);
  return prices;
}

const CLEAN_HOSTS = /lillydrogerie\.bg|notinoimg\.com|dm-static\.com|ozone\.bg|dodis\.bg|benu\.bg|barecare\.bg/;

async function main() {
  console.log(`Reading ${csvFile}`);
  const candidates = dedupe(await readCandidates());
  console.log(`  ${candidates.length.toLocaleString("en")} unique products after merging ${report.duplicates} duplicates`);

  const checks = await checkImages(
    candidates.map((c) => c.image),
    { cacheFile: path.join(DATA, "image-check.json"), skip: skipImages, recheck },
  );
  // A picture shared by unrelated products (different names in several subcategories) is a placeholder.
  const hashUsers = new Map<string, { names: Set<string>; subs: Set<string> }>();
  for (const c of candidates) {
    const h = checks.get(c.image)?.hash;
    if (!h) continue;
    const u = hashUsers.get(h) ?? { names: new Set(), subs: new Set() };
    u.names.add(`${c.brand}|${c.name.split(" ").slice(0, 3).join(" ")}`);
    u.subs.add(c.place.sub);
    hashUsers.set(h, u);
  }
  const usable = candidates.filter((c) => {
    const check = checks.get(c.image);
    if (!check?.ok) {
      report.brokenImages.push(`${c.row.SKU} ${c.image} (${check?.status ?? "unchecked"})`);
      return false;
    }
    if (Math.min(check.w, check.h) < MIN_IMAGE_SIDE) {
      report.smallImages.push(`${c.row.SKU} ${c.image} (${check.w}×${check.h})`);
      return false;
    }
    const u = hashUsers.get(check.hash);
    if (u && u.names.size >= 4 && u.subs.size >= 3) {
      report.placeholderImages.push(`${c.row.SKU} ${c.image}`);
      return false;
    }
    return true;
  });
  console.log(
    `  ${usable.length.toLocaleString("en")} with a good picture (${report.brokenImages.length} broken, ${report.smallImages.length} too small, ${report.placeholderImages.length} placeholders)`,
  );
  // Next.js optimises pictures from at most 50 hosts. Keep the 50 hosts that carry the most products; the few
  // products on other hosts are left out (listed in the report).
  const hostOf = (u: string) => new URL(u).hostname;
  const perHost = new Map<string, number>();
  for (const c of usable) perHost.set(hostOf(c.image), (perHost.get(hostOf(c.image)) ?? 0) + 1);
  const allowed = new Set([...perHost.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_IMAGE_HOSTS).map(([h]) => h));
  for (let i = usable.length - 1; i >= 0; i--) {
    if (allowed.has(hostOf(usable[i].image))) continue;
    report.otherHosts.push(`${usable[i].row.SKU} ${usable[i].image}`);
    usable.splice(i, 1);
  }

  settlePerfumeGender(usable);

  const prices = readPrices();
  const brandSize = new Map<string, number>();
  for (const c of usable) brandSize.set(c.brand, (brandSize.get(c.brand) ?? 0) + 1);
  const newest = usable.reduce((max, c) => (c.row.Created > max ? c.row.Created : max), "");
  const newSince = new Date(Date.parse(newest || new Date().toISOString()) - NEW_DAYS * 24 * 3600 * 1000).toISOString();

  const slugs = new Set<string>();
  const products: Product[] = usable.map((c) => {
    const check = checks.get(c.image)!;
    let slug = slugify(`${c.brand} ${c.name}`) || slugify(c.row.SKU) || "produkt";
    if (slugs.has(slug)) slug = `${slug}-${slugify(c.row.SKU)}`.slice(0, 110);
    slugs.add(slug);
    const confirmed = prices.get(c.row.SKU);
    const created = c.row.Created || c.row.Updated || "";
    const tags = tagsFor(`${c.brand} ${c.name}`, c.place, c.brand) as Product["tags"];
    if (created >= newSince && c.stock > 0) tags.unshift("novo");
    const side = Math.min(check.w, check.h);
    const ean = (c.row.EAN ?? "").replace(/\D/g, "");
    return {
      sku: c.row.SKU,
      slug,
      name: c.name,
      brand: c.brand,
      brandSlug: c.brand ? slugify(c.brand) : "",
      category: c.place.category,
      sub: c.place.sub,
      tags,
      price: confirmed ?? estimatePrice(c.row.SKU, `${c.brand} ${matchText(c.name)}`, c.brand, c.place, c.facts),
      priceConfirmed: confirmed !== undefined,
      stock: c.stock,
      image: c.image,
      iw: check.w,
      ih: check.h,
      ean: ean.length >= 8 && !/^0+$/.test(ean) ? ean : "",
      facts: c.facts,
      created,
      rank:
        (c.stock > 0 ? 1000 : 0) +
        (side >= 600 ? 60 : side >= 400 ? 40 : side >= 250 ? 15 : 0) +
        (CLEAN_HOSTS.test(c.image) ? 20 : 0) +
        Math.round(Math.log2(1 + (brandSize.get(c.brand) ?? 0)) * 6) +
        (c.brand ? 10 : 0) +
        (created >= newSince ? 15 : 0) +
        Math.min(10, Math.floor(c.stock / 5)),
    };
  });
  assignFamilies(products);
  products.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "bg"));

  writeFileSync(path.join(DATA, "catalog.json"), JSON.stringify(products));
  const hosts = [...new Set(products.map((p) => new URL(p.image).hostname))].sort();
  writeFileSync(path.join(DATA, "image-hosts.json"), JSON.stringify(hosts, null, 2) + "\n");
  const galleries = await buildGalleries(products, { dataDir: DATA, hosts, cacheFile: path.join(DATA, "image-check.json"), network: !skipImages });
  writeDetails(products, galleries);
  writeFileSync(path.join(DATA, "import-report.json"), JSON.stringify(report, null, 2) + "\n");

  const perCategory = new Map<string, number>();
  for (const p of products) perCategory.set(p.category, (perCategory.get(p.category) ?? 0) + 1);
  console.log(`✓ ${products.length.toLocaleString("en")} products written to data/catalog.json (${products.filter((p) => p.stock > 0).length.toLocaleString("en")} in stock)`);
  for (const [id, count] of perCategory) console.log(`    ${CATEGORY_BY_ID.get(id)!.name}: ${count}`);
  for (const p of products) if (!findSub(p.category, p.sub)) throw new Error(`Unknown subcategory ${p.category}/${p.sub} for ${p.sku}`);
  console.log(`  details of what was skipped: data/import-report.json`);
}

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

/**
 * data/details.json for the product pages: the descriptions from `npm run enrich` that are still current (one written
 * from a source that changed since — a renamed product, a new page on moiatakozmetika.com — waits for the next
 * `npm run enrich`), and the ingredient list of products matched on moiatakozmetika.com by barcode.
 */
function writeDetails(products: Product[], galleries: Map<string, GalleryPicture[]>) {
  const stored = readJson<Record<string, StoredDescription>>(path.join(DATA, "descriptions", "descriptions.json"), {});
  const pages = readJson<Record<string, MoiataPage>>(path.join(DATA, "moiata", "pages.json"), {});
  const matches = readJson<Record<string, MoiataMatch>>(path.join(DATA, "moiata", "matches.json"), {});
  const sourceOf = loadSources();
  const details: Record<string, ProductDetails> = {};
  let stale = 0;
  let copies = 0;
  let ingredients = 0;
  for (const p of products) {
    const entry: ProductDetails = {};
    const d = stored[p.sku];
    if (d && d.source === sourceHash(p, sourceOf(p))) {
      entry.copy = { lead: d.lead, body: d.body, highlights: d.highlights, usage: d.usage, basis: d.basis };
      copies++;
    } else if (d) stale++;
    // A name match may be another size or version; only a barcode match is sure enough for an ingredient list.
    const m = matches[p.sku];
    if (m?.how === "ean" && pages[m.handle]?.ingredients) {
      entry.ingredients = pages[m.handle].ingredients;
      ingredients++;
    }
    const gallery = galleries.get(p.sku);
    if (gallery) entry.gallery = gallery;
    if (entry.copy || entry.ingredients || entry.gallery) details[p.sku] = entry;
  }
  writeFileSync(path.join(DATA, "details.json"), JSON.stringify(details));
  console.log(`  ${copies} descriptions, ${ingredients} ingredient lists${stale ? `, ${stale} descriptions out of date — run \`npm run enrich\`` : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
