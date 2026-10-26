import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { countFor, list, parseFilters } from "@/lib/catalog";
import { listingMeta, type SearchParams } from "@/lib/seo";
import { COLLECTION_BY_ID, COLLECTIONS, type CollectionId } from "@/lib/taxonomy";

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export const dynamicParams = false;

export function generateStaticParams() {
  return COLLECTIONS.filter((c) => countFor(`#${c.id}`) > 0).map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = COLLECTION_BY_ID.get(id as CollectionId);
  if (!c) return {};
  return listingMeta(`/kolektsii/${c.id}`, c.title, c.intro, parseFilters(await searchParams));
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const c = COLLECTION_BY_ID.get(id as CollectionId);
  if (!c) notFound();
  const filters = parseFilters(await searchParams);
  // "Ново" is about what arrived last: newest first unless the visitor chose another order.
  const effective = c.id === "novo" && !filters.sort ? { ...filters, sort: "new" as const } : filters;
  const result = list({ tag: c.id }, effective);
  return (
    <Listing
      crumbs={[{ href: "/", label: "Начало" }, { label: c.title }]}
      eyebrow="Колекция"
      title={c.title}
      intro={c.intro}
      chips={COLLECTIONS.filter((x) => countFor(`#${x.id}`) > 0).map((x) => ({ href: `/kolektsii/${x.id}`, label: x.name, current: x.id === c.id }))}
      result={result}
      filters={filters}
      basePath={`/kolektsii/${c.id}`}
      showCategories
    />
  );
}
