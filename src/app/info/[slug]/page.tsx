import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/Listing";
import { INFO_SLUGS, type InfoSlug, infoPages } from "@/content/pages";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return INFO_SLUGS.map((slug) => ({ slug }));
}

const isSlug = (s: string): s is InfoSlug => (INFO_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const page = infoPages()[slug];
  return { title: page.title, description: page.description, alternates: { canonical: `/info/${slug}` } };
}

const NAV: { slug: InfoSlug; label: string }[] = [
  { slug: "dostavka", label: "Доставка и плащане" },
  { slug: "vrashtane", label: "Връщане и рекламации" },
  { slug: "kak-da-porucham", label: "Как да поръчам" },
  { slug: "kontakti", label: "Контакти" },
  { slug: "za-nas", label: "За нас" },
  { slug: "obshti-usloviya", label: "Общи условия" },
  { slug: "poveritelnost", label: "Поверителност" },
  { slug: "biskvitki", label: "Бисквитки и съхранение" },
];

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const page = infoPages()[slug];
  return (
    <div className="shell pt-6 md:pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Начало" }, { label: page.title }]} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[15rem_minmax(0,46rem)] lg:gap-20">
        <nav aria-label="Информация" className="order-2 lg:order-1">
          <ul className="space-y-1 border-t border-line pt-4 lg:sticky lg:top-36 lg:border-0 lg:pt-2">
            {NAV.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/info/${n.slug}`}
                  aria-current={n.slug === slug ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-[0.9375rem] transition-colors duration-150 ${n.slug === slug ? "bg-cream font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 lg:order-2">
          <h1 className="display text-[2.6rem] sm:text-[3.2rem]">{page.title}</h1>
          <div className="prose-omaya mt-8">{page.body}</div>
        </article>
      </div>
    </div>
  );
}
