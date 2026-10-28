"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { IconBag, IconCheck } from "@/components/Icons";
import { price } from "@/lib/format";
import { BUNDLE_DISCOUNT, bundleDiscount } from "@/lib/site";
import type { CardProduct } from "@/lib/types";

export type PairItem = { card: CardProduct; why: string };

const ALL = ["", "", "двете", "трите", "четирите"];
const percent = (rate: number) => `−${Math.round(rate * 100)}%`;
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * "Перфектни заедно": the product and up to three that complete it, cheaper the more of them are taken together
 * (BUNDLE_DISCOUNT). Every extra can be left out; one button puts the chosen ones in the bag as a set and opens it.
 */
export function PairWith({ product, pairs }: { product: CardProduct; pairs: PairItem[] }) {
  const { add, addBundle, setOpen, dismissAdded } = useCart();
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(pairs.map((p) => p.card.sku)));
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const picked = [product, ...pairs.filter((p) => chosen.has(p.card.sku)).map((p) => p.card)];
  const rate = bundleDiscount(picked.length);
  const full = round(picked.reduce((s, p) => s + p.price, 0));
  const saving = round(full * rate);
  const best = bundleDiscount(pairs.length + 1);
  // Only the steps this product can reach: a product with one extra shows "2 продукта −10 %" only.
  const steps = Object.entries(BUNDLE_DISCOUNT)
    .map(([n, r]) => [Number(n), r] as const)
    .filter(([n]) => n <= pairs.length + 1);

  const toggle = (sku: string) => {
    setDone(false);
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };
  const take = () => {
    if (picked.length > 1) addBundle(picked);
    else add(product, 1);
    // The bag shows everything that was added and the discount; the single-product note would only name the last one.
    dismissAdded();
    setOpen(true);
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  };

  return (
    <section className="mt-10" aria-labelledby="pair-with">
      <p className="eyebrow text-garnet">Перфектни заедно</p>
      <h2 id="pair-with" className="mt-1.5 font-display text-[1.6rem] leading-tight">
        Вземете ги заедно — до {percent(best).slice(1)} отстъпка
      </h2>

      <div className="mt-4 rounded-lg border border-line p-4 sm:p-5">
        <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
          {[{ card: product }, ...pairs].map(({ card }, i) => (
            <Fragment key={card.sku}>
              {i > 0 ? <span className="text-ink-3">+</span> : null}
              <span
                className="tile relative size-14 shrink-0 transition-opacity duration-200 sm:size-[4.5rem]"
                style={{ opacity: i === 0 || chosen.has(card.sku) ? 1 : 0.35 }}
              >
                <Image src={card.image} alt="" fill sizes="72px" quality={75} className="tile-img !opacity-100 p-1.5" />
              </span>
            </Fragment>
          ))}
        </div>

        <ul className="mt-4 space-y-3.5">
          {pairs.map(({ card, why }) => (
            <li key={card.sku}>
              <label className="flex cursor-pointer gap-3 text-[0.875rem]">
                <input type="checkbox" className="check mt-0.5 shrink-0" checked={chosen.has(card.sku)} onChange={() => toggle(card.sku)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-ink-3">{why}</span>
                  <Link href={`/produkt/${card.slug}`} className="link font-medium text-ink">
                    {card.brand ? `${card.brand} ` : ""}
                    {card.name}
                  </Link>
                </span>
                <span className="num shrink-0 font-semibold">{price(card.price)}</span>
              </label>
            </li>
          ))}
        </ul>

        {/* The discount steps, the one reached now marked. */}
        <ol className="mt-5 flex flex-wrap gap-1.5 text-[0.75rem]" aria-label="Отстъпка според броя продукти">
          {steps.map(([n, r]) => (
            <li
              key={n}
              aria-current={n === picked.length ? "step" : undefined}
              className={`num rounded-full px-2.5 py-1 transition-colors duration-200 ${n === picked.length ? "bg-garnet font-semibold text-cream" : "bg-tile text-ink-2"}`}
            >
              {n} продукта {percent(r)}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
          <div aria-live="polite">
            <p className="text-[0.875rem] text-ink-3">
              {picked.length === 1 ? "Само този продукт" : `${picked.length} продукта`}:{" "}
              {saving > 0 ? <s className="num mr-1.5">{price(full)}</s> : null}
              <span className="num text-[1.125rem] font-semibold text-ink">{price(round(full - saving))}</span>
            </p>
            {saving > 0 ? (
              <p className="mt-0.5 text-[0.8125rem] font-semibold text-garnet">
                Спестявате {price(saving)} ({percent(rate)})
              </p>
            ) : (
              <p className="mt-0.5 text-[0.8125rem] text-ink-3">Добавете поне още един продукт за {percent(bundleDiscount(2))}</p>
            )}
          </div>
          <button type="button" className="btn btn-garnet btn-sm" onClick={take}>
            <span className="relative grid">
              <span className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,filter] duration-200 ${done ? "opacity-0 blur-[2px]" : ""}`}>
                <IconBag size={17} /> {picked.length === 1 ? "Добави в количката" : `Добави ${ALL[picked.length]} в количката`}
              </span>
              <span className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,filter] duration-200 ${done ? "" : "opacity-0 blur-[2px]"}`} aria-hidden={!done}>
                <IconCheck size={17} /> Добавено
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
