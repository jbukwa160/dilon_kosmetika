"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { price } from "@/lib/format";

export type Variant = { slug: string; label: string; image: string; price: number; stock: number; current: boolean };

const SHOW = 18;

/**
 * Shades or sizes of the product. Shades use the product's own photo as a swatch (the bottle shows the colour);
 * sizes are chips with their price. Each choice is a link to that product's page.
 */
export function VariantPicker({ kind, variants }: { kind: "shade" | "size"; variants: Variant[] }) {
  const [all, setAll] = useState(false);
  const current = variants.find((v) => v.current);
  const currentIndex = variants.findIndex((v) => v.current);
  // Keep the current shade visible even when the list is shortened.
  const shown = all || variants.length <= SHOW + 2 ? variants : variants.filter((v, i) => i < SHOW || i === currentIndex);
  return (
    <div>
      <p className="text-[0.875rem]">
        <span className="text-ink-3">{kind === "size" ? "Размер:" : "Нюанс:"}</span> <span className="font-semibold">{current?.label}</span>
        <span className="text-ink-3"> · {variants.length} {kind === "size" ? "размера" : "нюанса"}</span>
      </p>
      {kind === "size" ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {variants.map((v) => (
            <li key={v.slug}>
              <Link href={`/produkt/${v.slug}`} scroll={false} replace className={`chip h-auto flex-col items-start gap-0 rounded-2xl px-4 py-2 ${v.stock <= 0 ? "opacity-50" : ""}`} aria-current={v.current ? "page" : undefined}>
                <span className="text-[0.875rem] font-semibold">{v.label}</span>
                <span className="num text-[0.75rem] opacity-80">{v.stock > 0 ? price(v.price) : "изчерпан"}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
          {shown.map((v) => (
            <li key={v.slug}>
              <Link
                href={`/produkt/${v.slug}`}
                scroll={false}
                replace
                title={`${v.label}${v.stock > 0 ? "" : " — изчерпан"}`}
                aria-label={`Нюанс ${v.label}${v.stock > 0 ? "" : ", изчерпан"}`}
                aria-current={v.current ? "page" : undefined}
                className={`tile relative block aspect-square rounded-md ring-offset-2 ring-offset-porcelain transition-shadow duration-200 ${
                  v.current ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-line-strong"
                }`}
              >
                <Image src={v.image} alt="" fill sizes="56px" quality={75} className="object-contain p-1 mix-blend-multiply" />
                {v.stock <= 0 ? <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),rgb(30_25_22/0.45)_50%,transparent_calc(50%+1px))]" /> : null}
              </Link>
            </li>
          ))}
          {!all && variants.length > shown.length ? (
            <li>
              <button
                type="button"
                onClick={() => setAll(true)}
                className="grid aspect-square w-full place-items-center rounded-md border border-dashed border-line-strong text-[0.75rem] font-semibold text-ink-2 transition-colors duration-200 hover:border-ink"
              >
                +{variants.length - shown.length}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
