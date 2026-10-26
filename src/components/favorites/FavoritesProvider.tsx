"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FAVORITES_KEY } from "@/lib/site";
import type { CardProduct } from "@/lib/types";

type FavoritesContext = {
  items: CardProduct[];
  ready: boolean;
  has: (sku: string) => boolean;
  /** Adds or removes the product. Returns true when it is a favourite afterwards. */
  toggle: (product: CardProduct) => boolean;
  remove: (sku: string) => void;
};

const Ctx = createContext<FavoritesContext | null>(null);
const MAX = 200;

function read(): CardProduct[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p) => p && typeof p.sku === "string" && typeof p.slug === "string" && typeof p.name === "string") : [];
  } catch {
    return [];
  }
}

/** Favourites live in this browser only (there are no customer accounts). */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CardProduct[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<CardProduct[]>([]);
  const commit = useCallback((next: CardProduct[]) => {
    itemsRef.current = next;
    setItems(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: favourites last for this visit only.
    }
  }, []);

  useEffect(() => {
    itemsRef.current = read();
    setItems(itemsRef.current);
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FAVORITES_KEY) return;
      itemsRef.current = read();
      setItems(itemsRef.current);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((sku: string) => items.some((p) => p.sku === sku), [items]);
  const toggle = useCallback(
    (product: CardProduct) => {
      const current = itemsRef.current;
      if (current.some((p) => p.sku === product.sku)) {
        commit(current.filter((p) => p.sku !== product.sku));
        return false;
      }
      commit([product, ...current].slice(0, MAX));
      return true;
    },
    [commit],
  );
  const remove = useCallback((sku: string) => commit(itemsRef.current.filter((p) => p.sku !== sku)), [commit]);

  const value = useMemo(() => ({ items, ready, has, toggle, remove }), [items, ready, has, toggle, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites(): FavoritesContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
