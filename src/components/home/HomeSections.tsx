import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { RailScroller } from "@/components/RailScroller";
import { Reveal } from "@/components/Reveal";
import type { Card, NavCategory } from "@/lib/catalog";
import { count } from "@/lib/format";
import type { Product } from "@/lib/types";

export function CategoryIndex({ items }: { items: { category: NavCategory; cover?: Product }[] }) {
  return (
    <Reveal as="section" className="shell">
      <div className="mb-6 flex items-end justify-between gap-6">
        <h2 className="text-[2rem] md:text-[2.5rem]">Пазарувайте по категория</h2>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {items.map(({ category: c, cover }) => (
          <li key={c.id}>
            <Link href={`/${c.id}`} className="group block">
              <span className="tile relative block aspect-[5/6]">
                {cover ? (
                  <ProductImage src={cover.image} alt="" iw={cover.iw} ih={cover.ih} sizes="(min-width: 64rem) 18vw, 45vw" inset={16} className="group-hover:scale-[1.05]" />
                ) : null}
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-2 px-0.5">
                <span className="font-display text-[1.35rem] leading-tight">{c.name}</span>
                <span className="num text-[0.75rem] text-ink-3">{count(c.count)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export type RitualStep = { n: string; title: string; text: string; href: string; product?: Product };

/** Skin care in four steps, each with a product from the catalog and a link to the subcategory. */
export function Ritual({ steps }: { steps: RitualStep[] }) {
  return (
    <Reveal as="section" className="bg-cream py-20 md:py-24">
      <div className="shell">
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div>
            <p className="eyebrow">Ритуалът</p>
            <h2 className="mt-3 text-[2.4rem] md:text-[3.2rem]">
              Грижа за лицето <em className="text-garnet">в четири стъпки</em>
            </h2>
          </div>
          <p className="max-w-[34rem] text-[1rem] leading-relaxed text-ink-2 md:justify-self-end">
            Най-доброто в грижата за кожата е редът: от най-лекото към най-плътното. Започнете с чиста кожа и завършете с крем, който
            задържа всичко останало.
          </p>
        </div>
        <ol className="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n}>
              <Link href={s.href} className="group block">
                <span className="tile relative block aspect-[4/5]">
                  {s.product ? (
                    <ProductImage src={s.product.image} alt="" iw={s.product.iw} ih={s.product.ih} sizes="(min-width: 64rem) 22vw, 46vw" inset={14} className="group-hover:scale-[1.04]" />
                  ) : null}
                  <span className="num absolute left-4 top-3 font-display text-[2.6rem] leading-none text-ink/80">{s.n}</span>
                </span>
                <span className="mt-4 flex items-center gap-2 font-display text-[1.5rem]">
                  {s.title}
                  <IconArrowRight size={18} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </span>
                <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-ink-2">{s.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}

/** Dark band for perfumes: the subcategories as large links, and a rail of bottles. */
export function PerfumeBand({ links, cards }: { links: { href: string; label: string; count: number }[]; cards: Card[] }) {
  return (
    <section className="bg-night py-20 text-porcelain md:py-24">
      <div className="shell grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-16">
        <Reveal>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-porcelain/55">Парфюмерия</p>
          <h2 className="mt-3 text-[2.6rem] text-porcelain md:text-[3.2rem]">
            Ароматът е <em className="text-[#d9a5ab]">подпис</em>
          </h2>
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group flex items-center justify-between py-3.5">
                  <span className="font-display text-[1.35rem] transition-colors duration-200 group-hover:text-[#e8c3c7]">{l.label}</span>
                  <span className="num flex items-center gap-3 text-[0.75rem] text-porcelain/50">
                    {count(l.count)}
                    <IconArrowRight size={16} className="text-porcelain/70 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="min-w-0 pt-2 lg:pt-[4.6rem]">
          <RailScroller label="Парфюми" dark>
            {cards.map((c) => (
              <li key={c.product.sku}>
                <ProductCard card={c} dark />
              </li>
            ))}
          </RailScroller>
        </div>
      </div>
    </section>
  );
}

export type CollectionTile = { href: string; title: string; text: string; count: number; tone: string; product?: Product };

export function Collections({ items }: { items: CollectionTile[] }) {
  return (
    <Reveal as="section" className="shell">
      <h2 className="mb-6 text-[2rem] md:text-[2.5rem]">Колекции</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="group relative isolate flex min-h-[15rem] overflow-hidden rounded-lg md:min-h-[17rem]" style={{ background: c.tone }}>
              <span className="relative z-[1] flex max-w-[60%] flex-col justify-between p-6 md:p-8">
                <span>
                  <span className="block font-display text-[1.9rem] leading-tight md:text-[2.2rem]">{c.title}</span>
                  <span className="mt-2 block text-[0.9375rem] leading-relaxed text-ink-2">{c.text}</span>
                </span>
                <span className="mt-6 flex items-center gap-2 text-[0.8125rem] font-semibold">
                  {count(c.count)} продукта <IconArrowRight size={16} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </span>
              </span>
              {c.product ? (
                <span className="absolute inset-y-0 right-0 w-[46%]">
                  <ProductImage src={c.product.image} alt="" iw={c.product.iw} ih={c.product.ih} sizes="(min-width: 48rem) 22vw, 45vw" inset={10} className="group-hover:scale-[1.05]" />
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function BrandWall({ brands }: { brands: { slug: string; name: string; count: number }[] }) {
  return (
    <Reveal as="section" className="shell">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-line pb-5">
        <h2 className="text-[2rem] md:text-[2.5rem]">Марки</h2>
        <Link href="/marki" className="link mb-1 flex shrink-0 items-center gap-2 text-[0.875rem] font-semibold">
          Всички марки <IconArrowRight size={16} />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link href={`/marki/${b.slug}`} className="group flex items-baseline justify-between gap-3 border-b border-transparent py-1 transition-colors duration-200 hover:border-line">
              <span className="truncate font-display text-[1.3rem] leading-tight md:text-[1.45rem]">{b.name}</span>
              <span className="num text-[0.75rem] text-ink-3">{count(b.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
