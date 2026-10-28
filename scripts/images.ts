// Downloads every product picture once and records whether it works, its size, a hash of the bytes and a
// fingerprint of what it shows. Results are cached in data/image-check.json (re-checked after 7 days), so the import
// can drop broken pictures, tiny thumbnails, "no photo" placeholders and repeated gallery pictures without hitting the
// suppliers again.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { imageSize } from "image-size";

export type ImageCheck = {
  ok: boolean;
  status: number;
  bytes: number;
  /** sha1 of the bytes; the same hash on unrelated products means a placeholder picture. */
  hash: string;
  /**
   * What the picture shows, as a 64-bit difference hash (hex): two pictures of the same packshot at other sizes or
   * from other shops differ in a few bits only. Missing on checks made before it was kept.
   */
  dh?: string;
  type: string;
  w: number;
  h: number;
  at: string;
};

const WEEK = 7 * 24 * 3600 * 1000;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

type Sharp = (typeof import("sharp"))["default"];
let sharpLib: Promise<Sharp | null> | undefined;
/** sharp comes with Next.js; without it pictures are still checked, only without a fingerprint. */
const loadSharp = () => (sharpLib ??= import("sharp").then((m) => m.default).catch(() => null));

/** Difference hash: 9×8 grey pixels on white, one bit per pair of neighbours. */
async function dhash(body: Buffer): Promise<string | undefined> {
  const sharp = await loadSharp();
  if (!sharp) return undefined;
  try {
    const px = await sharp(body).flatten({ background: "#ffffff" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
    let hex = "";
    for (let y = 0; y < 8; y++) {
      for (let half = 0; half < 2; half++) {
        let nibble = 0;
        for (let x = half * 4; x < half * 4 + 4; x++) nibble = (nibble << 1) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0);
        hex += nibble.toString(16);
      }
    }
    return hex;
  } catch {
    return undefined;
  }
}

/** How many of the 64 bits two fingerprints differ in (0 = the same picture). */
export function dhDistance(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    for (; x; x >>= 1) n += x & 1;
  }
  return n;
}

export function loadImageCache(file: string): Record<string, ImageCheck> {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

function saveCache(file: string, cache: Record<string, ImageCheck>) {
  writeFileSync(`${file}.tmp`, JSON.stringify(cache));
  renameSync(`${file}.tmp`, file);
}

async function checkOne(url: string, attempt = 1): Promise<ImageCheck> {
  const at = new Date().toISOString();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
    });
    const body = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    let w = 0;
    let h = 0;
    let kind = "";
    try {
      const size = imageSize(body);
      w = size.width ?? 0;
      h = size.height ?? 0;
      kind = size.type ?? "";
    } catch {
      // Not an image (HTML error page, empty body...).
    }
    const ok = res.ok && body.length > 1500 && w > 0 && h > 0;
    if (!ok && attempt < 3 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return checkOne(url, attempt + 1);
    }
    const dh = ok ? await dhash(body) : undefined;
    return { ok, status: res.status, bytes: body.length, hash: createHash("sha1").update(body).digest("hex"), ...(dh ? { dh } : {}), type: kind || type, w, h, at };
  } catch {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return checkOne(url, attempt + 1);
    }
    return { ok: false, status: 0, bytes: 0, hash: "", type: "", w: 0, h: 0, at };
  }
}

/**
 * Checks the URLs that are not in the cache (or are older than a week). At most `perHost` requests run against one
 * supplier at a time, `total` overall. `onlyNew` skips the weekly re-check; `fingerprints` also re-checks working
 * pictures that were checked before fingerprints were kept.
 */
export async function checkImages(
  urls: string[],
  opts: { cacheFile: string; recheck?: boolean; skip?: boolean; onlyNew?: boolean; fingerprints?: boolean; perHost?: number; total?: number },
): Promise<Map<string, ImageCheck>> {
  const cache = loadImageCache(opts.cacheFile);
  if (opts.skip) return new Map(Object.entries(cache));
  const stale = (c: ImageCheck) => !opts.onlyNew && Date.now() - Date.parse(c.at) > WEEK;
  const todo = [...new Set(urls)].filter((u) => opts.recheck || !cache[u] || stale(cache[u]) || (opts.fingerprints && cache[u].ok && !cache[u].dh));
  console.log(`  checking ${todo.length} pictures (${urls.length - todo.length} cached)`);
  if (!todo.length) return new Map(Object.entries(cache));

  const host = (u: string) => {
    try {
      return new URL(u).hostname;
    } catch {
      return "?";
    }
  };
  const queues = new Map<string, string[]>();
  for (const u of todo) {
    const h = host(u);
    const q = queues.get(h) ?? [];
    q.push(u);
    queues.set(h, q);
  }
  const active = new Map<string, number>();
  const perHost = opts.perHost ?? 8;
  const total = opts.total ?? 32;
  let done = 0;
  let lastSave = Date.now();

  const next = (): string | undefined => {
    // The host with the longest queue that still has a free slot goes first, so big suppliers finish in time.
    let best: string | undefined;
    for (const [h, q] of queues) {
      if (!q.length || (active.get(h) ?? 0) >= perHost) continue;
      if (!best || q.length > queues.get(best)!.length) best = h;
    }
    if (!best) return undefined;
    active.set(best, (active.get(best) ?? 0) + 1);
    return queues.get(best)!.pop();
  };

  await new Promise<void>((resolve) => {
    let running = 0;
    const pump = () => {
      while (running < total) {
        const url = next();
        if (!url) break;
        running++;
        checkOne(url).then((result) => {
          cache[url] = result;
          const h = host(url);
          active.set(h, (active.get(h) ?? 1) - 1);
          running--;
          done++;
          if (done % 250 === 0) {
            process.stdout.write(`    ${done}/${todo.length}\n`);
            if (Date.now() - lastSave > 20_000) {
              saveCache(opts.cacheFile, cache);
              lastSave = Date.now();
            }
          }
          if (done === todo.length) resolve();
          else pump();
        });
      }
    };
    pump();
  });
  saveCache(opts.cacheFile, cache);
  return new Map(Object.entries(cache));
}
