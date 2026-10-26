import type { MetadataRoute } from "next";
import { INFO_SLUGS } from "@/content/pages";
import { allBrands, allProducts, countFor, navCategories } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { COLLECTIONS } from "@/lib/taxonomy";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (path: string) => `${SITE.url}${path}`;
  const now = new Date();
  return [
    { url: u("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    ...navCategories().flatMap((c) => [
      { url: u(`/${c.id}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      ...c.subs.map((s) => ({ url: u(`/${c.id}/${s.id}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ]),
    ...COLLECTIONS.filter((c) => countFor(`#${c.id}`) > 0).map((c) => ({ url: u(`/kolektsii/${c.id}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    { url: u("/marki"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...allBrands().map((b) => ({ url: u(`/marki/${b.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...INFO_SLUGS.map((s) => ({ url: u(`/info/${s}`), changeFrequency: "yearly" as const, priority: 0.3 })),
    ...allProducts().map((p) => ({ url: u(`/produkt/${p.slug}`), changeFrequency: "weekly" as const, priority: p.stock > 0 ? 0.6 : 0.3 })),
  ];
}
