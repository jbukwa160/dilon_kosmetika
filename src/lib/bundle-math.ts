// Bundle discounts ("Перфектни заедно"), computed the same way in the browser (cart, checkout) and on the server (order).

/** A set the visitor took from a product page: the product first, then its extras, and the discount (0.1 = 10 %). */
export type BundleClaim = { skus: string[]; discount: number };
export type AppliedBundle = BundleClaim & { sets: number; amount: number };

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Applies every set whose products are all in the cart, as many times as complete sets fit. Bigger sets go first, and
 * each unit counts in one set only.
 */
export function applyBundles(lines: { sku: string; qty: number; price: number }[], claims: BundleClaim[]) {
  const left = new Map<string, number>();
  const prices = new Map<string, number>();
  for (const l of lines) {
    left.set(l.sku, (left.get(l.sku) ?? 0) + l.qty);
    prices.set(l.sku, l.price);
  }
  const applied: AppliedBundle[] = [];
  const ordered = [...claims].sort((a, b) => b.skus.length - a.skus.length || b.discount - a.discount);
  for (const claim of ordered) {
    if (new Set(claim.skus).size !== claim.skus.length) continue;
    const sets = Math.min(...claim.skus.map((sku) => left.get(sku) ?? 0));
    if (!(sets > 0)) continue;
    for (const sku of claim.skus) left.set(sku, left.get(sku)! - sets);
    const amount = round(claim.skus.reduce((s, sku) => s + prices.get(sku)!, 0) * claim.discount * sets);
    applied.push({ ...claim, sets, amount });
  }
  return { applied, discount: round(applied.reduce((s, a) => s + a.amount, 0)) };
}
