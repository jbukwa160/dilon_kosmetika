// Shop details shown on the site, in e-mails and on the legal pages.
// Everything in [square brackets] is a placeholder that must be replaced before going live.

export const SITE = {
  name: "Омая",
  nameLatin: "Omaya",
  wordmark: "омая",
  tagline: "козметика и аромати",
  description:
    "Грим, грижа за лицето, парфюми, коса и тяло — хиляди продукти от над хиляда марки. Доставка за 1–3 работни дни и плащане при получаване.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "zdravei@omaya.bg",
  phone: "+359 88 000 0000",
  hours: "понеделник – петък, 9:00 – 18:00",
  company: {
    name: "[Име на фирмата] ЕООД",
    eik: "[ЕИК]",
    vat: "[ДДС номер]",
    address: "[Седалище и адрес на управление]",
    manager: "[Управител]",
  },
};

export const CARRIERS = {
  speedy: "Speedy",
  econt: "Еконт",
  boxnow: "BOX NOW",
  pigeon: "Pigeon Express",
} as const;

export type CarrierId = keyof typeof CARRIERS;

export const SHIPPING = {
  /** Order total (with VAT) from which delivery is free. */
  freeFrom: 49,
  /** `needs: "office"` covers offices and lockers alike (BOX NOW has lockers only). */
  methods: [
    { id: "speedy-office", carrier: "speedy", needs: "office", label: "До офис или автомат на Speedy", detail: "офис или автомат", price: 3.49 },
    { id: "econt-office", carrier: "econt", needs: "office", label: "До офис или Еконтомат на Еконт", detail: "офис или Еконтомат", price: 3.49 },
    { id: "boxnow-locker", carrier: "boxnow", needs: "office", label: "До автомат на BOX NOW", detail: "автомат, 24/7", price: 3.49 },
    { id: "pigeon-office", carrier: "pigeon", needs: "office", label: "До офис или автомат на Pigeon Express", detail: "офис или автомат", price: 3.49 },
    { id: "speedy-address", carrier: "speedy", needs: "address", label: "До адрес със Speedy", detail: "до вратата", price: 4.99 },
    { id: "econt-address", carrier: "econt", needs: "address", label: "До адрес с Еконт", detail: "до вратата", price: 4.99 },
  ],
  /** Working days from order to delivery. */
  days: "1–3",
  /** Days to return an unopened product. */
  returnDays: 14,
} as const;

export type ShippingMethod = (typeof SHIPPING.methods)[number];
export type ShippingMethodId = ShippingMethod["id"];

/** Lowest delivery price to an office and to an address (for texts like "от 3,49 €"). */
export const OFFICE_PRICE = Math.min(...SHIPPING.methods.filter((m) => m.needs === "office").map((m) => m.price));
export const ADDRESS_PRICE = Math.min(...SHIPPING.methods.filter((m) => m.needs === "address").map((m) => m.price));

export function shippingMethod(id: string): ShippingMethod | undefined {
  return SHIPPING.methods.find((m) => m.id === id);
}

export function shippingPrice(methodId: ShippingMethodId, subtotal: number): number {
  if (subtotal >= SHIPPING.freeFrom) return 0;
  return shippingMethod(methodId)?.price ?? SHIPPING.methods[0].price;
}

/**
 * "Перфектни заедно": discount on a product bought together with the products its page pairs with it, by the number
 * of products in the set (2 → 10 %, 3 → 12 %, 4 → 15 %).
 */
export const BUNDLE_DISCOUNT: Record<number, number> = { 2: 0.1, 3: 0.12, 4: 0.15 };
export const bundleDiscount = (count: number): number => BUNDLE_DISCOUNT[Math.min(count, 4)] ?? 0;
export const MAX_BUNDLE_DISCOUNT = Math.max(...Object.values(BUNDLE_DISCOUNT));

export const CART_KEY = "om_cart_v1";
export const CART_BUNDLES_KEY = "om_cart_bundles_v1";
export const FAVORITES_KEY = "om_fav_v1";
export const ORDER_KEY = "om_last_order";
