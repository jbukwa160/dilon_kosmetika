# Омая — козметика и аромати

Online cosmetics shop in Bulgarian for the beauty products in the company CSV export: make-up, face, perfume, hair,
body, nails, sun, men, hygiene and accessories. No admin panel: the catalog is generated from the CSV, orders are saved
to a file and e-mailed to the shop. Next.js 16 + Tailwind CSS 4, no database.

| | |
| --- | --- |
| Shop | `http://localhost:3001/` in development (port 3000 is used by the 18+ shop) |
| Orders | `$DATA_DIR/orders.jsonl` (one JSON per line) + e-mail to `SHOP_EMAIL` when SMTP is set |
| Waybills | "Създай товарителница" button in the shop's order e-mail → `/tovaritelnitsa/<number>?k=…` |

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

## Descriptions, ingredients and pairings

**"Перфектни заедно"** on every product page in stock: up to three products that complete it (conditioner and mask
for a shampoo, primer and powder for a foundation, the shower gel of the same scent for a perfume), each with a word on
why, and one button that puts the chosen ones in the bag as a set. **A set is cheaper: 2 products −10 %, 3 products
−12 %, 4 products −15 %** (`BUNDLE_DISCOUNT` in `src/lib/site.ts`). The discount shows on the card, in the bag and at
checkout; when one extra leaves the bag the rest keep the smaller set's discount, without the main product there is no
set. The server checks every set again before it grants the discount (the extras must be kinds of products that go
with the main one, in stock) and works it out from catalog prices; the order and its e-mails list each set and what it
saved. The rules — which kinds of products go with which — are in `src/lib/pairs.ts`; the pick prefers the same brand
and product line, keeps children's and men's products apart and never offers testers, gift sets or something far more
expensive than the product itself.

**Descriptions** are written in two steps, then published by the import:

1. `npm run moiata` reads product pages of moiatakozmetika.com (only those that look like one of our products) and
   matches them to our catalog by barcode → `data/moiata/`. The shop allows about one automated page read every one or
   two minutes, so a full run takes about a day; it stops when the shop keeps refusing and continues where it stopped
   on the next run.
2. `npm run enrich` writes a Bulgarian description for every product with the OpenAI API (key `OPENAI_API_KEY` in
   `.env.local`) → `data/descriptions/descriptions.json`. Products found on moiatakozmetika.com get that shop's text
   rewritten in our own words (gpt-5.5); the others a short description from their name, brand and category only
   (gpt-5.4-mini). Each text is checked: no 8 words in a row copied from the source, no number that is not in the
   source, no other shop named; what still fails after one retry is listed in `data/descriptions/review.json`. Products
   in stock come first; `--in-stock`, `--limit 20`, `--only <SKU>` and `--model` / `--name-model` narrow or change a run.
3. `npm run import -- --skip-images` puts the current descriptions, and the ingredient lists of products matched by
   barcode, into `data/details.json`. Product pages show them under "Описание" and "Състав"; products without one keep
   the general "Как се използва" advice for their kind.

**More pictures.** The export has one picture per product. The product page shows more where other shops have them,
as a gallery (thumbnails below the photo, swipe on phones, zoom on hover):

1. `npm run lilly` matches our products to lillydrogerie.bg by barcode (the barcode is in the file names of the
   pictures in that shop's public product sitemap) and reads each matched page once (robots.txt allows product pages;
   one page every 2 s, honest User-Agent, resumable) → `data/lilly/`. About 6,700 of our products match.
2. `npm run moiata` keeps the pictures of the moiatakozmetika.com pages it reads (barcode matches only are used).
3. `npm run import` checks every new picture like the main ones and keeps up to 6 more per product: broken, small
   (< 300 px) and banner pictures (the same file on many products) are left out, and so is any picture that shows the
   same as the main picture or one already kept — compared by a 64-bit fingerprint of what the picture shows
   (`dh` in `data/image-check.json`, made with sharp). The pictures go into `data/details.json`. moiatakozmetika.com
   pictures are shown straight from Shopify's CDN at the right size (Next.js can only optimise 50 hosts, all taken).

## Prices

**The export has no prices.** Until real prices are given, the import estimates a retail price per product from its
subcategory, brand tier (drugstore, mid-range, premium, luxury, niche) and size, e.g. a 100 ml designer EDP ≈ 78 €, a
drugstore shampoo ≈ 4–6 €. Every product has `priceConfirmed: false`, and the order e-mail to the shop warns when an
order contains estimated prices.

Real prices: put a CSV with the columns `SKU` and `Price` (euro, VAT included; `,` or `;` separated) at
`data/prices.csv` — see `data/prices.example.csv` — and run the import again.

## Orders

Checkout is cash on delivery: an office or locker of Speedy, Econt, BOX NOW or Pigeon Express (3,49 €) or Speedy / Econt
to an address (4,99 €), free from 49 € (`src/lib/site.ts`). The server re-reads prices and stock from the catalog, never
from the browser. Each order is
appended to `$DATA_DIR/orders.jsonl` (default `../omaya-data`, outside the project) and, when `SMTP_HOST` is set,
e-mailed to `SHOP_EMAIL` and to the customer. **Without SMTP the orders are only in that file** — back it up.

