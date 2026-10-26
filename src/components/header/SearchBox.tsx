"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { IconArrowRight, IconClose, IconSearch } from "@/components/Icons";
import { count, price } from "@/lib/format";
import type { CardProduct } from "@/lib/types";

type Suggestion = {
  products: CardProduct[];
  brands: { name: string; slug: string; count: number }[];
  categories: { label: string; href: string; count: number }[];
  total: number;
};

type Option = { id: string; href: string };

/**
 * Header search. Suggestions (categories, brands, products) appear while typing; arrows move through them, Enter
 * opens the highlighted one or all results. Without JavaScript it is a plain form that opens /tarsene.
 */
export function SearchBox({ compact = false }: { compact?: boolean }) {
  // useSearchParams needs a Suspense boundary on statically rendered pages; the fallback looks the same.
  return (
    <Suspense fallback={<StaticField compact={compact} />}>
      <LiveSearch compact={compact} />
    </Suspense>
  );
}

function StaticField({ compact }: { compact: boolean }) {
  return (
    <form action="/tarsene" role="search">
      <div className={`flex items-center gap-2 rounded-full border border-line-strong bg-cream pl-4 pr-1.5 ${compact ? "h-11" : "h-12"}`}>
        <IconSearch size={19} className="shrink-0 text-ink-3" />
        <input
          name="q"
          type="search"
          aria-label="Търсене"
          placeholder="Търсете продукт, марка или категория"
          className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-ink-3 focus:outline-none"
        />
        <button type="submit" className="btn btn-ink btn-sm hidden h-9 px-4 sm:inline-flex" tabIndex={-1} aria-hidden="true">
          Търси
        </button>
      </div>
    </form>
  );
}

