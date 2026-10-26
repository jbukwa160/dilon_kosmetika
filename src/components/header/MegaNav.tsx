"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight } from "@/components/Icons";
import { count } from "@/lib/format";

export type MenuCategory = {
  id: string;
  name: string;
  count: number;
  subs: { id: string; name: string; group: string; count: number }[];
  cover: { src: string; iw: number; ih: number; alt: string } | null;
};

const OPEN_DELAY = 90;
const CLOSE_DELAY = 170;

/**
 * Category bar with mega menus. A menu opens on hover (after a short pause, so passing the mouse over the bar does
 * not flash menus), on keyboard focus and on tap. Once one menu is open, moving to the next swaps instantly.
 */
export function MegaNav({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [instant, setInstant] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the menu when the page changes
  useEffect(() => setOpen(null), [pathname]);
  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const show = (id: string, delay = OPEN_DELAY) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    if (open) {
      setInstant(open !== id);
      setOpen(id);
      return;
    }
    openTimer.current = setTimeout(() => {
      setInstant(false);
      setOpen(id);
    }, delay);
  };
  const hide = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => {
      setInstant(false);
      setOpen(null);
    }, CLOSE_DELAY);
  };

  return (
    <nav aria-label="Категории" className="relative hidden border-t border-line lg:block" onMouseLeave={hide}>
      <ul className="shell flex h-12 items-center justify-between gap-1">
        {categories.map((c) => {
          const active = pathname === `/${c.id}` || pathname.startsWith(`/${c.id}/`);
          const isOpen = open === c.id;
          return (
            <li
              key={c.id}
              className="flex h-full items-center"
              onMouseEnter={() => show(c.id)}
              onFocus={(e) => {
                if (e.target.matches(":focus-visible")) show(c.id, 0);
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
              }}
            >
              <Link
                href={`/${c.id}`}
                aria-expanded={isOpen}
                className={`relative flex h-full items-center px-2 text-[0.875rem] font-[550] tracking-[0.01em] transition-colors duration-200 after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:origin-left after:bg-garnet after:transition-transform after:duration-300 after:ease-out ${
                  active || isOpen ? "text-ink after:scale-x-100" : "text-ink-2 after:scale-x-0 hover:text-ink"
                }`}
              >
                {c.name}
              </Link>
              <Panel category={c} open={isOpen} instant={instant} onEnter={() => show(c.id, 0)} />
            </li>
          );
        })}
        <li className="flex h-full items-center border-l border-line pl-3">
          <Link href="/marki" className="link px-2 text-[0.875rem] font-[550] text-ink-2 hover:text-ink">
            Марки
          </Link>
        </li>
        <li className="flex h-full items-center">
          <Link href="/kolektsii/novo" className="link px-2 text-[0.875rem] font-[650] text-garnet">
            Ново
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function Panel({ category: c, open, instant, onEnter }: { category: MenuCategory; open: boolean; instant: boolean; onEnter: () => void }) {
  const groups = new Map<string, MenuCategory["subs"]>();
  for (const s of c.subs) {
    const list = groups.get(s.group) ?? [];
    list.push(s);
    groups.set(s.group, list);
  }
  return (
    <div
      className="pop absolute inset-x-0 top-full z-40 origin-top border-y border-line bg-cream shadow-[0_30px_60px_-40px_rgb(27_22_20/0.45)]"
      data-open={open}
      data-instant={instant}
      onMouseEnter={onEnter}
    >
      <div className="shell grid grid-cols-[1fr_17rem] gap-12 py-9 xl:grid-cols-[1fr_20rem]">
        <div className="columns-3 gap-10 xl:columns-4">
          {[...groups.entries()].map(([group, subs]) => (
            <div key={group || "all"} className="mb-7 break-inside-avoid">
              {group ? <p className="eyebrow mb-3">{group}</p> : null}
              <ul className="space-y-2">
                {subs.map((s) => (
                  <li key={s.id}>
                    <Link href={`/${c.id}/${s.id}`} tabIndex={open ? 0 : -1} className="link text-[0.9375rem] text-ink-2 hover:text-ink">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link
          href={`/${c.id}`}
          tabIndex={open ? 0 : -1}
          className="group/cover relative flex flex-col justify-end overflow-hidden rounded-lg bg-tile p-5"
          style={{ minHeight: "15rem" }}
        >
          {c.cover ? (
            <Image
              src={c.cover.src}
              alt=""
              fill
              sizes="20rem"
              quality={75}
              className="object-contain p-8 pb-16 mix-blend-multiply transition-transform duration-700 ease-out group-hover/cover:scale-[1.04]"
            />
          ) : null}
          <span className="relative">
            <span className="block font-display text-[1.6rem] leading-none">{c.name}</span>
            <span className="mt-2 flex items-center gap-2 text-[0.8125rem] text-ink-2">
              Всички {count(c.count)} продукта <IconArrowRight size={16} />
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
