import type { Metadata } from "next";
import Link from "next/link";
import { Listing } from "@/components/listing/Listing";
import { list, navCategories, normalizeQuery, parseFilters } from "@/lib/catalog";
import type { SearchParams } from "@/lib/seo";

type Props = { searchParams: SearchParams };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = one((await searchParams).q).trim().slice(0, 80);
  return { title: q ? `Търсене: ${q}` : "Търсене", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const filters = parseFilters(sp);
  const valid = normalizeQuery(q).length > 0;
  const result = list({ q: valid ? q : "" }, filters);
  return (
    <Listing
      crumbs={[{ href: "/", label: "Начало" }, { label: "Търсене" }]}
      eyebrow="Търсене"
      title={valid ? `„${q}“` : "Какво търсите?"}
      intro={valid ? undefined : "Напишете име на продукт, марка или вид продукт — например „серум с витамин C“ или „Nivea“."}
      result={result}
      filters={filters}
      basePath="/tarsene"
      q={valid ? q : undefined}
      showCategories
      empty={
        <>
          <p className="font-display text-[1.8rem]">{valid ? `Няма резултати за „${q}“` : "Започнете с една дума"}</p>
          <p className="mx-auto mt-2 max-w-md text-ink-2">Опитайте с по-кратка дума, с името на марката или разгледайте категориите:</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {navCategories().map((c) => (
              <li key={c.id}>
                <Link href={`/${c.id}`} className="chip">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      }
    />
  );
}