function LiveSearch({ compact }: { compact: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = pathname === "/tarsene" ? (params.get("q") ?? "") : "";
  const [q, setQ] = useState(initial);
  // Suggestions are kept together with the query they answer, so a stale answer is never shown for a new query.
  const [answer, setAnswer] = useState<{ term: string; data: Suggestion } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-o${i}`;

  // Keep the field in step with the search page's query, and close the list after navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the URL
    setQ(pathname === "/tarsene" ? (params.get("q") ?? "") : "");
    setOpen(false);
  }, [pathname, params]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Suggestion | null) => {
          if (!d) return;
          setAnswer({ term, data: d });
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const term = q.trim();
  const data = term.length >= 2 && answer?.term === term ? answer.data : null;
  const loading = term.length >= 2 && answer?.term !== term;
  const options: Option[] = [];
  if (data) {
    data.categories.forEach((c, i) => options.push({ id: `c${i}`, href: c.href }));
    data.brands.forEach((b) => options.push({ id: `b${b.slug}`, href: `/marki/${b.slug}` }));
    data.products.forEach((p) => options.push({ id: `p${p.sku}`, href: `/produkt/${p.slug}` }));
  }
  const allHref = `/tarsene?q=${encodeURIComponent(term)}`;
  const showList = open && term.length >= 2 && data !== null;
  const indexOf = (id: string) => options.findIndex((o) => o.id === id);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      if (showList) {
        e.preventDefault();
        setOpen(false);
      } else if (q) setQ("");
    } else if (e.key === "Enter" && active >= 0 && options[active] && showList) {
      e.preventDefault();
      setOpen(false);
      router.push(options[active].href);
    }
  };

  return (
    <div ref={box} className="relative">
      <form action="/tarsene" role="search" onSubmit={(e) => {
        if (!term) {
          e.preventDefault();
          input.current?.focus();
          return;
        }
        e.preventDefault();
        setOpen(false);
        router.push(allHref);
      }}>
        <label className="sr-only" htmlFor={`${listId}-input`}>
          Търсене
        </label>
        <div
          className={`flex items-center gap-2 rounded-full border border-line-strong bg-cream pl-4 pr-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(123_31_46/0.12)] ${
            compact ? "h-11" : "h-12"
          }`}
        >
          <IconSearch size={19} className="shrink-0 text-ink-3" />
          <input
            ref={input}
            id={`${listId}-input`}
            name="q"
            type="search"
            value={q}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Търсете продукт, марка или категория"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-ink-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button
              type="button"
              className="icon-btn size-8 text-ink-3"
              aria-label="Изчисти търсенето"
              onClick={() => {
                setQ("");
                input.current?.focus();
              }}
            >
              <IconClose size={16} />
            </button>
          ) : null}
          <button type="submit" className="btn btn-ink btn-sm hidden h-9 px-4 sm:inline-flex" tabIndex={-1} aria-hidden="true">
            Търси
          </button>
        </div>
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label="Предложения"
        className="pop absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(36rem,75dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-cream p-2 shadow-[0_28px_60px_-28px_rgb(27_22_20/0.45)] lg:right-auto lg:w-[min(46rem,100%)]"
        data-open={showList}
      >
        {data && (data.categories.length || data.brands.length) ? (
          <div className="flex flex-wrap gap-2 border-b border-line px-2 pb-3 pt-2">
            {data.categories.map((c, i) => {
              const idx = indexOf(`c${i}`);
              return (
                <Link
                  key={c.href}
                  id={optionId(idx)}
                  role="option"
                  aria-selected={active === idx}
                  href={c.href}
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className={`chip h-8 ${active === idx ? "chip-on" : ""}`}
                >
                  {c.label}
                  <span className="text-[0.75rem] opacity-60">{count(c.count)}</span>
                </Link>
              );
            })}
            {data.brands.map((b) => {
              const idx = indexOf(`b${b.slug}`);
              return (
                <Link
                  key={b.slug}
                  id={optionId(idx)}
                  role="option"
                  aria-selected={active === idx}
                  href={`/marki/${b.slug}`}
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className={`chip h-8 ${active === idx ? "chip-on" : ""}`}
                >
                  <span className="text-[0.6875rem] uppercase tracking-[0.12em] opacity-60">Марка</span> {b.name}
                </Link>
              );
            })}
          </div>
        ) : null}
        {data?.products.length ? (
          <ul className="py-1">
            {data.products.map((p) => {
              const idx = indexOf(`p${p.sku}`);
              return (
                <li key={p.sku}>
                  <Link
                    id={optionId(idx)}
                    role="option"
                    aria-selected={active === idx}
                    href={`/produkt/${p.slug}`}
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(idx)}
                    className={`flex items-center gap-3.5 rounded-xl p-2 transition-colors duration-150 ${active === idx ? "bg-tile/70" : ""}`}
                  >
                    <span className="tile relative size-14 shrink-0 rounded-md">
                      <Image src={p.image} alt="" fill sizes="56px" quality={75} className="object-contain p-1.5 mix-blend-multiply" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {p.brand ? <span className="eyebrow block truncate">{p.brand}</span> : null}
                      <span className="clamp-2 text-[0.875rem] leading-snug">{p.name}</span>
                    </span>
                    <span className="num shrink-0 text-[0.875rem] font-semibold">{price(p.price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        {data && data.total === 0 && !data.categories.length && !data.brands.length ? (
          <p className="px-3 py-5 text-[0.9375rem] text-ink-2">
            Няма резултати за „{term}“. Опитайте с по-кратка дума или с името на марката.
          </p>
        ) : null}
        {data && data.total > 0 ? (
          <Link
            href={allHref}
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-between rounded-xl px-3 py-3 text-[0.875rem] font-semibold transition-colors duration-150 hover:bg-tile/60"
          >
            Всички {count(data.total)} резултата за „{term}“
            <IconArrowRight size={18} />
          </Link>
        ) : null}
        {loading && !data ? <p className="px-3 py-4 text-[0.875rem] text-ink-3">Търсене…</p> : null}
      </div>
    </div>
  );
}
