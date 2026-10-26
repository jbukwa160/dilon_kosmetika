"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconChevronDown, IconClose, IconMenu } from "@/components/Icons";
import { Portal } from "@/components/Portal";
import { useDialog } from "@/components/useDialog";
import { Wordmark } from "@/components/Wordmark";
import type { MenuCategory } from "./MegaNav";

const INFO = [
  { href: "/info/dostavka", label: "Доставка и плащане" },
  { href: "/info/vrashtane", label: "Връщане и замяна" },
  { href: "/info/kontakti", label: "Контакти" },
];

export function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const titleId = useId();
  useDialog(open, () => setOpen(false), panel);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the menu after navigating
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      <button type="button" className="icon-btn -ml-2" aria-label="Меню" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <IconMenu size={22} />
      </button>
      <Portal>
      <div className="scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel panel-left flex flex-col"
        data-open={open}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <Link href="/" id={titleId} aria-label="Омая — начало">
            <Wordmark className="text-[1.9rem]" />
          </Link>
          <button type="button" className="icon-btn -mr-2" aria-label="Затвори менюто" onClick={() => setOpen(false)} data-autofocus>
            <IconClose size={22} />
          </button>
        </div>
        <nav aria-label="Категории" className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          <ul>
            {categories.map((c) => {
              const isOpen = expanded === c.id;
              return (
                <li key={c.id} className="border-b border-line">
                  <div className="flex items-center">
                    <Link href={`/${c.id}`} className="flex-1 py-3.5 font-display text-[1.45rem] leading-tight">
                      {c.name}
                    </Link>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Скрий" : "Покажи"} подкатегориите на ${c.name}`}
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                    >
                      <span className={`transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}>
                        <IconChevronDown size={18} />
                      </span>
                    </button>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul className="overflow-hidden" inert={!isOpen}>
                      <li>
                        <Link href={`/${c.id}`} className="block py-2 pl-1 text-[0.9375rem] font-semibold text-ink">
                          Всички в „{c.name}“
                        </Link>
                      </li>
                      {c.subs.map((s) => (
                        <li key={s.id}>
                          <Link href={`/${c.id}/${s.id}`} className="block py-2 pl-1 text-[0.9375rem] text-ink-2">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                      <li className="h-3" aria-hidden="true" />
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
          <ul className="mt-5 space-y-1 pb-6">
            <li>
              <Link href="/kolektsii/novo" className="block py-2 text-[1rem] font-semibold text-garnet">
                Ново
              </Link>
            </li>
            <li>
              <Link href="/marki" className="block py-2 text-[1rem]">
                Марки
              </Link>
            </li>
            <li>
              <Link href="/lyubimi" className="block py-2 text-[1rem]">
                Любими
              </Link>
            </li>
            {INFO.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="block py-2 text-[0.9375rem] text-ink-2">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      </Portal>
    </div>
  );
}
