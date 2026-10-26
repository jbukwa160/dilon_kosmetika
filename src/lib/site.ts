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

export const SHIPPING = {
  /** Order total (with VAT) from which delivery is free. */
  freeFrom: 49,
  methods: [
    { id: "speedy-office", label: "До офис или автомат на Speedy", short: "Офис Speedy", price: 3.49, needs: "office" },
    { id: "econt-office", label: "До офис или автомат на Еконт", short: "Офис Еконт", price: 3.49, needs: "office" },
    { id: "address", label: "До адрес с куриер", short: "До адрес", price: 4.99, needs: "address" },
  ],
  /** Working days from order to delivery. */
  days: "1–3",
  /** Days to return an unopened product. */
  returnDays: 14,
} as const;

export type ShippingMethodId = (typeof SHIPPING.methods)[number]["id"];

export function shippingPrice(methodId: ShippingMethodId, subtotal: number): number {
  if (subtotal >= SHIPPING.freeFrom) return 0;
  return SHIPPING.methods.find((m) => m.id === methodId)?.price ?? SHIPPING.methods[0].price;
}

export const CART_KEY = "om_cart_v1";
export const FAVORITES_KEY = "om_fav_v1";
export const ORDER_KEY = "om_last_order";
