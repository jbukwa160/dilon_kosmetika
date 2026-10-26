import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";
import { ProductImage } from "@/components/ProductImage";
import type { Product } from "@/lib/types";
import { count } from "@/lib/format";

type Still = { product: Product; label: string; href: string; tone: string };

/**
 * Typographic hero with a still life of three real products from the catalog. On first load the words rise in
 * and the tiles unveil from the bottom, in a short stagger; with reduced motion they simply fade.
 */
export function Hero({ stills, products, brands }: { stills: Still[]; products: number; brands: number }) {
  return (
    <section className="shell grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
      <div>
        <p className="eyebrow anim-rise" style={{ animationDelay: "60ms" }}>
          Грим · Грижа · Парфюми
        </p>
        <h1 className="display mt-5 text-[3.4rem] leading-[0.95] sm:text-[4.6rem] lg:text-[5.4rem] xl:text-[6.2rem]">
          <span className="block anim-rise" style={{ animationDelay: "120ms" }}>
            Красотата
          </span>
          <span className="block anim-rise" style={{ animationDelay: "200ms" }}>
            е в <em className="text-garnet">нюанса</em>.
          </span>
        </h1>
        <p className="mt-7 max-w-[33rem] text-[1.0625rem] leading-relaxed text-ink-2 anim-rise" style={{ animationDelay: "300ms" }}>
          {count(products)} продукта от {count(brands)} марки — от всекидневния балсам до парфюма за специален повод. Доставка до
          вратата за 1–3 работни дни и плащане при получаване.
        </p>
        <div className="mt-9 flex flex-wrap gap-3 anim-rise" style={{ animationDelay: "380ms" }}>
          <Link href="/kolektsii/novo" className="btn btn-ink">
            Разгледайте новото
          </Link>
          <Link href="/parfyumi" className="btn btn-line">
            Парфюми <IconArrowRight size={18} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr] grid-rows-[1fr_1fr] gap-3 sm:gap-4" style={{ aspectRatio: "1 / 1.02" }}>
        {stills.map((s, i) => (
          <Link
            key={s.product.sku}
            href={s.href}
            className={`group tile relative anim-unveil ${i === 0 ? "row-span-2" : ""}`}
            style={{ animationDelay: `${180 + i * 130}ms`, background: s.tone }}
          >
            <ProductImage
              src={s.product.image}
              alt=""
              iw={s.product.iw}
              ih={s.product.ih}
              sizes="(min-width: 64rem) 26vw, 50vw"
              priority
              inset={i === 0 ? 12 : 14}
              className="group-hover:scale-[1.04]"
            />
            <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
              <span>
                <span className="num block text-[0.6875rem] font-semibold tracking-[0.16em] text-ink-3">0{i + 1}</span>
                <span className="block font-display text-[1.3rem] leading-tight sm:text-[1.5rem]">{s.label}</span>
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-cream/80 transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                <IconArrowRight size={16} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
