# Омая — козметика и аромати

Online cosmetics shop in Bulgarian for the beauty products in the company CSV export: make-up, face, perfume, hair,
body, nails, sun, men, hygiene and accessories. No admin panel: the catalog is generated from the CSV, orders are saved
to a file and e-mailed to the shop. Next.js 16 + Tailwind CSS 4, no database.

| | |
| --- | --- |
| Shop | `http://localhost:3001/` in development (port 3000 is used by the 18+ shop) |
| Orders | `$DATA_DIR/orders.jsonl` (one JSON per line) + e-mail to `SHOP_EMAIL` when SMTP is set |

## Quick start

```bash
npm install
cp .env.example .env.local                                   # set SMTP_* and SHOP_EMAIL to receive orders by e-mail
npm run import -- --file "../entire products_export (9).csv"  # builds data/catalog.json (≈1 min with --skip-images)
npm run dev -- -p 3001                                       # or: npm run build && npm start
```

The shop name "Омая" is used in `src/lib/site.ts`, the logo (`src/components/Wordmark.tsx`), the icons in `src/app/`
(`icon.svg`, `apple-icon.png`, `opengraph-image.png`) and the e-mails. Change it there if the shop gets another name.

## Pages

| Page | Address |
| --- | --- |
| Home | `/` |
| Category / subcategory | `/grim`, `/grim/chervila` … (10 categories, 89 subcategories) |
| Collections | `/kolektsii/novo`, `k-beauty`, `dermokozmetika`, `naturalna`, `balgarska`, `podaratsi`, `za-nego`, `detsa` |
| Brands | `/marki`, `/marki/<brand>` |
| Search | `/tarsene?q=…` (suggestions appear while typing in the header) |
| Product | `/produkt/<slug>` (shades and sizes of one product are linked on the page) |
| Favourites | `/lyubimi` (kept in the browser, no accounts) |
| Checkout | `/poruchka` → `/poruchka/blagodarim` |
| Information and legal pages | `/info/dostavka`, `vrashtane`, `kak-da-porucham`, `kontakti`, `za-nas`, `obshti-usloviya`, `poveritelnost`, `biskvitki` |

Listings can be filtered by brand, price, availability and subcategory (perfumes also by gender and concentration) and
sorted; every filter is in the address, so a filtered list can be bookmarked or shared.

## Catalog import (`npm run import`)

`scripts/import-catalog.ts` reads the ~438,000-row export and writes `data/catalog.json`:

1. **Which rows are cosmetics** (`scripts/rules.ts`, `selectRow`): active single items with a picture, from the
   export's cosmetics categories; rows from mixed categories (gifts, baby, household…) only with an unmistakable
   cosmetics name. Food, food supplements, medicines and medical devices, household cleaning, stationery, toys,
   electronics and the sex shop's range (which is sold in the 18+ shop) are excluded by name, by brand and by the
   supplier's picture address.
2. **Brand** (`scripts/brands.ts`): one spelling per brand, distributor and company names replaced by the brand
   ("ASAM GMBH & CO. KG" → ASAM, "ISISPHARMA-FRANCE" → Isispharma), distributor shorthand at the start of names turned
   into the brand ("EV1" → Eveline, "YR" → Yves Rocher, "GR" → Golden Rose…), and the brand taken off the product name.
3. **Subcategory** (`scripts/rules.ts`, `classify`): the product type named first in the name decides ("Гъба за фон дьо
   тен" is a sponge, "Фон дьо тен с гъба" a foundation), the rest of the name refines it (face, body, hair, children,
   men, SPF). Gift sets and packs of two products ("крем 50 мл + околоочен крем 15 мл") go to the category's sets.
4. **Name** (`scripts/names.ts`): abbreviations written out, internal codes removed, SHOUTING toned down, units
   written one way ("50 мл", "4,5 г", "3 × 100 г", "16 бр.").
