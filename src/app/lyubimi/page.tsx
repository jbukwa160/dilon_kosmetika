import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/listing/Listing";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export const metadata: Metadata = { title: "Любими", robots: { index: false, follow: true } };

export default function FavoritesPage() {
  return (
    <div className="shell pt-6 md:pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Начало" }, { label: "Любими" }]} />
      <h1 className="display mt-6 text-[2.8rem] sm:text-[3.4rem] md:mt-8">Любими</h1>
      <p className="mt-3 max-w-xl text-ink-2">Пазят се в този браузър — без регистрация.</p>
      <div className="mt-10">
        <FavoritesList />
      </div>
    </div>
  );
}
