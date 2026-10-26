import Link from "next/link";
import type { Card } from "@/lib/catalog";
import { IconArrowRight } from "./Icons";
import { ProductCard } from "./ProductCard";
import { RailScroller } from "./RailScroller";

/** Section heading with an optional "see all" link, then a rail of product cards. */
export function ProductRail({ title, eyebrow, href, linkLabel = "Виж всички", cards }: { title: string; eyebrow?: string; href?: string; linkLabel?: string; cards: Card[] }) {
  if (!cards.length) return null;
  return (
    <section className="shell">
      <div className="mb-6 flex items-end justify-between gap-6 pr-0 md:pr-28">
        <div>
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h2 className="text-[2rem] md:text-[2.5rem]">{title}</h2>
        </div>
        {href ? (
          <Link href={href} className="link mb-1 hidden shrink-0 items-center gap-2 text-[0.875rem] font-semibold sm:flex">
            {linkLabel} <IconArrowRight size={16} />
          </Link>
        ) : null}
      </div>
      <RailScroller label={title}>
        {cards.map((c) => (
          <li key={c.product.sku}>
            <ProductCard card={c} />
          </li>
        ))}
      </RailScroller>
      {href ? (
        <Link href={href} className="link mt-6 inline-flex items-center gap-2 text-[0.875rem] font-semibold sm:hidden">
          {linkLabel} <IconArrowRight size={16} />
        </Link>
      ) : null}
    </section>
  );
}
