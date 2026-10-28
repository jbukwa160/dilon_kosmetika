import "server-only";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { ProductDetails } from "./types";

// Product descriptions, written by `npm run enrich` and published by `npm run import` into data/details.json. Read once
// per server process; in development a newer file is picked up on the next request. No file means no descriptions.

const FILE = path.join(process.cwd(), "data", "details.json");

let details: Record<string, ProductDetails> | null = null;
let loadedAt = 0;
let checkedAt = 0;

function load(): Record<string, ProductDetails> {
  loadedAt = Date.now();
  return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Record<string, ProductDetails>) : {};
}

export function detailsFor(sku: string): ProductDetails | undefined {
  if (!details) {
    details = load();
    checkedAt = Date.now();
  } else if (process.env.NODE_ENV !== "production" && Date.now() - checkedAt > 3000) {
    checkedAt = Date.now();
    try {
      if (existsSync(FILE) && statSync(FILE).mtimeMs > loadedAt) details = load();
    } catch {
      // Keep the descriptions already in memory.
    }
  }
  return details[sku];
}
