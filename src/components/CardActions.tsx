"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { IconBag, IconCheck, IconHeart } from "@/components/Icons";
import type { CardProduct } from "@/lib/types";

export function FavoriteButton({ product, className = "" }: { product: CardProduct; className?: string }) {
  const { has, toggle, ready } = useFavorites();
  const on = ready && has(product.sku);
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Премахни от любими: ${product.name}` : `Добави в любими: ${product.name}`}
      onClick={() => {
        if (toggle(product)) setPop((n) => n + 1);
      }}
      className={`icon-btn size-9 bg-cream/80 text-ink backdrop-blur-sm ${on ? "text-garnet" : ""} ${className}`}
    >
      <span key={pop} className={pop ? "anim-bump inline-grid" : "inline-grid"}>
        <IconHeart size={18} filled={on} />
      </span>
    </button>
  );
}

/** Small "add to bag" button on product cards (single products in stock only). */
export function QuickAdd({ product, className = "" }: { product: CardProduct; className?: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      aria-label={`Добави в количката: ${product.name}`}
      onClick={() => {
        if (add(product, 1) > 0) {
          setDone(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1400);
        }
      }}
      className={`icon-btn size-10 bg-ink text-cream shadow-[0_6px_18px_-8px_rgb(27_22_20/0.6)] hover:bg-[#3a302b] ${className}`}
    >
      <span className="relative grid size-5 place-items-center">
        <span className={`absolute transition-[opacity,filter,transform] duration-200 ${done ? "scale-75 opacity-0 blur-[2px]" : "opacity-100"}`}>
          <IconBag size={19} />
        </span>
        <span className={`absolute transition-[opacity,filter,transform] duration-200 ${done ? "opacity-100" : "scale-75 opacity-0 blur-[2px]"}`}>
          <IconCheck size={19} />
        </span>
      </span>
    </button>
  );
}
