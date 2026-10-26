import Link from "next/link";
import { IconChevronLeft, IconChevronRight, IconClose } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductCard";
import { getBrand, type ListResult } from "@/lib/catalog";
import { CONCENTRATIONS, type Filters, GENDERS, listingHref, PRICE_BANDS, toggle } from "@/lib/filters";
import { count, plural } from "@/lib/format";
import { SITE } from "@/lib/site";
import { CATEGORY_BY_ID } from "@/lib/taxonomy";
import { FilterPanel } from "./FilterPanel";
import { MobileFilters, SortSelect } from "./ListingControls";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${SITE.url}${c.href}` } : {}) })),
  };
  return (
    <nav aria-label="Път до страницата" className="text-[0.8125rem] text-ink-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="link hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "text-ink-2" : ""}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />
    </nav>
  );
}

type Chip = { href: string; label: string; count?: number; current?: boolean };

type Props = {
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Subcategories (or sibling subcategories) shown as links above the grid. */
  chips?: Chip[];
  result: ListResult;
  filters: Filters;
  basePath: string;
  q?: string;
  /** Show the category facet (listings that span several categories). */
  showCategories?: boolean;
  empty?: React.ReactNode;
};

export function Listing({ crumbs, eyebrow, title, intro, chips, result, filters: f, basePath, q, showCategories = false, empty }: Props) {
  const active = activeChips(f, basePath, q);
  const hasFilters = active.length > 0;
  return (
    <div className="shell pt-6 md:pt-8">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl md:mt-8">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="display text-[2.8rem] sm:text-[3.4rem] lg:text-[4rem]">{title}</h1>
        {intro ? <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{intro}</p> : null}
      </header>

      {chips?.length ? (
        <nav aria-label="Подкатегории" className="-mx-5 mt-8 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
            {chips.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="chip" aria-current={c.current ? "page" : undefined}>
                  {c.label}
                  {c.count !== undefined ? <span className="num text-[0.75rem] opacity-60">{count(c.count)}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[15.5rem_1fr] xl:gap-14">
        <aside className="hidden lg:block" aria-label="Филтри">
          <div className="sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain pb-8 pr-2 [scrollbar-width:thin]">
            <FilterPanel facets={result.facets} filters={f} basePath={basePath} q={q} showCategories={showCategories} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <MobileFilters facets={result.facets} filters={f} basePath={basePath} q={q} showCategories={showCategories} total={result.total} />
              <p className="text-[0.875rem] text-ink-2" aria-live="polite">
                {plural(result.total, "продукт", "продукта")}
              </p>
            </div>
            <SortSelect filters={f} basePath={basePath} q={q} />
          </div>

          {hasFilters ? (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Избрани филтри">
              {active.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} scroll={false} className="chip h-8 gap-1.5 bg-cream pr-2.5 text-[0.8125rem]" aria-label={`Премахни филтъра ${c.label}`}>
                    {c.label}
                    <IconClose size={14} />
                  </Link>
                </li>
              ))}
              <li>
                <Link href={listingHref(basePath, { ...f, brands: [], price: "", stock: false, cat: "", gender: [], conc: [] }, {}, q)} scroll={false} className="link ml-1 text-[0.8125rem] font-semibold">
                  Изчисти всички
                </Link>
              </li>
            </ul>
          ) : null}

          <div className="mt-8">
            {result.cards.length ? (
              <ProductGrid cards={result.cards} eager={4} />
            ) : (
              <div className="rounded-lg bg-cream px-6 py-16 text-center">
                {empty ?? (
                  <>
                    <p className="font-display text-[1.8rem]">Няма продукти с тези филтри</p>
                    <p className="mt-2 text-ink-2">Махнете някой от филтрите или разгледайте цялата категория.</p>
                  </>
                )}
                {hasFilters ? (
                  <Link href={listingHref(basePath, { ...f, brands: [], price: "", stock: false, cat: "", gender: [], conc: [] }, {}, q)} className="btn btn-ink mt-6">
                    Изчисти филтрите
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {result.pages > 1 ? <Pagination page={result.page} pages={result.pages} hrefFor={(n) => listingHref(basePath, f, { page: n }, q)} /> : null}
        </div>
      </div>
    </div>
  );
}

function activeChips(f: Filters, basePath: string, q?: string): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  const href = (change: Partial<Filters>) => listingHref(basePath, f, change, q);
  if (f.stock) out.push({ href: href({ stock: false }), label: "Само налични" });
  if (f.cat) out.push({ href: href({ cat: "" }), label: CATEGORY_BY_ID.get(f.cat)?.name ?? f.cat });
  for (const g of f.gender) out.push({ href: href({ gender: toggle(f.gender, g) }), label: GENDERS.find((x) => x.id === g)?.label ?? g });
  for (const c of f.conc) out.push({ href: href({ conc: toggle(f.conc, c) }), label: CONCENTRATIONS.find((x) => x.id === c)?.label ?? c });
  if (f.price) out.push({ href: href({ price: "" }), label: PRICE_BANDS.find((b) => b.id === f.price)?.label ?? f.price });
  for (const b of f.brands) out.push({ href: href({ brands: toggle(f.brands, b) }), label: getBrand(b)?.name ?? b });
  return out;
}

function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (n: number) => string }) {
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (page <= 3) [2, 3, 4].forEach((n) => n <= pages && nums.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => n >= 1 && nums.add(n));
  const list = [...nums].sort((a, b) => a - b);
  return (
    <nav aria-label="Страници" className="mt-16 flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="icon-btn border border-line-strong" aria-label="Предишна страница" rel="prev">
              <IconChevronLeft size={18} />
            </Link>
          ) : (
            <span className="icon-btn border border-line opacity-35" aria-hidden="true">
              <IconChevronLeft size={18} />
            </span>
          )}
        </li>
        {list.map((n, i) => (
          <li key={n} className="flex items-center gap-1.5">
            {i > 0 && n - list[i - 1] > 1 ? <span className="px-1 text-ink-3" aria-hidden="true">…</span> : null}
            <Link
              href={hrefFor(n)}
              aria-current={n === page ? "page" : undefined}
              aria-label={`Страница ${n}`}
              className={`num grid size-11 place-items-center rounded-full text-[0.875rem] transition-colors duration-150 ${n === page ? "bg-ink text-cream" : "hover:bg-tile"}`}
            >
              {n}
            </Link>
          </li>
        ))}
        <li>
          {page < pages ? (
            <Link href={hrefFor(page + 1)} className="icon-btn border border-line-strong" aria-label="Следваща страница" rel="next">
              <IconChevronRight size={18} />
            </Link>
          ) : (
            <span className="icon-btn border border-line opacity-35" aria-hidden="true">
              <IconChevronRight size={18} />
            </span>
          )}
        </li>
      </ul>
      <p className="text-[0.8125rem] text-ink-3">
        Страница {page} от {count(pages)}
      </p>
    </nav>
  );
}
