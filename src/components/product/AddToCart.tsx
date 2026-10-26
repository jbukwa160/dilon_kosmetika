"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PER_LINE, useCart } from "@/components/cart/CartProvider";
import { QtyStepper } from "@/components/cart/CartDrawer";
import { FavoriteButton } from "@/components/CardActions";
import { IconBag, IconCheck } from "@/components/Icons";
import type { CardProduct } from "@/lib/types";

export function AddToCart({ product }: { product: CardProduct }) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const inCart = lines.find((l) => l.sku === product.sku)?.qty ?? 0;
  const max = Math.max(0, Math.min(MAX_PER_LINE, product.stock) - inCart);
  const soldOut = product.stock <= 0;

  if (soldOut) {
    return (
      <div className="flex gap-3">
        <button type="button" className="btn btn-ink flex-1" disabled>
          Изчерпан
        </button>
        <FavoriteButton product={product} className="size-12 border border-line-strong bg-transparent" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <QtyStepper qty={Math.min(qty, Math.max(1, max))} max={Math.max(1, max)} onChange={(n) => setQty(Math.max(1, Math.min(n, Math.max(1, max))))} label={product.name} />
      <button
        type="button"
        className="btn btn-ink min-w-[13rem] flex-1"
        disabled={max <= 0}
        onClick={() => {
          if (add(product, Math.min(qty, max)) > 0) {
            setDone(true);
            setQty(1);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setDone(false), 1800);
          }
        }}
      >
        {/* The two labels crossfade with a little blur, so the change reads as one button changing its mind. */}
        <span className="relative grid">
          <span className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,filter] duration-200 ${done ? "opacity-0 blur-[2px]" : ""}`}>
            <IconBag size={19} /> {max <= 0 ? "Максимално количество" : "Добави в количката"}
          </span>
          <span className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,filter] duration-200 ${done ? "" : "opacity-0 blur-[2px]"}`} aria-hidden={!done}>
            <IconCheck size={19} /> Добавено
          </span>
        </span>
      </button>
      <FavoriteButton product={product} className="size-12 border border-line-strong bg-transparent backdrop-blur-none" />
    </div>
  );
}
