// Pre-checks a list of picture URLs (one per line) into data/image-check.json, so a later import is fast.
//   npx tsx scripts/check-images.ts urls.txt

import { readFileSync } from "node:fs";
import path from "node:path";
import { checkImages } from "./images";

const file = process.argv[2];
if (!file) throw new Error("usage: tsx scripts/check-images.ts <urls.txt>");
const urls = readFileSync(file, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
checkImages(urls, { cacheFile: path.resolve(__dirname, "..", "data", "image-check.json") }).then((m) => {
  const ok = urls.filter((u) => m.get(u)?.ok).length;
  console.log(`✓ ${ok} of ${urls.length} pictures work`);
});
