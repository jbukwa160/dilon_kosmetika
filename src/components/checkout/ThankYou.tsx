"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconCheck } from "@/components/Icons";
import { price } from "@/lib/format";
import { ORDER_KEY, SITE } from "@/lib/site";

type Saved = {
  number: string;
  total: number;
  shipping: number;
  email: string;
  delivery: string;
  emailSent: boolean;
  lines?: { name: string; brand: string; qty: number; image: string }[];
};

export function ThankYou() {
  const params = useSearchParams();
  const number = params.get("n") ?? "";
  const [order, setOrder] = useState<Saved | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "null") as Saved | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage exists only in the browser
      if (saved && saved.number === number) setOrder(saved);
    } catch {
      // The page still works with the number from the address.
    }
  }, [number]);

  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-cream anim-rise">
        <IconCheck size={30} />
      </span>
      <h1 className="display mt-7 text-[2.8rem] anim-rise sm:text-[3.6rem]" style={{ animationDelay: "80ms" }}>
        Благодарим ви!
      </h1>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2 anim-rise" style={{ animationDelay: "150ms" }}>
        {number ? (
          <>
            Поръчка <strong className="num font-semibold text-ink">{number}</strong> е приета.{" "}
          </>
        ) : (
          "Поръчката е приета. "
        )}
        Ще ви се обадим в работно време ({SITE.hours}), за да я потвърдим.
      </p>
      {order ? (
        <div className="mt-10 rounded-2xl bg-cream p-6 text-left anim-rise sm:p-8" style={{ animationDelay: "220ms" }}>
          {order.lines?.length ? (
            <ul className="divide-y divide-line">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="tile relative size-14 shrink-0 rounded-md">
                    <Image src={l.image} alt="" fill sizes="56px" quality={75} className="object-contain p-1.5 mix-blend-multiply" />
                  </span>
                  <span className="min-w-0 flex-1 text-[0.875rem]">
                    {l.brand ? <span className="eyebrow block">{l.brand}</span> : null}
                    <span className="clamp-2">{l.name}</span>
                  </span>
                  <span className="num text-[0.875rem] text-ink-3">× {l.qty}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Доставка</dt>
              <dd className="text-right">{order.delivery}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold">За плащане при получаване</dt>
              <dd className="num font-semibold">{price(order.total)}</dd>
            </div>
          </dl>
          {order.emailSent ? <p className="mt-4 text-[0.875rem] text-ink-3">Изпратихме потвърждение на {order.email}.</p> : null}
        </div>
      ) : null}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-ink">
          Продължете с разглеждането
        </Link>
        <Link href="/info/dostavka" className="btn btn-line">
          За доставката
        </Link>
      </div>
      <p className="mt-8 text-[0.875rem] text-ink-3">
        Въпроси? {SITE.phone} · {SITE.email}
      </p>
    </div>
  );
}
