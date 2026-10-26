"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconChevronDown } from "@/components/Icons";
import { type Facets, type FacetValue, type Filters, listingHref, toggle } from "@/lib/filters";
import { count } from "@/lib/format";

type Props = { facets: Facets; filters: Filters; basePath: string; q?: string; showCategories: boolean };

/** Filters as links: every choice is a real URL (works without JavaScript, can be shared and bookmarked). */
export function FilterPanel({ facets, filters: f, basePath, q, showCategories }: Props) {
  const href = (change: Partial<Filters>) => listingHref(basePath, f, change, q);
  return (
    <div className="divide-y divide-line">
      <Group title="Наличност" defaultOpen>
        <Option href={href({ stock: !f.stock })} on={f.stock} label="Само налични" count={facets.inStock} />
      </Group>
      {showCategories && facets.categories.length > 1 ? (
        <Group title="Категория" defaultOpen>
          {facets.categories.map((c) => (
            <Option key={c.id} href={href({ cat: f.cat === c.id ? "" : c.id })} on={f.cat === c.id} label={c.label} count={c.count} radio />
          ))}
        </Group>
      ) : null}
      {facets.genders.length ? (
        <Group title="За кого" defaultOpen>
          {facets.genders.map((g) => (
            <Option key={g.id} href={href({ gender: toggle(f.gender, g.id) })} on={f.gender.includes(g.id)} label={g.label} count={g.count} />
          ))}
        </Group>
      ) : null}
      {facets.concentrations.length > 1 ? (
        <Group title="Вид" defaultOpen>
          {facets.concentrations.map((c) => (
            <Option key={c.id} href={href({ conc: toggle(f.conc, c.id) })} on={f.conc.includes(c.id)} label={c.label} count={c.count} />
          ))}
        </Group>
      ) : null}
      <Group title="Цена" defaultOpen>
        {facets.prices.map((p) => (
          <Option key={p.id} href={href({ price: f.price === p.id ? "" : p.id })} on={f.price === p.id} label={p.label} count={p.count} radio />
        ))}
      </Group>
      {facets.brands.length > 1 || f.brands.length ? (
        <Group title="Марка" defaultOpen>
          <BrandList brands={facets.brands} filters={f} href={href} />
        </Group>
      ) : null}
    </div>
  );
}

function Group({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="py-4 first:pt-0">
      <h3 className="font-sans text-[0.8125rem] font-semibold tracking-normal">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1 text-left uppercase tracking-[0.12em]">
          {title}
          <span className={`text-ink-3 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}>
            <IconChevronDown size={16} />
          </span>
        </button>
      </h3>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" inert={!open}>
          <ul className="space-y-0.5 pt-2.5">{children}</ul>
        </div>
      </div>
    </section>
  );
}

function Option({ href, on, label, count: n, radio = false }: { href: string; on: boolean; label: string; count: number; radio?: boolean }) {
  const empty = n === 0 && !on;
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-disabled={empty || undefined}
        tabIndex={empty ? -1 : undefined}
        className={`group flex items-center gap-3 rounded-md py-1.5 text-[0.9rem] ${empty ? "pointer-events-none opacity-40" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`grid size-[1.05rem] shrink-0 place-items-center border-[1.5px] transition-colors duration-150 ${radio ? "rounded-full" : "rounded-[0.3rem]"} ${
            on ? "border-ink bg-ink" : "border-line-strong bg-cream group-hover:border-ink"
          }`}
        >
          {on ? radio ? <span className="size-1.5 rounded-full bg-cream" /> : <span className="h-[0.32rem] w-[0.58rem] -translate-y-px -rotate-45 border-b-2 border-l-2 border-cream" /> : null}
        </span>
        <span className={`flex-1 ${on ? "font-semibold" : ""}`}>
          {label}
          {on ? <span className="sr-only"> (избрано)</span> : null}
        </span>
        <span className="num text-[0.75rem] text-ink-3">{count(n)}</span>
      </Link>
    </li>
  );
}

function BrandList({ brands, filters: f, href }: { brands: FacetValue[]; filters: Filters; href: (c: Partial<Filters>) => string }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term ? brands.filter((b) => b.label.toLowerCase().includes(term)) : brands;
    if (term || all) return list;
    // Selected brands always stay visible.
    const top = list.slice(0, 10);
    for (const b of list) if (f.brands.includes(b.id) && !top.includes(b)) top.push(b);
    return top;
  }, [brands, query, all, f.brands]);
  return (
    <>
      {brands.length > 10 ? (
        <li className="pb-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Търсене на марка"
            aria-label="Търсене на марка"
            className="input h-10 rounded-full text-[0.875rem]"
          />
        </li>
      ) : null}
      {shown.map((b) => (
        <Option key={b.id} href={href({ brands: toggle(f.brands, b.id) })} on={f.brands.includes(b.id)} label={b.label} count={b.count} />
      ))}
      {!query && brands.length > 10 ? (
        <li>
          <button type="button" onClick={() => setAll(!all)} className="link mt-1 text-[0.8125rem] font-semibold">
            {all ? "Покажи по-малко" : `Всички ${brands.length} марки`}
          </button>
        </li>
      ) : null}
      {query && !shown.length ? <li className="py-1 text-[0.8125rem] text-ink-3">Няма такава марка тук.</li> : null}
    </>
  );
}
