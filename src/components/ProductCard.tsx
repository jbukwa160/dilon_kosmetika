import Link from "next/link";
import { FavoriteButton, QuickAdd } from "@/components/CardActions";
import { ProductImage } from "@/components/ProductImage";
import { type Card, toCard } from "@/lib/catalog";
import { plural, price } from "@/lib/format";

const SIZES = "(min-width: 90rem) 17vw, (min-width: 64rem) 22vw, (min-width: 48rem) 30vw, 46vw";

export function ProductCard({ card, priority = false, dark = false }: { card: Card; priority?: boolean; dark?: boolean }) {
  const p = card.product;
  const soldOut = p.stock <= 0;
  const isNew = p.tags.includes("novo");
  const range = card.minPrice !== card.maxPrice;
  const many = card.variants > 1;
  const cardProduct = toCard(p);
  return (
    <article className="group relative flex flex-col rounded-lg outline-offset-4 outline-garnet has-[a:focus-visible]:outline-2">
      {/* The tile sits above the card link (so its buttons work) but lets clicks on the picture through to it. */}
      <div className={`tile pointer-events-none relative z-[1] aspect-[4/5] ${soldOut ? "opacity-70" : ""}`}>
        <ProductImage
          src={p.image}
          alt=""
          iw={p.iw}
          ih={p.ih}
          sizes={SIZES}
          priority={priority}
          className="group-hover:scale-[1.045]"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {soldOut ? <span className="badge">Изчерпан</span> : isNew ? <span className="badge badge-garnet">Ново</span> : null}
        </div>
        <FavoriteButton product={cardProduct} className="pointer-events-auto absolute right-2 top-2" />
        {!soldOut && !many ? (
          <QuickAdd
            product={cardProduct}
            className="pointer-events-auto absolute bottom-2.5 right-2.5 transition-[opacity,transform,background-color] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:translate-y-1.5 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          />
        ) : null}
      </div>
      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        {p.brand ? <p className={`eyebrow mb-1 truncate ${dark ? "!text-porcelain/55" : ""}`}>{p.brand}</p> : null}
        <h3 className={`font-sans text-[0.9375rem] font-normal leading-snug tracking-normal ${dark ? "text-porcelain" : "text-ink"}`}>
          <Link
            href={`/produkt/${p.slug}`}
            className="clamp-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {card.title}
          </Link>
        </h3>
        {many ? <p className={`mt-1 text-[0.8125rem] ${dark ? "text-porcelain/60" : "text-ink-3"}`}>{plural(card.variants, card.kind === "size" ? "размер" : "нюанс", card.kind === "size" ? "размера" : "нюанса")}</p> : null}
        <p className={`num mt-auto pt-2 text-[0.9375rem] font-semibold ${dark ? "text-porcelain" : "text-ink"}`}>
          {range ? <span className={`mr-1 text-[0.8125rem] font-normal ${dark ? "text-porcelain/60" : "text-ink-3"}`}>от</span> : null}
          {price(card.minPrice)}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ cards, eager = 0 }: { cards: Card[]; eager?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 2xl:grid-cols-5">
      {cards.map((c, i) => (
        <li key={c.product.sku}>
          <ProductCard card={c} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
