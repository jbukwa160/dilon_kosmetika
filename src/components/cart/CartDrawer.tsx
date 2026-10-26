"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { IconArrowRight, IconBag, IconClose, IconMinus, IconPlus, IconTrash } from "@/components/Icons";
import { useDialog } from "@/components/useDialog";
import { price, priceShort } from "@/lib/format";
import { SHIPPING } from "@/lib/site";
import { MAX_PER_LINE, useCart } from "./CartProvider";

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const left = Math.max(0, Math.round((SHIPPING.freeFrom - subtotal) * 100) / 100);
  const progress = Math.min(1, subtotal / SHIPPING.freeFrom);
  return (
    <div>
      <p className="text-[0.8125rem] text-ink-2" aria-live="polite">
        {left > 0 ? (
          <>
            Още <strong className="num font-semibold text-ink">{price(left)}</strong> до безплатна доставка
          </>
        ) : (
          <strong className="font-semibold text-sage">Доставката е безплатна</strong>
        )}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div
          className="h-full origin-left rounded-full bg-garnet transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

export function QtyStepper({ qty, max, onChange, label }: { qty: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper h-9" role="group" aria-label={`Количество: ${label}`}>
      <button type="button" className="!w-9" aria-label="Намали количеството" onClick={() => onChange(qty - 1)} disabled={qty <= 1}>
        <IconMinus size={15} />
      </button>
      <span className="num min-w-6 text-center text-[0.875rem] font-semibold" aria-live="polite">
        {qty}
      </span>
      <button type="button" className="!w-9" aria-label="Увеличи количеството" onClick={() => onChange(qty + 1)} disabled={qty >= max}>
        <IconPlus size={15} />
      </button>
    </div>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const pathname = usePathname();
  useDialog(cart.open, () => cart.setOpen(false), panel);
  const { setOpen } = cart;

  useEffect(() => setOpen(false), [pathname, setOpen]);

  return (
    <>
      <div className="scrim" data-open={cart.open} onClick={() => cart.setOpen(false)} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel panel-right flex flex-col" data-open={cart.open}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5 sm:px-6">
          <h2 id={titleId} className="font-display text-[1.6rem]">
            Количка{cart.count ? <span className="num ml-2 font-sans text-[0.875rem] text-ink-3">({cart.count})</span> : null}
          </h2>
          <button type="button" className="icon-btn -mr-2" aria-label="Затвори количката" onClick={() => cart.setOpen(false)} data-autofocus>
            <IconClose size={22} />
          </button>
        </div>

        {cart.ready && cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-tile text-ink-2">
              <IconBag size={26} />
            </span>
            <p className="mt-5 font-display text-[1.6rem]">Количката е празна</p>
            <p className="mt-2 text-[0.9375rem] text-ink-2">Разгледайте новото или се върнете към любимите си продукти.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/kolektsii/novo" className="btn btn-ink btn-sm" onClick={() => cart.setOpen(false)}>
                Ново
              </Link>
              <Link href="/lyubimi" className="btn btn-line btn-sm" onClick={() => cart.setOpen(false)}>
                Любими
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <FreeShippingMeter subtotal={cart.subtotal} />
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 sm:px-6">
              {cart.lines.map((l) => (
                <li key={l.sku} className="flex gap-4 py-5">
                  <Link href={`/produkt/${l.slug}`} className="tile relative block size-24 shrink-0 rounded-md" onClick={() => cart.setOpen(false)}>
                    <Image src={l.image} alt="" fill sizes="96px" quality={75} className="object-contain p-2 mix-blend-multiply" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    {l.brand ? <p className="eyebrow truncate">{l.brand}</p> : null}
                    <Link href={`/produkt/${l.slug}`} className="clamp-2 mt-0.5 text-[0.9375rem] leading-snug" onClick={() => cart.setOpen(false)}>
                      {l.name}
                    </Link>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <QtyStepper qty={l.qty} max={Math.min(MAX_PER_LINE, l.stock)} onChange={(n) => cart.setQty(l.sku, n)} label={l.name} />
                      <p className="num text-[0.9375rem] font-semibold">{price(l.price * l.qty)}</p>
                    </div>
                  </div>
                  <button type="button" className="icon-btn -mr-2 -mt-2 size-9 text-ink-3" aria-label={`Премахни ${l.name}`} onClick={() => cart.remove(l.sku)}>
                    <IconTrash size={17} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-line bg-cream px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.9375rem] text-ink-2">Междинна сума</span>
                <span className="num text-[1.25rem] font-semibold">{price(cart.subtotal)}</span>
              </div>
              <p className="mt-1 text-[0.8125rem] text-ink-3">
                Доставка от {price(SHIPPING.methods[0].price)}, безплатна над {priceShort(SHIPPING.freeFrom)}. Плащате при получаване.
              </p>
              <Link href="/poruchka" className="btn btn-ink mt-4 w-full" onClick={() => cart.setOpen(false)}>
                Към поръчката <IconArrowRight size={18} />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
