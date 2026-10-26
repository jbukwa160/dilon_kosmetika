import { Hero } from "@/components/home/Hero";
import { BrandWall, CategoryIndex, type CollectionTile, Collections, PerfumeBand, Ritual, type RitualStep } from "@/components/home/HomeSections";
import { ProductRail } from "@/components/ProductRail";
import { Reveal } from "@/components/Reveal";
import { allBrands, cardKey, countFor, coverFor, featured, navCategories, newest, productCount } from "@/lib/catalog";
import { COLLECTION_BY_ID, type CollectionId, findSub } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

const CLEAN = /lillydrogerie|notinoimg|dm-static/;

export default function Home() {
  const used = new Set<string>();
  /** One striking product: in stock, large clean picture, not used elsewhere on the page. */
  const pick = (opts: Parameters<typeof featured>[1]): Product | undefined => {
    // Prefer a large studio photo from a drugstore supplier; fall back to any good picture. Men's and children's
    // products are not the face of the home page.
    const ok = (c: { product: Product }) => !c.product.tags.includes("za-nego") && !c.product.tags.includes("detsa");
    const card =
      featured(80, { ...opts, minSide: 700, exclude: used, perBrand: 1 }).find((c) => ok(c) && CLEAN.test(c.product.image)) ??
      featured(30, { ...opts, minSide: 500, exclude: used, perBrand: 1 }).find(ok);
    if (card) used.add(cardKey(card.product));
    return card?.product;
  };

  const stills = [
    { sub: "damski", label: "Парфюми", href: "/parfyumi", tone: "#efe4d8" },
    { sub: "chervila", label: "Червила", href: "/grim/chervila", tone: "#f1dcd6" },
    { sub: "serumi", label: "Серуми", href: "/litse/serumi", tone: "#e4e4d6" },
  ]
    .map((s) => ({ ...s, product: pick({ subs: [s.sub] }) }))
    .filter((s): s is typeof s & { product: Product } => Boolean(s.product));

  const categories = navCategories().map((category) => ({ category, cover: coverFor(category.id, undefined, 5) }));

  const BEAUTY = new Set(["grim", "litse", "parfyumi", "kosa", "tyalo", "nokti", "slantse"]);
  const fresh = newest(40)
    .filter((c) => BEAUTY.has(c.product.category) && !c.product.tags.includes("detsa") && !used.has(cardKey(c.product)))
    .slice(0, 12);
  for (const c of fresh) used.add(cardKey(c.product));

  const ritual: RitualStep[] = [
    { n: "01", sub: "pochistvane", title: "Почистване", text: "Мицеларна вода, гел или пяна — сутрин и вечер, преди всичко останало." },
    { n: "02", sub: "tonitsi", title: "Тоник", text: "Връща баланса на кожата и я подготвя да поеме следващите стъпки." },
    { n: "03", sub: "serumi", title: "Серум", text: "Концентрирана грижа за конкретна нужда: хидратация, сияние, бръчки." },
    { n: "04", sub: "kremove", title: "Крем", text: "Задържа влагата и защитава. Сутрин — с SPF, вечер — по-плътен." },
  ].map((s) => ({ n: s.n, title: s.title, text: s.text, href: `/litse/${s.sub}`, product: pick({ subs: [s.sub] }) }));

  const perfumeLinks = ["damski", "mazhki", "uniseks", "nishovi", "parfyumni-komplekti"]
    .map((sub) => ({ href: `/parfyumi/${sub}`, label: findSub("parfyumi", sub)?.name ?? sub, count: countFor(`parfyumi/${sub}`) }))
    .filter((l) => l.count > 0);
  const perfumes = featured(10, { subs: ["damski", "mazhki", "uniseks", "nishovi"], exclude: used, perBrand: 1, minSide: 500 });
  for (const c of perfumes) used.add(cardKey(c.product));

  const tones: Record<string, string> = { "k-beauty": "#f3e2dd", dermokozmetika: "#e6e9e2", naturalna: "#ebe6d6", balgarska: "#f0e1e4" };
  const collections: CollectionTile[] = (["k-beauty", "dermokozmetika", "naturalna", "balgarska"] as CollectionId[])
    .map((id) => {
      const c = COLLECTION_BY_ID.get(id)!;
      return { href: `/kolektsii/${id}`, title: c.title, text: c.intro, count: countFor(`#${id}`), tone: tones[id], product: pick({ tags: [id] }) };
    })
    .filter((c) => c.count > 0);

  const picked = featured(10, { exclude: used, perBrand: 1, minSide: 600, categories: ["grim", "litse", "kosa", "tyalo", "nokti", "slantse"] });
  const brands = allBrands().slice(0, 24);

  return (
    <>
      <Hero stills={stills} products={productCount()} brands={allBrands().length} />
      <div className="space-y-24 md:space-y-28">
        <CategoryIndex items={categories} />
        <Reveal>
          <ProductRail eyebrow="Току-що пристигнаха" title="Ново в Омая" href="/kolektsii/novo" linkLabel="Всички новости" cards={fresh} />
        </Reveal>
        <Ritual steps={ritual} />
        <Reveal>
          <ProductRail eyebrow="Избрано за вас" title="Любими в грима и грижата" href="/grim" linkLabel="Към грима" cards={picked} />
        </Reveal>
        <PerfumeBand links={perfumeLinks} cards={perfumes} />
        <Collections items={collections} />
        <BrandWall brands={brands} />
      </div>
    </>
  );
}