Spam protection: hidden honeypot field, max 30 attempts and 5 placed orders per IP per 15 minutes.

## Couriers and waybills

The checkout uses each courier's own lists (`src/lib/shipping/`, ported from the Maggie Joyland shop): the customer
picks the place from the courier's list of places, then one of its offices or lockers there (searchable, offices first),
or types the street address. When the customer switches couriers, the place is found again in the new courier's list.
The server checks the chosen office against the courier's list and writes it the courier's way; a made-up office is
refused. If a courier's list cannot be loaded, the checkout falls back to plain text fields and the order still goes
through. The lists are cached for 24 hours in memory and in `$DATA_DIR/courier-cache/` (refreshed in the background).

| Courier | Offices at checkout | Waybills |
| --- | --- | --- |
| Speedy | offices + APT lockers | REST API v1, service 505, sender pays, cash on delivery, A6 label |
| Econt | offices + Еконтомати (public list, no login needed) | `LabelService.createLabel`; **off until a working Econt login is in `.env.local`** |
| BOX NOW | lockers only | partner API, start point `BOXNOW_WAREHOUSE_ID` (2 = hand in at any locker), compartment size on the waybill page |
| Pigeon Express | offices + lockers | REST API v1, collected from the sender's address unless `PIGEON_DROPOFF_OFFICE_ID` is set |

**Waybills without an admin panel.** The shop's order e-mail has a "Създай товарителница" button. It opens
`/tovaritelnitsa/<number>?k=<key>`, a page only for the shop (the key is an HMAC of the order number with
`WAYBILL_SECRET`; without the right key the page is a 404). Opening it creates nothing — mail scanners that open links
are harmless. On the page: the order, the parcel weight worked out from the product sizes (editable), number of parcels,
BOX NOW compartment, optional declared value, and "Създай товарителница". The cash-on-delivery amount is the order total.
After that the page shows the waybill number, "Отпечатай етикета" (PDF from the courier), tracking and "Анулирай"
(possible until the courier has the parcel). The customer gets an e-mail with the tracking link. Waybills are kept in
`$DATA_DIR/shipments.json` and every create / cancel is logged in `$DATA_DIR/shipments-log.jsonl`. Without SMTP the
waybill link of each order is printed in the server log.

Settings in `.env.local` (see `.env.example`): the courier logins (`SPEEDY_*`, `ECONT_*`, `BOXNOW_*`, `PIGEON_*`), the
sender on the waybills (`SENDER_NAME`, `SENDER_CONTACT`, `SENDER_PHONE`, `SENDER_EMAIL`, `SENDER_CITY`, `SENDER_POSTCODE`,
`SENDER_ADDRESS`), optional drop-off offices (`SPEEDY_DROPOFF_OFFICE_ID`, `ECONT_DROPOFF_OFFICE_CODE`,
`PIGEON_DROPOFF_OFFICE_ID`) and `WAYBILL_SECRET`. `npm run couriers` checks every login without creating anything.

## Where to change things

| What | File |
| --- | --- |
| Shop name, contacts, company data, delivery methods and prices, free-delivery limit, set discounts | `src/lib/site.ts` |
| Courier logins, sender on the waybills, waybill link key | `.env.local` |
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
- `NEXT_PUBLIC_SITE_URL`, `DATA_DIR` and the SMTP settings in `.env.local` on the server (the waybill button needs SMTP
  and the right `NEXT_PUBLIC_SITE_URL`). Copy the courier settings and `WAYBILL_SECRET` from the development `.env.local`.
- A working Econt login (`ECONT_USERNAME` / `ECONT_PASSWORD`) for Econt waybills; then `npm run couriers`.
- Have a lawyer review the legal pages (`/info/obshti-usloviya`, `/info/poveritelnost`, `/info/vrashtane`).
- Product pictures are hot-linked from the suppliers (mostly lillydrogerie.bg, Amazon, Kaufland, dodis.bg, ozone.bg,
  notino); the extra gallery pictures from lillydrogerie.bg and moiatakozmetika.com. They are other shops' and
  brands' photos: check that the shop may use them. Next.js caches resized copies for 30 days, but if a supplier
  blocks hot-linking the pictures must be downloaded and self-hosted.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Development server / production build / production server |
| `npm run import -- --file <csv>` | Rebuild the catalog from the export (also publishes descriptions) |
| `npm run moiata` | Read matching product pages of moiatakozmetika.com (slow, resumable) |
| `npm run lilly` | Read the gallery pictures of matching lillydrogerie.bg product pages (resumable) |
| `npm run enrich` | Write product descriptions with the OpenAI API |
| `npm run couriers` | Check the courier logins (read-only) |
| `npm run typecheck` / `npm run lint` | Type check / ESLint |
