import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/listing/Listing";
import { allBrands } from "@/lib/catalog";
import { count } from "@/lib/format";

export function generateMetadata(): Metadata {
  const n = allBrands().length;
  return {
    title: "Марки",
    description: `Всички ${count(n)} марки козметика, парфюми и грижа в Омая — от L'Oréal и Nivea до нишовата парфюмерия.`,
    alternates: { canonical: "/marki" },
  };
}

function letterOf(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(ch)) return ch;
  if (/[А-Я]/.test(ch)) return ch;
  const plain = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  if (/[A-Z]/.test(plain)) return plain;
  return "0–9";
}

export default function BrandsPage() {
  const brands = allBrands();
  const groups = new Map<string, typeof brands>();
  for (const b of [...brands].sort((a, b) => a.name.localeCompare(b.name, "bg", { sensitivity: "base" }))) {
    const l = letterOf(b.name);
    const list = groups.get(l) ?? [];
    list.push(b);
    groups.set(l, list);
  }
  const latin = [...groups.keys()].filter((l) => /[A-Z]/.test(l)).sort();
  const cyrillic = [...groups.keys()].filter((l) => /[А-Я]/.test(l)).sort((a, b) => a.localeCompare(b, "bg"));
  const order = [...latin, ...cyrillic, ...(groups.has("0–9") ? ["0–9"] : [])];
  const anchor = (l: string) => `m-${encodeURIComponent(l)}`;
  return (
    <div className="shell pt-6 md:pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Начало" }, { label: "Марки" }]} />
      <header className="mt-6 md:mt-8">
        <h1 className="display text-[2.8rem] sm:text-[3.4rem] lg:text-[4rem]">Марки</h1>
        <p className="mt-4 max-w-2xl text-[1.0625rem] text-ink-2">{count(brands.length)} марки — от всекидневната грижа до нишовата парфюмерия.</p>
      </header>

      <section className="mt-10" aria-labelledby="popular">
        <h2 id="popular" className="eyebrow">
          Най-търсени
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.slice(0, 12).map((b) => (
            <li key={b.slug}>
              <Link href={`/marki/${b.slug}`} className="group flex h-24 flex-col justify-between rounded-lg bg-cream p-4 transition-colors duration-200 hover:bg-tile">
                <span className="truncate font-display text-[1.3rem] leading-tight">{b.name}</span>
                <span className="num text-[0.75rem] text-ink-3">{count(b.count)} продукта</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Букви" className="sticky top-[6.9rem] z-30 -mx-5 mt-12 overflow-x-auto border-y border-line bg-porcelain/95 px-5 py-2 backdrop-blur [scrollbar-width:none] md:top-[7.8rem] lg:top-[7.75rem] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-0.5 lg:w-auto lg:flex-wrap">
          {order.map((l) => (
            <li key={l}>
              <a href={`#${anchor(l)}`} className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-[0.875rem] font-semibold transition-colors duration-150 hover:bg-tile">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-12">
        {order.map((l) => (
          <section key={l} id={anchor(l)} aria-label={`Марки с ${l}`} className="grid gap-4 border-b border-line pb-10 md:grid-cols-[6rem_1fr]">
            <h2 className="font-display text-[3rem] leading-none text-garnet">{l}</h2>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groups.get(l)!.map((b) => (
                <li key={b.slug}>
                  <Link href={`/marki/${b.slug}`} className="group flex items-baseline justify-between gap-3 py-0.5">
                    <span className="link truncate text-[0.9375rem]">{b.name}</span>
                    <span className="num text-[0.75rem] text-ink-3">{count(b.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
