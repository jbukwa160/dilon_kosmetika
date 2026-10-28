// Writes an original Bulgarian description for every product with the OpenAI API. Products matched on
// moiatakozmetika.com (`npm run moiata`) get that shop's description rewritten in our own words; the others get a
// shorter, honest description written from their name, brand and category only. Every result is checked before it is
// kept:
//   - no run of 8 words copied from the source text,
//   - no number that is not in the source or the product data (no invented sizes, percentages or SPF),
//   - no mention of moiatakozmetika or other shops.
// A result that fails is asked for again once with the problem explained; what still fails is listed in
// data/descriptions/review.json. Products in stock come first.
//
//   npm run enrich                         (products without a description, or whose source changed)
//   npm run enrich -- --limit 20           (only 20, for a test)
//   npm run enrich -- --only Dilon-302997  (comma-separated SKUs)
//   npm run enrich -- --in-stock           (only products in stock)
//   npm run enrich -- --basis moiata       (only products matched on moiatakozmetika.com; or "name")
//   npm run enrich -- --model gpt-5.5 --name-model gpt-5.4-mini --concurrency 8   (the defaults)
//   npm run enrich -- --recheck            (run the checks again on the saved texts, no API calls)
//
// Needs OPENAI_API_KEY in .env.local. Results: data/descriptions/descriptions.json; `npm run import` puts the current
// ones into data/details.json for the shop.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CATEGORY_BY_ID, findSub } from "../src/lib/taxonomy";
import type { CopyBasis, Product, ProductCopy } from "../src/lib/types";
import type { MoiataMatch, MoiataPage } from "./moiata-fetch";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const MODEL = arg("--model") ?? "gpt-5.5";
const NAME_MODEL = arg("--name-model") ?? "gpt-5.4-mini";
const CONCURRENCY = Number(arg("--concurrency") ?? 8);
const LIMIT = Number(arg("--limit") ?? Infinity);
const ONLY = arg("--only")?.split(",").map((s) => s.trim());
const BASIS = arg("--basis") as CopyBasis | undefined;
const OUT = path.join(ROOT, "data", "descriptions", "descriptions.json");
const REVIEW = path.join(path.dirname(OUT), "review.json");

export type StoredDescription = ProductCopy & {
  /** Hash of what the text was written from; a changed source is rewritten on the next run. */
  source: string;
  basis: CopyBasis;
  model: string;
  created: string;
};

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
}

// ── Sources ──

/** What a description is written from. */
export type Source = { basis: CopyBasis; text: string };

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

export function loadSources(): (p: Product) => Source {
  const pages = readJson<Record<string, MoiataPage>>(path.join(ROOT, "data", "moiata", "pages.json"), {});
  const matches = readJson<Record<string, MoiataMatch>>(path.join(ROOT, "data", "moiata", "matches.json"), {});
  return (p) => {
    const page = matches[p.sku] ? pages[matches[p.sku].handle] : undefined;
    const text = page ? [page.text, ...page.sections.map(([title, body]) => `${title}:\n${body}`)].join("\n\n").trim() : "";
    return text.length >= 80 ? { basis: "moiata", text } : { basis: "name", text: "" };
  };
}

// Bump when NAME_ONLY changes: descriptions written from the name are then rewritten on the next run.
const NAME_ONLY_VERSION = 1;

/** Written from the name only: the category is part of the source too, a product moved to another category is rewritten. */
export const sourceHash = (p: Pick<Product, "name" | "brand" | "category" | "sub" | "facts">, source: Source) =>
  createHash("sha1")
    .update(
      JSON.stringify(
        source.basis === "moiata" ? [p.name, p.brand, source.text] : [p.name, p.brand, p.category, p.sub, p.facts, NAME_ONLY_VERSION],
      ),
    )
    .digest("hex")
    .slice(0, 16);

// ── Prompt ──

