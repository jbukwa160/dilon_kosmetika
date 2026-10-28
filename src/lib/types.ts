import type { CollectionId } from "./taxonomy";

export type Gender = "w" | "m" | "u" | "k";
export type Concentration = "parfum" | "edp" | "edt" | "edc" | "oil" | "mist";

/** Facts read from the product name. Everything is optional. */
export type Facts = {
  /** Volume in ml. */
  ml?: number;
  /** Weight in g. */
  g?: number;
  /** Pieces in the pack. */
  pcs?: number;
  spf?: number;
  /** Who the product is for (perfumes and men's / kids' products). */
  gender?: Gender;
  /** Perfume concentration. */
  conc?: Concentration;
  /** Shade, colour or size code, e.g. "05 Mocha Nude". */
  shade?: string;
};

/** One product of the generated catalog (data/catalog.json). */
export type Product = {
  /** SKU from the company export. */
  sku: string;
  slug: string;
  /** Name without the brand ("SuperStay Matte Ink течно червило 20 Pioneer"). */
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  sub: string;
  tags: CollectionId[];
  /** Price in euro, VAT included. */
  price: number;
  /** True when the price comes from data/prices.csv, false when the import estimated it. */
  priceConfirmed: boolean;
  /** Units that can be sold right now (inventory minus reserved). */
  stock: number;
  image: string;
  /** Picture size in px (from the import's picture check), so small pictures are never blown up. */
  iw: number;
  ih: number;
  ean: string;
  facts: Facts;
  /** Shades and sizes of one product share a family id. */
  family?: string;
  /** What tells this product apart inside its family ("05 Mocha Nude", "100 мл"). */
  variant?: string;
  created: string;
  /** Higher comes first in the default ("Recommended") order. */
  rank: number;
};

export type Brand = { slug: string; name: string; count: number };

/** A product's own description (data/details.json, written by `npm run enrich` and `npm run import`). */
export type ProductCopy = {
  /** One or two sentences that make the product clear. */
  lead: string;
  /** Short paragraphs. */
  body: string[];
  /** Short concrete points, no full stops. */
  highlights: string[];
  /** How to use it, when the source says; otherwise "". */
  usage: string;
};

/** "moiata": rewritten from moiatakozmetika.com; "name": written from the name, brand and category only. */
export type CopyBasis = "moiata" | "name";
/** What the product page shows beyond the catalog: our description and, for products matched by barcode, the ingredients. */
/** One more picture of a product (data/details.json). `direct`: shown as is, not through Next.js's optimiser. */
export type GalleryPicture = { src: string; w: number; h: number; direct?: true };

export type ProductDetails = { copy?: ProductCopy & { basis: CopyBasis }; ingredients?: string; gallery?: GalleryPicture[] };

/** The part of a product that client components (cart, search suggestions) need. */
export type CardProduct = Pick<Product, "sku" | "slug" | "name" | "brand" | "price" | "image" | "stock"> & { variant?: string };
