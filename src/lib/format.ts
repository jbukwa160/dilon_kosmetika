const money = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat("bg-BG");

/** "34,90 €" — amount and sign kept on one line. */
export function price(value: number): string {
  return money.format(value).replace(/\s/g, " ");
}

/** Whole amounts without decimals ("49 €"), for thresholds in running text. */
export function priceShort(value: number): string {
  return (Number.isInteger(value) ? whole.format(value) : money.format(value)).replace(/\s/g, " ");
}

/** "29 563" */
export function count(value: number): string {
  return plain.format(value).replace(/\s/g, " ");
}

/** Bulgarian plural: plural(3, "продукт", "продукта") → "3 продукта". */
export function plural(n: number, one: string, many: string): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

/** "50 мл", "4,8 г", "1,5 л" */
export function amount(facts: { ml?: number; g?: number }): string | null {
  const num = (v: number) => new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 2 }).format(v);
  if (facts.ml) return facts.ml >= 1000 && facts.ml % 100 === 0 ? `${num(facts.ml / 1000)} л` : `${num(facts.ml)} мл`;
  if (facts.g) return facts.g >= 1000 && facts.g % 100 === 0 ? `${num(facts.g / 1000)} кг` : `${num(facts.g)} г`;
  return null;
}
