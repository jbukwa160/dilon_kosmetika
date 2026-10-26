"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { IconBag, IconClose, IconHeart } from "@/components/Icons";
import { price } from "@/lib/format";
import type { CardProduct } from "@/lib/types";
import { useFavorites } from "./FavoritesProvider";

export function FavoritesList() {
  const { items: saved, ready, remove } = useFavorites();
  const { add } = useCart();
  const refreshed = useRef(false);
  const [fresh, setFresh] = useState<Map<string, CardProduct>>(new Map());
  // Show today's price and stock; the saved copy is only a fallback.
  const items = saved.map((p) => fresh.get(p.sku) ?? p);

  // Bring prices and stock up to date (they may have changed since the product was saved).
  useEffect(() => {
    if (!ready || refreshed.current || !saved.length) return;
    refreshed.current = true;
    fetch(`/api/cart?skus=${encodeURIComponent(saved.map((p) => p.sku).join(","))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { products: CardProduct[] } | null) => {
        if (!data) return;
        const map = new Map(data.products.map((p) => [p.sku, p]));
        setFresh(map);
        // Products that left the catalog are dropped from the list.
        for (const p of saved) if (!map.has(p.sku)) remove(p.sku);
      })
      .catch(() => {});
  }, [ready, saved, remove]);

  if (!ready) return <div className="h-64" aria-busy="true" />;
  if (!items.length) {
    return (
      <div className="rounded-lg bg-cream px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-tile text-garnet">
          <IconHeart size={24} />
        </span>
        <p className="mt-5 font-display text-[1.8rem]">Все още нямате любими</p>
        <p className="mx-auto mt-2 max-w-md text-ink-2">Натиснете сърцето на продукт, за да го запазите тук и да го намерите лесно по-късно.</p>
        <Link href="/kolektsii/novo" className="btn btn-ink mt-7">
          Разгледайте новото
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 2xl:grid-cols-5">
      {items.map((p) => (
        <li key={p.sku} className="group relative flex flex-col">
          <div className="tile relative aspect-[4/5]">
            <Image src={p.image} alt="" fill sizes="(min-width: 64rem) 22vw, 46vw" quality={75} className="object-contain p-[9%] mix-blend-multiply" />
            <button type="button" onClick={() => remove(p.sku)} className="icon-btn absolute right-2 top-2 z-10 size-9 bg-cream/80" aria-label={`Премахни от любими: ${p.name}`}>
              <IconClose size={16} />
            </button>
          </div>
          <div className="mt-3.5 flex flex-1 flex-col px-0.5">
            {p.brand ? <p className="eyebrow mb-1 truncate">{p.brand}</p> : null}
            <Link href={`/produkt/${p.slug}`} className="clamp-2 text-[0.9375rem] leading-snug">
              {p.name}
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <span className="num text-[0.9375rem] font-semibold">{price(p.price)}</span>
              {p.stock > 0 ? (
                <button type="button" className="icon-btn size-9 bg-ink text-cream" aria-label={`Добави в количката: ${p.name}`} onClick={() => add(p, 1)}>
                  <IconBag size={17} />
                </button>
              ) : (
                <span className="text-[0.75rem] text-ink-3">Изчерпан</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
