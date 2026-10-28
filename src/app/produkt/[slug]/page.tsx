import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCash, IconCheck, IconReturn, IconTruck } from "@/components/Icons";
import { Breadcrumbs } from "@/components/listing/Listing";
import { AddToCart } from "@/components/product/AddToCart";
import { PairWith } from "@/components/product/PairWith";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductRail } from "@/components/ProductRail";
import { TIPS } from "@/content/tips";
import { familyOf, fromBrand, getProduct, related, toCard, variantKind } from "@/lib/catalog";
import { detailsFor } from "@/lib/details";
import { pairsFor } from "@/lib/pairs";
import { CONCENTRATIONS } from "@/lib/filters";
import { amount, price, priceShort } from "@/lib/format";
import { ADDRESS_PRICE, OFFICE_PRICE, SHIPPING, SITE } from "@/lib/site";
import { CATEGORY_BY_ID, findSub } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

// Product pages are rendered on first visit and then kept (there are ~30 000 of them).
export function generateStaticParams() {
  return [];
}

const GENDER_LABEL = { w: "Дамски", m: "Мъжки", u: "Унисекс", k: "Детски" } as const;

function fullName(p: Product) {
  return p.brand ? `${p.brand} ${p.name}` : p.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const sub = findSub(p.category, p.sub);
  const size = amount(p.facts);
  const lead = detailsFor(p.sku)?.copy?.lead;
  const description = lead ?? `${fullName(p)}${size ? `, ${size}` : ""} — ${sub?.name ?? ""}. Цена ${price(p.price)}. Доставка за ${SHIPPING.days} работни дни, плащане при получаване.`;
  return {
    title: fullName(p),
    description,
    alternates: { canonical: `/produkt/${p.slug}` },
    openGraph: { title: fullName(p), description, url: `/produkt/${p.slug}`, images: [{ url: p.image, width: p.iw, height: p.ih }] },
  };
}

function facts(p: Product): [string, string][] {
  const rows: [string, string][] = [];
  if (p.brand) rows.push(["Марка", p.brand]);
  const sub = findSub(p.category, p.sub);
  if (sub) rows.push(["Вид", sub.name]);
  if (p.variant && p.family) rows.push([variantKind(familyOf(p)) === "size" ? "Размер" : "Нюанс", p.variant]);
  const size = amount(p.facts);
  if (size) rows.push([p.facts.ml ? "Обем" : "Тегло", size]);
  if (p.facts.pcs) rows.push(["Брой в опаковката", String(p.facts.pcs)]);
  if (p.facts.spf) rows.push(["Слънцезащитен фактор", `SPF ${p.facts.spf}`]);
  if (p.facts.conc) rows.push(["Концентрация", CONCENTRATIONS.find((c) => c.id === p.facts.conc)?.label ?? p.facts.conc]);
  if (p.facts.gender) rows.push(["За", GENDER_LABEL[p.facts.gender]]);
  if (p.ean) rows.push(["Баркод (EAN)", p.ean]);
  rows.push(["Код на продукта", p.sku]);
  return rows;
}

