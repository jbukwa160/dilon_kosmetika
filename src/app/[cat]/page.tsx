import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { list, navCategories, parseFilters } from "@/lib/catalog";
import { count } from "@/lib/format";
import { listingMeta, type SearchParams } from "@/lib/seo";

type Props = { params: Promise<{ cat: string }>; searchParams: SearchParams };

export const dynamicParams = false;

export function generateStaticParams() {
  return navCategories().map((c) => ({ cat: c.id }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { cat } = await params;
  const c = navCategories().find((x) => x.id === cat);
  if (!c) return {};
  return listingMeta(`/${c.id}`, c.name, `${c.intro} ${count(c.count)} продукта с доставка за 1–3 дни.`, parseFilters(await searchParams));
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { cat } = await params;
  const c = navCategories().find((x) => x.id === cat);
  if (!c) notFound();
  const filters = parseFilters(await searchParams);
  const result = list({ category: c.id }, filters);
  return (
    <Listing
      crumbs={[{ href: "/", label: "Начало" }, { label: c.name }]}
      title={c.name}
      intro={c.intro}
      chips={c.subs.map((s) => ({ href: `/${c.id}/${s.id}`, label: s.name, count: s.count }))}
      result={result}
      filters={filters}
      basePath={`/${c.id}`}
    />
  );
}
