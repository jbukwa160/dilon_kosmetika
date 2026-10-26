// Listing filters shared by the server (catalog queries) and the browser (filter panel).

export const SORTS = [
  { id: "", label: "Препоръчани" },
  { id: "new", label: "Най-нови" },
  { id: "price-asc", label: "Цена: ниска към висока" },
  { id: "price-desc", label: "Цена: висока към ниска" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export const PRICE_BANDS = [
  { id: "do-10", label: "до 10 €", min: 0, max: 10 },
  { id: "10-25", label: "10 – 25 €", min: 10, max: 25 },
  { id: "25-50", label: "25 – 50 €", min: 25, max: 50 },
  { id: "50-100", label: "50 – 100 €", min: 50, max: 100 },
  { id: "nad-100", label: "над 100 €", min: 100, max: Infinity },
] as const;

export const GENDERS = [
  { id: "w", label: "Дамски" },
  { id: "m", label: "Мъжки" },
  { id: "u", label: "Унисекс" },
] as const;

export const CONCENTRATIONS = [
  { id: "parfum", label: "Парфюм / екстракт" },
  { id: "edp", label: "Парфюмна вода" },
  { id: "edt", label: "Тоалетна вода" },
  { id: "edc", label: "Одеколон" },
  { id: "oil", label: "Парфюмно масло" },
  { id: "mist", label: "Мист за тяло" },
] as const;

export type Filters = {
  brands: string[];
  price: string;
  stock: boolean;
  sort: SortId;
  page: number;
  /** Narrows listings that span several categories (collections, brands, search). */
  cat: string;
  /** Perfume filters. */
  gender: string[];
  conc: string[];
};

export const NO_FILTERS: Filters = { brands: [], price: "", stock: false, sort: "", page: 1, cat: "", gender: [], conc: [] };

export type FacetValue = { id: string; label: string; count: number };

export type Facets = {
  brands: FacetValue[];
  prices: FacetValue[];
  categories: FacetValue[];
  genders: FacetValue[];
  concentrations: FacetValue[];
  inStock: number;
};

/** Listing URL that keeps the current filters and applies `change`. Any change except paging goes back to page 1. */
export function listingHref(basePath: string, f: Filters, change: Partial<Filters>, q?: string): string {
  const next: Filters = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (next.cat) sp.set("cat", next.cat);
  if (next.brands.length) sp.set("brand", next.brands.join(","));
  if (next.price) sp.set("price", next.price);
  if (next.gender.length) sp.set("pol", next.gender.join(","));
  if (next.conc.length) sp.set("vid", next.conc.join(","));
  if (next.stock) sp.set("nalichni", "1");
  if (next.sort) sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function activeFilterCount(f: Filters): number {
  return f.brands.length + (f.price ? 1 : 0) + (f.stock ? 1 : 0) + (f.cat ? 1 : 0) + f.gender.length + f.conc.length;
}

/** Adds or removes a value of a multi-select filter. */
export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
