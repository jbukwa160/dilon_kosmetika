import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { list, navCategories, parseFilters } from "@/lib/catalog";
import { count } from "@/lib/format";
import { listingMeta, type SearchParams } from "@/lib/seo";

type Props = { params: Promise<{ cat: string; sub: string }>; searchParams: SearchParams };

export const dynamicParams = false;

export function generateStaticParams() {
  return navCategories().flatMap((c) => c.subs.map((s) => ({ cat: c.id, sub: s.id })));
}

function find(cat: string, sub: string) {
  const c = navCategories().find((x) => x.id === cat);
  const s = c?.subs.find((x) => x.id === sub);
  return c && s ? { c, s } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { cat, sub } = await params;
  const found = find(cat, sub);
  if (!found) return {};
  const { c, s } = found;
  return listingMeta(
    `/${c.id}/${s.id}`,
    `${s.name} — ${c.name}`,
    `${s.name}: ${count(s.count)} продукта от водещи марки. Доставка за 1–3 работни дни и плащане при получаване.`,
    parseFilters(await searchParams),
  );
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { cat, sub } = await params;
  const found = find(cat, sub);
  if (!found) notFound();
  const { c, s } = found;
  const filters = parseFilters(await searchParams);
  const result = list({ category: c.id, sub: s.id }, filters);
  return (
    <Listing
      crumbs={[{ href: "/", label: "Начало" }, { href: `/${c.id}`, label: c.name }, { label: s.name }]}
      eyebrow={c.name}
      title={s.name}
      chips={[
        { href: `/${c.id}`, label: `Всички в „${c.name}“` },
        ...c.subs.map((x) => ({ href: `/${c.id}/${x.id}`, label: x.name, count: x.count, current: x.id === s.id })),
      ]}
      result={result}
      filters={filters}
      basePath={`/${c.id}/${s.id}`}
    />
  );
}
