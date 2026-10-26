"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { IconClose, IconFilter } from "@/components/Icons";
import { Portal } from "@/components/Portal";
import { useDialog } from "@/components/useDialog";
import { activeFilterCount, type Facets, type Filters, listingHref, SORTS, type SortId } from "@/lib/filters";
import { count } from "@/lib/format";
import { FilterPanel } from "./FilterPanel";

export function SortSelect({ filters, basePath, q }: { filters: Filters; basePath: string; q?: string }) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-[0.8125rem] text-ink-3 sm:block">
        Подреди:
      </label>
      <div className="relative">
        <select
          id={id}
          value={filters.sort}
          onChange={(e) => router.push(listingHref(basePath, filters, { sort: e.target.value as SortId }, q), { scroll: false })}
          className="h-10 appearance-none rounded-full border border-line-strong bg-cream py-0 pl-4 pr-9 text-[0.875rem] focus:border-ink focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/** "Филтри" button and bottom sheet for phones and tablets. */
export function MobileFilters(props: { facets: Facets; filters: Filters; basePath: string; q?: string; showCategories: boolean; total: number }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, () => setOpen(false), panel);
  const active = activeFilterCount(props.filters);
  // A filter choice navigates but the sheet stays open, so several can be picked; the button shows the new total.
  return (
    <div className="lg:hidden">
      <button type="button" className="chip h-10 gap-2 px-4" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <IconFilter size={18} /> Филтри
        {active ? <span className="num grid size-5 place-items-center rounded-full bg-garnet text-[0.6875rem] font-bold text-cream">{active}</span> : null}
      </button>
      <Portal>
        <div className="scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel panel-bottom flex flex-col" data-open={open}>
          <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
            <h2 id={titleId} className="font-display text-[1.5rem]">
              Филтри
            </h2>
            <button type="button" className="icon-btn -mr-2" aria-label="Затвори филтрите" onClick={() => setOpen(false)} data-autofocus>
              <IconClose size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <FilterPanel facets={props.facets} filters={props.filters} basePath={props.basePath} q={props.q} showCategories={props.showCategories} />
          </div>
          <div className="shrink-0 border-t border-line bg-cream px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button type="button" className="btn btn-ink w-full" onClick={() => setOpen(false)}>
              Покажи {count(props.total)} {props.total === 1 ? "продукт" : "продукта"}
            </button>
          </div>
        </div>
      </Portal>
    </div>
  );
}