const INSTRUCTIONS = `You write product pages for "Омая", an elegant Bulgarian online shop for cosmetics, perfume and personal care. Write in Bulgarian only.

Originality (most important when you get a source text):
- The source is the description of the product in another shop. Rewrite it completely: your own structure, sentences and word choice. Do not copy any sentence or distinctive phrase and do not follow the source sentence by sentence.

Facts:
- Use only facts from the source and the product data. Never invent ingredients, percentages, sizes, SPF values, skin or hair types, test results, certifications or effects. When something is not stated, leave it out.
- Keep numbers exactly as given (decimal comma: "4,5 мл").
- Leave out the other shop entirely: its name, advice, prices, discounts, gifts, delivery, availability and reviews.
- Cosmetic claims only, never medical ones: no "лекува", "премахва завинаги", no promises to cure or treat a condition.

Tone:
- Warm, clear and confident; never pushy or cheesy. Short sentences, concrete benefits, no exclamation marks, no emoji, no clichés like "истинско удоволствие" or "незаменим помощник".
- Natural modern Bulgarian, polite plural ("нанесете", "ще усетите"), lower-case "вие/ви", correct articles (пълен/кратък член), Bulgarian quotes „…“.
- Refer to the product by its type and line ("серумът", "Elseve Full Resist"); keep brand and line names in their original spelling.

Output fields:
- lead: one or two sentences (max 200 characters) that make the product and its main benefit clear.
- body: 1–3 short paragraphs (together 50–140 words): what it is, what it does, who it suits, the texture or scent when stated. Fewer words when the source is thin; never pad with generic filler.
- highlights: 3–5 short points (max 60 characters each) with the most useful concrete facts (key ingredients, skin or hair type, finish, volume, what is in the set). No full stops at the end.
- usage: one to three sentences on how to use it, only when the source says; otherwise "".`;

