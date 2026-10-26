import type { Metadata } from "next";
import { activeFilterCount, type Filters } from "./filters";

/** Filtered, sorted or paged views are not separate pages for search engines: they point to the plain listing. */
export function listingMeta(path: string, title: string, description: string, f?: Filters): Metadata {
  const variant = f ? activeFilterCount(f) > 0 || f.page > 1 || Boolean(f.sort) : false;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: variant ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: path },
  };
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
