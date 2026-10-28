// More pictures per product for the product page, from the pages read by `npm run lilly` (lillydrogerie.bg) and
// `npm run moiata` (moiatakozmetika.com, barcode matches only). Every picture is checked like the main ones; broken,
// small and banner pictures (the same file on many products) are left out, and so is any picture that shows the same
// as the main picture or one already kept (fingerprints a few bits apart).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { GalleryPicture, Product } from "../src/lib/types";
import { checkImages, dhDistance, type ImageCheck } from "./images";
import type { LillyPage } from "./lilly-fetch";
import type { MoiataMatch, MoiataPage } from "./moiata-fetch";

const MAX_EXTRA = 6;
const MIN_SIDE = 300;
/** Fingerprints at most this many bits apart (of 64) show the same picture. */
const SAME = 10;
/** A file on more products than this is a banner or a brand picture, not a photo of the product. */
const BANNER = 8;

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

/** Shopify resizes on its own CDN; pictures from hosts Next.js may not optimise are asked for at this width. */
function direct(url: string): string {
  const u = new URL(url);
  if (u.pathname.includes("/cdn/shop/") || u.hostname === "cdn.shopify.com") u.searchParams.set("width", "1200");
  return u.toString();
}

export async function buildGalleries(
  products: Product[],
  { dataDir, hosts, cacheFile, network }: { dataDir: string; hosts: string[]; cacheFile: string; network: boolean },
): Promise<Map<string, GalleryPicture[]>> {
  const lillyMatches = readJson<Record<string, string>>(path.join(dataDir, "lilly", "matches.json"), {});
  const lillyPages = readJson<Record<string, LillyPage>>(path.join(dataDir, "lilly", "pages.json"), {});
  const moiataMatches = readJson<Record<string, MoiataMatch>>(path.join(dataDir, "moiata", "matches.json"), {});
  const moiataPages = readJson<Record<string, MoiataPage>>(path.join(dataDir, "moiata", "pages.json"), {});

  const candidates = new Map<string, string[]>();
  for (const p of products) {
    const list = [...(lillyPages[lillyMatches[p.sku]]?.images ?? [])];
    const m = moiataMatches[p.sku];
    // A name match may be another size or shade; only a barcode match is sure enough for its pictures.
    if (m?.how === "ean") list.push(...(moiataPages[m.handle]?.images ?? []));
    const extra = [...new Set(list)].filter((u) => u !== p.image);
    if (extra.length) candidates.set(p.sku, extra);
  }
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const urls = [...candidates].flatMap(([sku, list]) => [bySku.get(sku)!.image, ...list]);
  console.log(`  gallery: ${candidates.size} products with pictures from other pages`);
  // New pictures are checked even with --skip-images (once; they are cached), the main ones only for a fingerprint.
  const checks: Map<string, ImageCheck> = await checkImages(urls, { cacheFile, onlyNew: !network, fingerprints: true, perHost: 4 });

  const uses = new Map<string, number>();
  for (const list of candidates.values()) for (const u of list) {
    const h = checks.get(u)?.hash;
    if (h) uses.set(h, (uses.get(h) ?? 0) + 1);
  }

  const allowed = new Set(hosts);
  const out = new Map<string, GalleryPicture[]>();
  let pictures = 0;
  for (const [sku, list] of candidates) {
    const main = checks.get(bySku.get(sku)!.image);
    const seen: string[] = main?.dh ? [main.dh] : [];
    const hashes = new Set(main?.hash ? [main.hash] : []);
    const kept: GalleryPicture[] = [];
    for (const url of list) {
      const c = checks.get(url);
      if (!c?.ok || !c.dh || Math.min(c.w, c.h) < MIN_SIDE || hashes.has(c.hash) || (uses.get(c.hash) ?? 0) > BANNER) continue;
      if (seen.some((d) => dhDistance(d, c.dh!) <= SAME)) continue;
      seen.push(c.dh);
      hashes.add(c.hash);
      const host = new URL(url).hostname;
      kept.push(allowed.has(host) ? { src: url, w: c.w, h: c.h } : { src: direct(url), w: c.w, h: c.h, direct: true });
      if (kept.length >= MAX_EXTRA) break;
    }
    if (kept.length) {
      out.set(sku, kept);
      pictures += kept.length;
    }
  }
  console.log(`  gallery: ${pictures} more pictures on ${out.size} products`);
  return out;
}