const NAME_ONLY = `There is no source text for this product. Write a short, honest description from the product name, brand, category and product facts only:
- Write like a knowledgeable shop assistant: what the product is, what this kind of product is for and how it is usually used, and what the given facts (volume, SPF, shade) mean for the buyer.
- Do not state any ingredient, effect, skin or hair type, finish or feature that is not in the product name. Words in the name ("хиалурон", "матиращ", "за суха коса") may be explained in general terms.
- Never talk about the name, the category or missing information ("както подсказва името", "в тази категория").
- lead: one sentence.
- body: one short paragraph (30–70 words).
- highlights: 2–3 concrete points taken from the name and facts. Never the category itself and never generic points.
- usage: "" (the shop shows its own general advice for this kind of product).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lead", "body", "highlights", "usage"],
  properties: {
    lead: { type: "string" },
    body: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "string" } },
    usage: { type: "string" },
  },
};

const resultShape = z.object({
  lead: z.string().trim().min(20).max(320),
  body: z.array(z.string().trim().min(20)).min(1).max(4),
  highlights: z.array(z.string().trim().min(2).max(100)).max(6),
  usage: z.string().trim().max(500),
});
type Result = z.infer<typeof resultShape>;

const FACT_LABELS: [keyof Product["facts"], string][] = [
  ["ml", "Volume (ml)"],
  ["g", "Weight (g)"],
  ["pcs", "Pieces"],
  ["spf", "SPF"],
  ["gender", "For (w = women, m = men, u = unisex, k = children)"],
  ["conc", "Perfume concentration"],
];

function productBrief(p: Product, source: Source): string {
  const category = CATEGORY_BY_ID.get(p.category)!;
  const sub = findSub(p.category, p.sub)!;
  const facts = FACT_LABELS.filter(([k]) => p.facts[k] !== undefined).map(([k, label]) => `- ${label}: ${p.facts[k]}`);
  return [
    `Product name: ${p.name}`,
    p.brand ? `Brand: ${p.brand}` : "",
    p.variant ? `Shade or size: ${p.variant}` : "",
    `Category: ${category.name} › ${sub.name}`,
    ...(facts.length ? ["Product facts:", ...facts] : []),
    "",
    ...(source.basis === "moiata" ? ["Source description (Bulgarian, from another shop):", source.text] : [NAME_ONLY]),
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

// ── Checks ──

const wordsOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);

/** Runs of `n` words that the text shares with the source. */
function copiedRuns(text: string, source: string, n = 8): string[] {
  const src = wordsOf(source);
  const seen = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) seen.add(src.slice(i, i + n).join(" "));
  const out: string[] = [];
  const w = wordsOf(text);
  for (let i = 0; i + n <= w.length; i++) {
    if (!seen.has(w.slice(i, i + n).join(" "))) continue;
    let end = i + n;
    while (end < w.length && seen.has(w.slice(end - n + 1, end + 1).join(" "))) end++;
    out.push(w.slice(i, end).join(" "));
    i = end - 1;
  }
  return out;
}

/** Numbers as written, "4,5" and "4.5" alike. */
const numbersOf = (s: string) => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => String(Number(m[0].replace(",", "."))));

const NUMBER_WORDS: [RegExp, number][] = [
  [/^(един|една|едно)$/, 1], [/^(два|две|двата|двете)$/, 2], [/^(три|трите)$/, 3], [/^(четири|четирите)$/, 4], [/^(пет|петте)$/, 5],
  [/^(шест|шестте)$/, 6], [/^(седем|седемте)$/, 7], [/^(осем|осемте)$/, 8], [/^(девет|деветте)$/, 9], [/^(десет|десетте)$/, 10],
];
const spelledNumbers = (s: string) => wordsOf(s).flatMap((w) => NUMBER_WORDS.filter(([re]) => re.test(w)).map(([, n]) => String(n)));

function problems(r: Result, p: Product, source: Source): string[] {
  const out: string[] = [];
  const facts = `${source.text}\n${p.name}\n${p.brand}\n${p.variant ?? ""}\n${Object.values(p.facts).join(" ")}`;
  const allowed = new Set([...numbersOf(facts), ...spelledNumbers(facts)]);
  const prose = [r.lead, ...r.body, r.usage].join("\n");
  const everything = [prose, ...r.highlights].join("\n");
  if (source.basis === "moiata") {
    const copied = copiedRuns(prose, source.text);
    if (copied.length) out.push(`These phrases are copied from the source, rewrite them: ${copied.map((c) => `"${c}"`).join(", ")}`);
  }
  // 1 and 2 ("2 в 1", "един-два пъти") are common in honest copy without being product facts.
  const invented = [...new Set(numbersOf(everything))].filter((n) => !allowed.has(n) && !["1", "2"].includes(n));
  if (invented.length) out.push(`These numbers are not in the source or the product data, remove them: ${invented.join(", ")}`);
  if (/moiat|моята ?козметик|notino|ноtino|makeup\.bg|лили дрогери|lilly/i.test(everything)) out.push("Do not mention moiatakozmetika or any other shop.");
  if (/лекува|излекува|премахва завинаги|медицинск[аио] (?:доказан|ефект)/i.test(everything)) out.push("No medical claims; describe the cosmetic effect only.");
  if (r.body.join(" ").split(/\s+/).length > 190) out.push("The body is too long; keep it under 140 words.");
  return out;
}

// ── API ──

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const usage = new Map<string, { in: number; cached: number; out: number }>();

/** No credits left or a wrong key: retrying cannot help, the whole run stops. */
class FatalApiError extends Error {}

async function ask(model: string, input: string): Promise<Result> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: INSTRUCTIONS,
        input,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "product_copy", strict: true, schema: SCHEMA } },
        max_output_tokens: 8000,
        store: false,
      }),
      signal: AbortSignal.timeout(180_000),
    }).catch((err: Error) => err);
    if (!(res instanceof Error) && (res.status === 401 || res.status === 429)) {
      const body = await res.clone().json().catch(() => ({}));
      const code = body.error?.code ?? body.error?.type;
      if (res.status === 401 || code === "insufficient_quota" || code === "credit_balance_exhausted") {
        throw new FatalApiError(`OpenAI ${res.status} (${code ?? "unauthorized"}): ${body.error?.message ?? ""}`);
      }
    }
    if (res instanceof Error || res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw res instanceof Error ? res : new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const wait = res instanceof Error ? 0 : Number(res.headers.get("retry-after")) * 1000;
      await sleep(Math.max(wait || 0, 3000 * 2 ** attempt));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data.error?.message ?? "unknown error"}`);
    const u = usage.get(model) ?? { in: 0, cached: 0, out: 0 };
    u.in += data.usage?.input_tokens ?? 0;
    u.cached += data.usage?.input_tokens_details?.cached_tokens ?? 0;
    u.out += data.usage?.output_tokens ?? 0;
    usage.set(model, u);
    if (data.status !== "completed") throw new Error(`response ${data.status}: ${JSON.stringify(data.incomplete_details)}`);
    const text = (data.output as { type: string; content?: { type: string; text?: string; refusal?: string }[] }[])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? (c.refusal ? `REFUSAL: ${c.refusal}` : ""))
      .join("");
    if (text.startsWith("REFUSAL")) throw new Error(text);
    return resultShape.parse(JSON.parse(text));
  }
}

const usageLine = () =>
  [...usage].map(([m, u]) => `${m}: ${u.in.toLocaleString("en")} in (${u.cached.toLocaleString("en")} cached), ${u.out.toLocaleString("en")} out`).join(" · ");

