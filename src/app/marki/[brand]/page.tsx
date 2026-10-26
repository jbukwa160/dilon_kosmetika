import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { getBrand, list, parseFilters } from "@/lib/catalog";
import { count } from "@/lib/format";
import { listingMeta, type SearchParams } from "@/lib/seo";

type Props = { params: Promise<{ brand: string }>; searchParams: SearchParams };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) return {};
  return listingMeta(`/marki/${b.slug}`, b.name, `${b.name}: ${count(b.count)} продукта с доставка за 1–3 дни и плащане при получаване.`, parseFilters(await searchParams));
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();
  const filters = parseFilters(await searchParams);
  const result = list({ brand: b.slug }, filters);
  return (
    <Listing
      crumbs={[{ href: "/", label: "Начало" }, { href: "/marki", label: "Марки" }, { label: b.name }]}
      eyebrow="Марка"
      title={b.name}
      result={result}
      filters={filters}
      basePath={`/marki/${b.slug}`}
      showCategories
    />
  );
}
