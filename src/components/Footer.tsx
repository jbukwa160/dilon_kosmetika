import Link from "next/link";
import { navCategories } from "@/lib/catalog";
import { priceShort } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/site";
import { COLLECTIONS } from "@/lib/taxonomy";
import { IconCash, IconMail, IconPhone, IconReturn, IconTruck } from "./Icons";
import { Wordmark } from "./Wordmark";

const HELP = [
  { href: "/info/dostavka", label: "Доставка и плащане" },
  { href: "/info/vrashtane", label: "Връщане и замяна" },
  { href: "/info/kak-da-porucham", label: "Как да поръчам" },
  { href: "/info/kontakti", label: "Контакти" },
];
const COMPANY = [
  { href: "/info/za-nas", label: "За нас" },
  { href: "/info/obshti-usloviya", label: "Общи условия" },
  { href: "/info/poveritelnost", label: "Поверителност" },
  { href: "/info/biskvitki", label: "Бисквитки и съхранение" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-night text-porcelain">
      <div className="border-b border-white/10">
        <ul className="shell grid grid-cols-1 gap-6 py-8 text-[0.875rem] sm:grid-cols-3">
          <li className="flex items-center gap-3">
            <IconTruck size={22} className="text-[#d9a5ab]" />
            <span>
              Доставка за {SHIPPING.days} работни дни, безплатна над {priceShort(SHIPPING.freeFrom)}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <IconCash size={22} className="text-[#d9a5ab]" />
            <span>Плащане при получаване — наложен платеж</span>
          </li>
          <li className="flex items-center gap-3">
            <IconReturn size={22} className="text-[#d9a5ab]" />
            <span>{SHIPPING.returnDays} дни за връщане на неотворени продукти</span>
          </li>
        </ul>
      </div>
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" aria-label="Омая — начало" className="inline-block">
            <Wordmark className="text-[3.25rem] text-porcelain" />
          </Link>
          <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-porcelain/70">
            {SITE.tagline.charAt(0).toUpperCase() + SITE.tagline.slice(1)} — грим, грижа и парфюми от над хиляда марки, подредени така, че да
            намерите своите бързо.
          </p>
          <div className="mt-6 space-y-2 text-[0.9375rem]">
            <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="link flex w-fit items-center gap-2.5 text-porcelain/85 hover:text-porcelain">
              <IconPhone size={18} /> {SITE.phone}
            </a>
            <a href={`mailto:${SITE.email}`} className="link flex w-fit items-center gap-2.5 text-porcelain/85 hover:text-porcelain">
              <IconMail size={18} /> {SITE.email}
            </a>
            <p className="pl-7 text-[0.8125rem] text-porcelain/55">{SITE.hours}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          <FooterColumn title="Пазарувай" links={navCategories().map((c) => ({ href: `/${c.id}`, label: c.name }))} />
          <FooterColumn
            title="Колекции"
            links={[{ href: "/marki", label: "Всички марки" }, ...COLLECTIONS.map((c) => ({ href: `/kolektsii/${c.id}`, label: c.title }))]}
          />
          <FooterColumn title="Помощ" links={HELP} />
          <FooterColumn title="Омая" links={COMPANY} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="shell flex flex-col gap-2 py-6 text-[0.75rem] text-porcelain/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {SITE.company.name} · ЕИК {SITE.company.eik} · {SITE.company.address}
          </p>
          <p>Цените са в евро с включен ДДС.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-porcelain/50">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="link text-[0.875rem] text-porcelain/80 hover:text-porcelain">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