function StockLine({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <p className="flex items-center gap-2 text-[0.875rem] text-ink-3">
        <span className="size-2 rounded-full bg-ink-3" aria-hidden="true" /> Изчерпан
      </p>
    );
  }
  if (stock <= 3) {
    return (
      <p className="flex items-center gap-2 text-[0.875rem] text-amber">
        <span className="size-2 rounded-full bg-amber" aria-hidden="true" /> В наличност — остават {stock} бр.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-[0.875rem] text-sage">
      <span className="size-2 rounded-full bg-sage" aria-hidden="true" /> В наличност
    </p>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const category = CATEGORY_BY_ID.get(p.category)!;
  const sub = findSub(p.category, p.sub)!;
  const members = familyOf(p);
  const kind = variantKind(members);
  const tip = TIPS[p.sub];
  const details = detailsFor(p.sku);
  const copy = details?.copy;
  const similar = related(p, 12);
  const brandMore = fromBrand(p, 12);
  const card = toCard(p);
  const pairs = pairsFor(p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fullName(p),
    image: [p.image, ...(details?.gallery ?? []).map((g) => g.src)],
    sku: p.sku,
    ...(p.ean ? { gtin: p.ean } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(copy ? { description: [copy.lead, ...copy.body].join(" ") } : {}),
    category: `${category.name} > ${sub.name}`,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/produkt/${p.slug}`,
      priceCurrency: "EUR",
      price: p.price.toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <div className="shell pt-6 md:pt-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Начало" },
            { href: `/${category.id}`, label: category.name },
            { href: `/${category.id}/${sub.id}`, label: sub.name },
            { label: p.name },
          ]}
        />
        <div className="mt-6 grid gap-10 md:mt-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
          <div className="min-w-0 lg:sticky lg:top-36 lg:self-start">
            <ProductGallery pictures={[{ src: p.image, w: p.iw, h: p.ih }, ...(details?.gallery ?? [])]} alt={fullName(p)} />
          </div>

          <div className="min-w-0">
            {p.brand ? (
              <Link href={`/marki/${p.brandSlug}`} className="eyebrow link hover:text-ink">
                {p.brand}
              </Link>
            ) : null}
            <h1 className="mt-3 text-[2.1rem] leading-[1.08] sm:text-[2.6rem]">{p.name}</h1>
            <p className="mt-3 text-[0.9375rem] text-ink-3">
              <Link href={`/${category.id}/${sub.id}`} className="link hover:text-ink">
                {sub.name}
              </Link>
              {amount(p.facts) ? <span> · {amount(p.facts)}</span> : null}
            </p>

            <div className="mt-7 flex items-end justify-between gap-4 border-y border-line py-5">
              <div>
                <p className="num text-[2rem] font-semibold leading-none">{price(p.price)}</p>
                <p className="mt-2 text-[0.75rem] text-ink-3">Цената е с ДДС</p>
              </div>
              <StockLine stock={p.stock} />
            </div>

            {kind && members.length > 1 ? (
              <div className="mt-6">
                <VariantPicker
                  kind={kind}
                  variants={members.map((m) => ({ slug: m.slug, label: m.variant ?? m.name, image: m.image, price: m.price, stock: m.stock, current: m.sku === p.sku }))}
                />
              </div>
            ) : null}

            <div className="mt-7">
              <AddToCart product={card} />
            </div>

            <ul className="mt-8 grid gap-3 rounded-lg bg-cream p-5 text-[0.875rem]">
              <li className="flex items-start gap-3">
                <IconTruck size={20} className="mt-0.5 shrink-0 text-garnet" />
                <span>
                  Доставка за {SHIPPING.days} работни дни със Speedy, Еконт, BOX NOW или Pigeon Express — <strong className="font-semibold">безплатна над {priceShort(SHIPPING.freeFrom)}</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <IconCash size={20} className="mt-0.5 shrink-0 text-garnet" />
                <span>Плащате при получаване — в брой на куриера</span>
              </li>
              <li className="flex items-start gap-3">
                <IconReturn size={20} className="mt-0.5 shrink-0 text-garnet" />
                <span>
                  {SHIPPING.returnDays} дни за връщане на неотворен продукт —{" "}
                  <Link href="/info/vrashtane" className="link font-semibold">
                    условия
                  </Link>
                </span>
              </li>
            </ul>

            {pairs.length ? <PairWith product={card} pairs={pairs} /> : null}

            <div className="mt-10 divide-y divide-line border-y border-line">
              {copy ? (
                <Section title="Описание" open>
                  <div className="space-y-3 text-[0.9375rem] leading-relaxed text-ink-2">
                    <p className="text-[1.0625rem] leading-snug text-ink">{copy.lead}</p>
                    {copy.body.map((para) => (
                      <p key={para}>{para}</p>
                    ))}
                  </div>
                  {copy.highlights.length ? (
                    <ul className="mt-4 grid gap-2 text-[0.9375rem]">
                      {copy.highlights.map((h) => (
                        <li key={h} className="flex gap-2.5">
                          <IconCheck size={16} className="mt-1 shrink-0 text-garnet" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Section>
              ) : null}
              <Section title="Характеристики" open={!copy}>
                <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2.5 text-[0.9375rem]">
                  {facts(p).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
              {details?.ingredients ? (
                <Section title="Състав">
                  <p className="text-[0.875rem] leading-relaxed text-ink-2">{details.ingredients}</p>
                  <p className="mt-3 text-[0.8125rem] text-ink-3">Производителите понякога променят състава. Актуалният е отпечатан на опаковката.</p>
                </Section>
              ) : null}
              {copy?.usage && copy.basis === "moiata" ? (
                <Section title="Как се използва">
                  <p className="text-[0.9375rem] leading-relaxed text-ink-2">{copy.usage}</p>
                </Section>
              ) : tip ? (
                <Section title={`Как се използва: ${sub.name.toLowerCase()}`}>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-2">{tip}</p>
                  <p className="mt-3 text-[0.8125rem] text-ink-3">Общ съвет за този вид продукти. Винаги следвайте указанията на опаковката.</p>
                </Section>
              ) : null}
              <Section title="Доставка и връщане">
                <div className="space-y-2 text-[0.9375rem] leading-relaxed text-ink-2">
                  <p>
                    Изпращаме със Speedy, Еконт, BOX NOW и Pigeon Express до офис, автомат или адрес. Доставката е {price(OFFICE_PRICE)} до офис
                    или автомат и {price(ADDRESS_PRICE)} до адрес, а при поръчка над {priceShort(SHIPPING.freeFrom)} — безплатна.
                  </p>
                  <p>
                    Неотворен продукт в оригиналната опаковка може да върнете в {SHIPPING.returnDays} дни. От хигиенни съображения отворени
                    козметични продукти не се връщат, освен ако са дефектни.{" "}
                    <Link href="/info/dostavka" className="link font-semibold text-ink">
                      Повече за доставката
                    </Link>
                  </p>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24 space-y-20">
        <ProductRail title="Подобни продукти" eyebrow={sub.name} href={`/${category.id}/${sub.id}`} linkLabel={`Всички ${sub.name.toLowerCase()}`} cards={similar} />
        {p.brand ? <ProductRail title={`Още от ${p.brand}`} href={`/marki/${p.brandSlug}`} linkLabel="Всички продукти на марката" cards={brandMore} /> : null}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group py-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-display text-[1.35rem] [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="relative size-4 shrink-0">
          <span className="absolute left-0 top-1/2 h-px w-4 bg-ink" />
          <span className="absolute left-1/2 top-0 h-4 w-px bg-ink transition-transform duration-300 ease-out group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}