5. **Facts** read from the name: volume, weight, pieces, SPF; for perfumes gender and concentration.
6. Duplicates (same EAN or same brand + name) are merged; the one with stock wins.
7. Every picture is downloaded once and checked (cached 7 days in `data/image-check.json`): broken pictures, tiny
   thumbnails and "no photo" placeholders are dropped. Next.js can optimise pictures from at most 50 hosts, so the 50
   hosts with the most products are kept.

Result of the last run: **29,129 products** (18,295 in stock), 1,151 brands, 1,894 product lines with several shades or
sizes. What was skipped and why: `data/import-report.json`.

Options: `--file <csv>`, `--prices <csv>` (default `data/prices.csv`), `--skip-images` (reuse the last picture check, no
network), `--recheck-images`. After an import, restart `npm run dev` or run `npm run build` again.

### Corrections that survive every import (`data/overrides/`)

| File | What it does |
| --- | --- |
| `excluded-skus.txt` | SKUs to leave out (one per line, `#` for comments), e.g. a product listed with another product's picture |
| `perfume-gender.json` | Whom a perfume is for when the name does not say it: `{ "SKU": { "g": "w" \| "m" \| "u", "name": "…" } }` |
| `perfume-gender-todo.json` | Written by the import: perfumes that do not say whom they are for and have no entry yet (they show as unisex) |

## Prices

**The export has no prices.** Until real prices are given, the import estimates a retail price per product from its
subcategory, brand tier (drugstore, mid-range, premium, luxury, niche) and size, e.g. a 100 ml designer EDP ≈ 78 €, a
drugstore shampoo ≈ 4–6 €. Every product has `priceConfirmed: false`, and the order e-mail to the shop warns when an
order contains estimated prices.

Real prices: put a CSV with the columns `SKU` and `Price` (euro, VAT included; `,` or `;` separated) at
`data/prices.csv` — see `data/prices.example.csv` — and run the import again.

## Orders

Checkout is cash on delivery: Speedy or Econt office/locker (3,49 €) or courier to an address (4,99 €), free from 49 €
(`src/lib/site.ts`). The server re-reads prices and stock from the catalog, never from the browser. Each order is
appended to `$DATA_DIR/orders.jsonl` (default `../omaya-data`, outside the project) and, when `SMTP_HOST` is set,
e-mailed to `SHOP_EMAIL` and to the customer. **Without SMTP the orders are only in that file** — back it up.

Spam protection: hidden honeypot field, max 30 attempts and 5 placed orders per IP per 15 minutes.

## Where to change things

| What | File |
| --- | --- |
| Shop name, contacts, company data, delivery prices, free-delivery limit | `src/lib/site.ts` |
| Categories, subcategories, collections and their texts | `src/lib/taxonomy.ts` |
| Usage tips on product pages | `src/content/tips.ts` |
| Information and legal pages | `src/content/pages.tsx` |
| Which rows are cosmetics, subcategory rules | `scripts/rules.ts` |
| Brand spellings, distributor shorthand | `scripts/brands.ts` |
| Product name clean-up | `scripts/names.ts` |
| Price estimates | `scripts/prices.ts` |
| Colours, fonts, motion | `src/app/globals.css`, `src/app/fonts.ts` |

## Before going live

- Real prices (`data/prices.csv`).
- Everything in `[brackets]` in `src/lib/site.ts`: company name, ЕИК, ДДС, address, manager. Real phone and e-mail.
- `NEXT_PUBLIC_SITE_URL`, `DATA_DIR` and the SMTP settings in `.env.local` on the server.
- Have a lawyer review the legal pages (`/info/obshti-usloviya`, `/info/poveritelnost`, `/info/vrashtane`).
- Product pictures are hot-linked from the suppliers (mostly lillydrogerie.bg, Amazon, Kaufland, dodis.bg, ozone.bg,
  notino). Next.js caches resized copies for 30 days, but if a supplier blocks hot-linking the pictures must be
  downloaded and self-hosted.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Development server / production build / production server |
| `npm run import -- --file <csv>` | Rebuild the catalog from the export |
| `npm run typecheck` / `npm run lint` | Type check / ESLint |
