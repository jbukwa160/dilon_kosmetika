import Link from "next/link";
import { coverFor, navCategories } from "@/lib/catalog";
import { priceShort } from "@/lib/format";
import { SHIPPING } from "@/lib/site";
import { Wordmark } from "../Wordmark";
import { Announcements } from "./Announcements";
import { HeaderActions } from "./HeaderActions";
import { MegaNav, type MenuCategory } from "./MegaNav";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

export function Header() {
  const menu: MenuCategory[] = navCategories().map((c) => {
    const cover = coverFor(c.id);
    return {
      id: c.id,
      name: c.name,
      count: c.count,
      subs: c.subs.map((s) => ({ id: s.id, name: s.name, group: s.group ?? "", count: s.count })),
      cover: cover ? { src: cover.image, iw: cover.iw, ih: cover.ih, alt: "" } : null,
    };
  });
  const messages = [
    `Безплатна доставка над ${priceShort(SHIPPING.freeFrom)}`,
    "Плащане при получаване",
    `${SHIPPING.returnDays} дни за връщане`,
  ];
  return (
    <>
      <Announcements messages={messages} />
      <header className="sticky top-0 z-50 border-b border-line bg-porcelain/92 backdrop-blur-md supports-[backdrop-filter]:bg-porcelain/85">
        <div className="shell flex h-16 items-center gap-2 lg:h-[4.75rem] lg:gap-8">
          <MobileMenu categories={menu} />
          <Link href="/" className="mr-auto shrink-0 rounded-sm lg:mr-0" aria-label="Омая — начало">
            <Wordmark className="text-[2rem] lg:text-[2.35rem]" />
          </Link>
          <div className="hidden flex-1 lg:block">
            <SearchBox />
          </div>
          <HeaderActions />
        </div>
        <div className="shell pb-3 lg:hidden">
          <SearchBox compact />
        </div>
        <MegaNav categories={menu} />
      </header>
    </>
  );
}
