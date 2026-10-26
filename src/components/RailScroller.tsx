"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./Icons";

/** A horizontal row of cards that scrolls by touch, trackpad or the two arrow buttons. */
export function RailScroller({ children, label, dark = false }: { children: React.ReactNode; label: string; dark?: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };
  const arrow = dark ? "border-white/25 text-porcelain hover:bg-white/10" : "border-line-strong";
  return (
    <div className="relative">
      <ul ref={ref} className="rail" aria-label={label}>
        {children}
      </ul>
      <div className="pointer-events-none absolute -top-[4.25rem] right-0 hidden gap-2 md:flex">
        <button type="button" className={`icon-btn pointer-events-auto border disabled:opacity-30 ${arrow}`} onClick={() => go(-1)} disabled={edges.start} aria-label="Назад">
          <IconChevronLeft size={18} />
        </button>
        <button type="button" className={`icon-btn pointer-events-auto border disabled:opacity-30 ${arrow}`} onClick={() => go(1)} disabled={edges.end} aria-label="Напред">
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
