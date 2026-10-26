"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClose } from "@/components/Icons";
import { price } from "@/lib/format";
import { useCart } from "./CartProvider";

const SHOW_MS = 4200;

/**
 * A short note under the bag icon after something is added. It grows from the top right (where the bag is), waits
 * while the pointer rests on it, and leaves on its own.
 */
export function AddedNote() {
  const { added, dismissAdded, setOpen, count } = useCart();
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!added) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the note for each add
    setVisible(true);
  }, [added]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!visible || hover) return;
    timer.current = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [visible, hover, added]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  const p = added?.product;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex justify-end sm:inset-x-auto sm:right-5 sm:top-4"
    >
      {p ? (
        <div
          className="pop pointer-events-auto w-full origin-top-right rounded-2xl border border-line bg-cream p-3.5 shadow-[0_24px_60px_-24px_rgb(27_22_20/0.5)] sm:w-[22rem]"
          data-open={visible}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onTransitionEnd={() => {
            if (!visible) dismissAdded();
          }}
        >
          <div className="flex items-start gap-3">
            <span className="tile relative size-16 shrink-0 rounded-md">
              <Image src={p.image} alt="" fill sizes="64px" quality={75} className="object-contain p-1.5 mix-blend-multiply" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-sage">
                <IconCheck size={16} /> Добавено в количката
              </p>
              {p.brand ? <p className="eyebrow mt-1.5 truncate">{p.brand}</p> : null}
              <p className="clamp-2 mt-0.5 text-[0.875rem] leading-snug">{p.name}</p>
              <p className="num mt-0.5 text-[0.8125rem] text-ink-2">{price(p.price)}</p>
            </div>
            <button type="button" className="icon-btn -mr-1.5 -mt-1.5 size-8 text-ink-3" aria-label="Затвори" onClick={() => setVisible(false)}>
              <IconClose size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ink btn-sm mt-3 w-full"
            onClick={() => {
              setVisible(false);
              setOpen(true);
            }}
          >
            Виж количката ({count})
          </button>
        </div>
      ) : null}
    </div>
  );
}
