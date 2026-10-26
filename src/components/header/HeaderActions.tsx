"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { IconBag, IconHeart } from "@/components/Icons";

function Count({ n, tick }: { n: number; tick?: number }) {
  if (n <= 0) return null;
  return (
    <span
      key={tick}
      className="num absolute right-0.5 top-0.5 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-garnet px-1 text-[0.6875rem] font-bold leading-none text-cream anim-bump"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function HeaderActions() {
  const cart = useCart();
  const fav = useFavorites();
  return (
    <div className="flex items-center gap-0.5">
      <Link href="/lyubimi" className="icon-btn relative" aria-label={fav.items.length ? `Любими (${fav.items.length})` : "Любими"}>
        <IconHeart size={21} />
        {fav.ready ? <Count n={fav.items.length} /> : null}
      </Link>
      <button
        type="button"
        className="icon-btn relative"
        aria-label={cart.count ? `Количка, ${cart.count} продукта` : "Количка"}
        aria-haspopup="dialog"
        onClick={() => cart.setOpen(true)}
      >
        <IconBag size={22} />
        {cart.ready ? <Count n={cart.count} tick={cart.count} /> : null}
      </button>
    </div>
  );
}