const tidy = (s: string) => s.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
const clean = (r: Result): ProductCopy => ({
  lead: tidy(r.lead),
  body: r.body.map(tidy).filter(Boolean),
  highlights: r.highlights.map((h) => tidy(h).replace(/[.;]$/, "")).filter(Boolean),
  usage: tidy(r.usage),
});

async function describe(p: Product, source: Source): Promise<{ result: StoredDescription; issues: string[] }> {
  const model = source.basis === "moiata" ? MODEL : NAME_MODEL;
  const brief = productBrief(p, source);
  let r = await ask(model, brief);
  let issues = problems(r, p, source);
  if (issues.length) {
    const retry = await ask(model, `${brief}\n\nYour previous answer had problems. Write it again and fix them:\n- ${issues.join("\n- ")}`);
    const retryIssues = problems(retry, p, source);
    if (retryIssues.length <= issues.length) [r, issues] = [retry, retryIssues];
  }
  return { result: { source: sourceHash(p, source), basis: source.basis, model, created: new Date().toISOString(), ...clean(r) }, issues };
}

async function main() {
  loadEnv();
  mkdirSync(path.dirname(OUT), { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "data", "catalog.json"), "utf8")) as Product[];
  const sourceOf = loadSources();
  const store = readJson<Record<string, StoredDescription>>(OUT, {});
  const review = readJson<Record<string, string[]>>(REVIEW, {});

  if (args.includes("--recheck")) {
    for (const key of Object.keys(review)) delete review[key];
    for (const p of products) {
      const d = store[p.sku];
      if (!d) continue;
      const issues = problems(d, p, sourceOf(p));
      if (issues.length) review[p.sku] = issues;
    }
    writeFileSync(REVIEW, JSON.stringify(review, null, 2) + "\n");
    console.log(`✓ ${Object.keys(review).length} saved descriptions with a problem — see ${path.relative(ROOT, REVIEW)}`);
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing — add it to .env.local");

  // One description per product line and shade group would repeat itself; every product gets its own, in stock first.
  const todo = products
    .filter((p) => (!ONLY || ONLY.includes(p.sku)) && (!args.includes("--in-stock") || p.stock > 0))
    .map((p) => ({ p, source: sourceOf(p) }))
    .filter(({ p, source }) => (!BASIS || source.basis === BASIS) && store[p.sku]?.source !== sourceHash(p, source))
    .sort((a, b) => Number(b.p.stock > 0) - Number(a.p.stock > 0) || Number(b.source.basis === "moiata") - Number(a.source.basis === "moiata") || b.p.rank - a.p.rank)
    .slice(0, LIMIT);
  const fromShop = todo.filter((t) => t.source.basis === "moiata").length;
  console.log(`${todo.length} products to describe: ${fromShop} from moiatakozmetika.com with ${MODEL}, ${todo.length - fromShop} from the name with ${NAME_MODEL}`);

  let done = 0;
  let failed = 0;
  let fatal: FatalApiError | undefined;
  let lastSave = Date.now();
  const save = () => {
    writeFileSync(OUT, JSON.stringify(store, null, 1) + "\n");
    writeFileSync(REVIEW, JSON.stringify(review, null, 2) + "\n");
  };
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job && !fatal; job = queue.shift()) {
        try {
          const { result, issues } = await describe(job.p, job.source);
          store[job.p.sku] = result;
          if (issues.length) review[job.p.sku] = issues;
          else delete review[job.p.sku];
        } catch (err) {
          if (err instanceof FatalApiError) {
            fatal = err;
            break;
          }
          failed++;
          console.warn(`  ${job.p.sku}: ${(err as Error).message.slice(0, 300)}`);
        }
        if (++done % 50 === 0) console.log(`  ${done}/${todo.length} · ${usageLine()}`);
        if (Date.now() - lastSave > 15_000) {
          save();
          lastSave = Date.now();
        }
      }
    }),
  );
  save();
  if (fatal) {
    console.error(`\n✗ Stopped: ${fatal.message}`);
    console.error(`  ${done - failed} described before that; run \`npm run enrich\` again to continue where it stopped.`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${done - failed} described, ${failed} failed · ${usageLine()}`);
  console.log(`  ${Object.keys(review).length} kept with a problem the retry did not fix — see ${path.relative(ROOT, REVIEW)}`);
  console.log("  Run `npm run import -- --skip-images` to show them in the shop.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
