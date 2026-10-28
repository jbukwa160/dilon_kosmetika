import "server-only";
import { allProducts, cardKey, getBySku, toCard } from "./catalog";
import type { CardProduct, Product } from "./types";

// "Върви добре с": up to three products that complete the one on the page — conditioner and mask for a shampoo, primer
// and powder for a foundation, the shower gel of the same scent for a perfume. Each kind of product names what goes
// with it; the pick prefers the same brand and the same product line, the same audience (children, men) and products
// in stock with a usable picture.

/** A product kind that goes with another, with a few words on why. */
type Need = {
  /** "category/sub" */
  sub: string;
  why: string;
  /** Only products whose name matches ("Двуфазен демакиант" for a mascara). */
  only?: RegExp;
  /** Only the same brand and product line (scented body care for a perfume). */
  sameLine?: boolean;
  /** Only for products whose name matches (foot care for a foot cream, hand care for a hand cream). */
  when?: RegExp;
};

const n = (sub: string, why: string, extra: Omit<Need, "sub" | "why"> = {}): Need => ({ sub, why, ...extra });

// "почистваща" contains "оч" too, so the eye words are whole words.
const EYE_REMOVER = /за очи|\bочи\b|околоочн|\beye|двуфаз|демакиант|make-?up remover|мицелар/i;
const PRIMER = /основа|база|праймър|primer|\bbase\b/i;
const SETTING = /фиксир|setting|fixing|\bfix\b|спрей/i;
const BATH_TOOL = /гъба|люфа|ръкавиц|кесе|четка за тяло|четка за баня|sponge|loofah|конджак/i;
const COLOUR_CARE = /боядисан|цвят|color|colour|оцвет|руса|blond|silver|сребр|виолет|purple/i;
const HEAT_PROTECT = /термо|топлин|heat|температур/i;
const HAND = /ръце|hand/i;
const FOOT = /крак|пет[аи]\b|ходил|\bfoot|\bfeet|heel/i;
const FLOSS = /конец|конци|floss|интердентал|interdental|клечк/i;
const WIPES = /мокри|влажни|wet|wipes|кърпички/i;
const REMOVER_PADS = /тампон|дискове|pads/i;

const PAIRS: Record<string, Need[]> = {
  // Make-up
  "grim/fon-dyo-ten": [n("grim/osnovi-i-fiksatori", "Основа отдолу — фон дьо тенът стои по-дълго", { only: PRIMER }), n("grim/pudri", "Пудра отгоре за матов, траен завършек"), n("aksesoari/gabi-i-aplikatori", "За равномерно нанасяне")],
  "grim/bb-i-cc-kremove": [n("grim/pudri", "Пудра за матов завършек"), n("grim/korektori", "Коректор за тъмните кръгове"), n("aksesoari/gabi-i-aplikatori", "За леко нанасяне")],
  "grim/korektori": [n("grim/fon-dyo-ten", "Фон дьо тен за цялото лице"), n("grim/pudri", "Пудра, която фиксира коректора"), n("aksesoari/gabi-i-aplikatori", "За растушевка без следи")],
  "grim/pudri": [n("grim/fon-dyo-ten", "Фон дьо тен под пудрата"), n("aksesoari/chetki-za-grim", "Четка за пудра"), n("grim/osnovi-i-fiksatori", "Фиксатор за целодневен грим", { only: SETTING })],
  "grim/ruzh": [n("grim/bronzanti-i-kontur", "Бронзант за скулите"), n("grim/haylaytari", "Хайлайтър за сияние"), n("aksesoari/chetki-za-grim", "Четка за руж")],
  "grim/bronzanti-i-kontur": [n("grim/haylaytari", "Хайлайтър за контраст"), n("grim/ruzh", "Руж за свеж цвят"), n("aksesoari/chetki-za-grim", "Четка за контуриране")],
  "grim/haylaytari": [n("grim/bronzanti-i-kontur", "Бронзант за изваяни скули"), n("grim/ruzh", "Руж за свеж цвят"), n("grim/osnovi-i-fiksatori", "Фиксатор за траен блясък", { only: SETTING })],
  "grim/osnovi-i-fiksatori": [n("grim/fon-dyo-ten", "Фон дьо тен върху основата"), n("grim/pudri", "Пудра за матов завършек")],
  "grim/spirali": [n("grim/ochni-linii", "Очна линия за изразителен поглед"), n("grim/molivi-za-ochi", "Молив за очи"), n("litse/pochistvane", "Демакиант за очи вечерта", { only: EYE_REMOVER })],
  "grim/ochni-linii": [n("grim/spirali", "Спирала за пълен грим на очите"), n("grim/senki-za-ochi", "Сенки за очи"), n("litse/pochistvane", "Демакиант за очи вечерта", { only: EYE_REMOVER })],
  "grim/molivi-za-ochi": [n("grim/spirali", "Спирала за пълен грим на очите"), n("grim/senki-za-ochi", "Сенки за опушен ефект"), n("aksesoari/instrumenti", "Острилка за молива", { only: /острил|sharpener/i })],
  "grim/senki-za-ochi": [n("grim/spirali", "Спирала за завършен поглед"), n("grim/ochni-linii", "Очна линия"), n("aksesoari/chetki-za-grim", "Четка за сенки", { only: /сенки|eye|shadow|растуш|blend/i })],
  "grim/vezhdi": [n("grim/spirali", "Спирала за мигли"), n("aksesoari/instrumenti", "Пинсета за оформяне", { only: /пинсет|tweezer/i })],
  "grim/migli": [n("grim/spirali", "Спирала за естествените мигли"), n("grim/ochni-linii", "Очна линия, която скрива основата")],
  "grim/chervila": [n("grim/molivi-za-ustni", "Молив за ясен контур"), n("grim/balsami-za-ustni", "Балсам за мека основа"), n("grim/glantsove", "Гланц за блясък отгоре")],
  "grim/glantsove": [n("grim/molivi-za-ustni", "Молив за ясен контур"), n("grim/chervila", "Червило под гланца")],
  "grim/molivi-za-ustni": [n("grim/chervila", "Червило в тон"), n("grim/glantsove", "Гланц за блясък")],
  "grim/balsami-za-ustni": [n("grim/chervila", "Червило върху подхранените устни"), n("grim/glantsove", "Гланц за блясък")],
  "grim/komplekti-grim": [n("litse/pochistvane", "Демакиант за вечерта"), n("aksesoari/chetki-za-grim", "Четки за нанасяне")],
  // Face
  "litse/pochistvane": [n("litse/tonitsi", "Тоник след почистването"), n("litse/serumi", "Серум за целенасочена грижа"), n("litse/kremove", "Крем за хидратация")],
  "litse/tonitsi": [n("litse/serumi", "Серум след тоника"), n("litse/kremove", "Крем за хидратация"), n("higiena/pamuchni", "Памучни тампони за нанасяне", { only: REMOVER_PADS })],
  "litse/serumi": [n("litse/kremove", "Крем, който задържа серума"), n("litse/okoloochen-kontur", "Грижа за околоочния контур"), n("slantse/za-litse", "Слънцезащита сутрин")],
  "litse/kremove": [n("litse/serumi", "Серум под крема"), n("litse/okoloochen-kontur", "Околоочен крем"), n("litse/pochistvane", "Почистване преди крема")],
  "litse/okoloochen-kontur": [n("litse/serumi", "Серум за лицето"), n("litse/kremove", "Крем за лице")],
  "litse/maski": [n("litse/pochistvane", "Почистване преди маската"), n("litse/serumi", "Серум след маската"), n("litse/kremove", "Крем за завършек")],
  "litse/eksfolianti": [n("litse/maski", "Маска след ексфолирането"), n("litse/kremove", "Успокояващ крем"), n("slantse/za-litse", "Слънцезащита след киселини")],
  "litse/masla-za-litse": [n("litse/pochistvane", "Почистване вечерта"), n("litse/kremove", "Крем за лице")],
  "litse/termalni-vodi": [n("litse/kremove", "Крем след термалната вода"), n("litse/serumi", "Серум")],
  "litse/komplekti-litse": [n("litse/pochistvane", "Почистване"), n("slantse/za-litse", "Слънцезащита за лице")],
  // Perfume: the same scent in body care
  "parfyumi/damski": [n("tyalo/losioni", "Лосион със същия аромат", { sameLine: true }), n("tyalo/dush-gelove", "Душ гел със същия аромат", { sameLine: true }), n("tyalo/dezodoranti", "Дезодорант със същия аромат", { sameLine: true })],
  "parfyumi/mazhki": [n("tyalo/dezodoranti", "Дезодорант със същия аромат", { sameLine: true }), n("tyalo/dush-gelove", "Душ гел със същия аромат", { sameLine: true }), n("mazhe/aftarsheyv", "Афтършейв от същата линия", { sameLine: true })],
  "parfyumi/uniseks": [n("tyalo/dush-gelove", "Душ гел със същия аромат", { sameLine: true }), n("tyalo/losioni", "Лосион със същия аромат", { sameLine: true })],
  "parfyumi/nishovi": [n("tyalo/dush-gelove", "Душ гел със същия аромат", { sameLine: true }), n("tyalo/losioni", "Лосион със същия аромат", { sameLine: true })],
  "parfyumi/mistove": [n("tyalo/losioni", "Лосион със същия аромат", { sameLine: true }), n("tyalo/dush-gelove", "Душ гел със същия аромат", { sameLine: true })],
  // Hair
  "kosa/shampoani": [n("kosa/balsami", "Балсам след шампоана"), n("kosa/maski-za-kosa", "Маска веднъж седмично"), n("kosa/bez-otmivane", "Грижа без отмиване")],
  "kosa/balsami": [n("kosa/shampoani", "Шампоан от същата грижа"), n("kosa/maski-za-kosa", "Маска за по-дълбока грижа")],
  "kosa/maski-za-kosa": [n("kosa/shampoani", "Шампоан преди маската"), n("kosa/balsami", "Балсам за всеки ден"), n("kosa/serumi-i-olia", "Олио за краищата")],
  "kosa/bez-otmivane": [n("kosa/shampoani", "Шампоан"), n("kosa/serumi-i-olia", "Олио за краищата"), n("aksesoari/chetki-za-kosa", "Четка за разресване")],
  "kosa/serumi-i-olia": [n("kosa/shampoani", "Шампоан"), n("kosa/maski-za-kosa", "Маска за дълбока грижа"), n("kosa/bez-otmivane", "Термозащита преди сешоара", { only: HEAT_PROTECT })],
  "kosa/skalp": [n("kosa/shampoani", "Шампоан от същата грижа"), n("kosa/balsami", "Лек балсам")],
  "kosa/stilizirane": [n("kosa/bez-otmivane", "Термозащита преди оформянето", { only: HEAT_PROTECT }), n("aksesoari/chetki-za-kosa", "Четка за оформяне")],
  "kosa/uredi-za-kosa": [n("kosa/bez-otmivane", "Термозащита преди уреда", { only: HEAT_PROTECT }), n("aksesoari/chetki-za-kosa", "Четка за оформяне"), n("kosa/stilizirane", "Продукт за оформяне")],
  "kosa/boya-za-kosa": [n("kosa/shampoani", "Шампоан за боядисана коса", { only: COLOUR_CARE }), n("kosa/balsami", "Балсам за боядисана коса", { only: COLOUR_CARE }), n("kosa/maski-za-kosa", "Маска за боядисана коса", { only: COLOUR_CARE })],
  "kosa/komplekti-kosa": [n("aksesoari/chetki-za-kosa", "Четка за коса"), n("kosa/bez-otmivane", "Грижа без отмиване")],
  // Body
  "tyalo/dush-gelove": [n("tyalo/losioni", "Лосион след душа"), n("tyalo/skrabove", "Скраб веднъж седмично"), n("aksesoari/za-banya", "Гъба за баня", { only: BATH_TOOL })],
  "tyalo/sapuni": [n("tyalo/ratse-i-kraka", "Крем за ръце след измиване", { only: HAND }), n("tyalo/losioni", "Лосион за тяло")],
  "tyalo/skrabove": [n("tyalo/losioni", "Лосион след скраба"), n("tyalo/masla-za-tyalo", "Масло за тяло"), n("tyalo/dush-gelove", "Душ гел")],
  "tyalo/vana": [n("tyalo/losioni", "Лосион след ваната"), n("tyalo/masla-za-tyalo", "Масло за тяло"), n("aksesoari/za-banya", "Гъба за баня", { only: BATH_TOOL })],
  "tyalo/losioni": [n("tyalo/dush-gelove", "Душ гел"), n("tyalo/skrabove", "Скраб за гладка кожа"), n("tyalo/ratse-i-kraka", "Крем за ръце", { only: HAND })],
  "tyalo/masla-za-tyalo": [n("tyalo/skrabove", "Скраб преди маслото"), n("tyalo/dush-gelove", "Душ гел")],
  "tyalo/eterichni-masla": [n("tyalo/masla-za-tyalo", "Базово масло за разреждане"), n("tyalo/vana", "Соли за вана")],
  "tyalo/ratse-i-kraka": [
    n("nokti/grizha-za-nokti", "Грижа за ноктите и кожичките", { when: HAND }),
    n("tyalo/sapuni", "Сапун за ръце", { when: HAND, only: HAND }),
    n("nokti/manikyur", "Пемза или пила за пети", { when: FOOT, only: /пемз|пила за пет|ренде|pumice/i }),
    n("tyalo/skrabove", "Скраб за стъпала", { when: FOOT, only: FOOT }),
  ],
  "tyalo/dezodoranti": [n("tyalo/dush-gelove", "Душ гел от същата линия", { sameLine: true })],
  "tyalo/epilatsia": [n("tyalo/losioni", "Успокояващ лосион след епилация"), n("tyalo/skrabove", "Скраб срещу врастнали косми")],
  "tyalo/komplekti-tyalo": [n("aksesoari/za-banya", "Гъба за баня", { only: BATH_TOOL }), n("tyalo/losioni", "Лосион за тяло")],
  // Nails
  "nokti/lakove": [n("nokti/osnovi-i-top", "База и топ за по-траен лак"), n("nokti/lakochistiteli", "Лакочистител"), n("nokti/grizha-za-nokti", "Олио за кожичките")],
  "nokti/gel-lakove": [n("nokti/osnovi-i-top", "База и топ за гел лака"), n("nokti/lakochistiteli", "Средство за премахване")],
  "nokti/osnovi-i-top": [n("nokti/lakove", "Лак за нокти"), n("nokti/lakochistiteli", "Лакочистител")],
  "nokti/grizha-za-nokti": [n("tyalo/ratse-i-kraka", "Крем за ръце", { only: HAND }), n("nokti/manikyur", "Инструмент за маникюр")],
  "nokti/lakochistiteli": [n("nokti/lakove", "Лак за нокти"), n("higiena/pamuchni", "Памучни тампони", { only: REMOVER_PADS })],
  "nokti/manikyur": [n("nokti/grizha-za-nokti", "Грижа за кожичките"), n("nokti/lakove", "Лак за нокти")],
  // Sun
  "slantse/za-litse": [n("slantse/za-tyalo", "Слънцезащита за тяло"), n("slantse/sled-slantse", "Грижа след слънце")],
  "slantse/za-tyalo": [n("slantse/za-litse", "Слънцезащита за лице"), n("slantse/sled-slantse", "Грижа след слънце")],
  "slantse/detska": [n("slantse/sled-slantse", "Грижа след слънце")],
  "slantse/sled-slantse": [n("slantse/za-tyalo", "Слънцезащита за тяло"), n("slantse/za-litse", "Слънцезащита за лице")],
  "slantse/avtobronzanti": [n("tyalo/skrabove", "Скраб преди нанасянето"), n("aksesoari/gabi-i-aplikatori", "Ръкавица за равномерен тен", { only: /ръкавиц|mitt|апликатор/i })],
  // Men
  "mazhe/brasnene": [n("mazhe/aftarsheyv", "Афтършейв след бръсненето")],
  "mazhe/aftarsheyv": [n("mazhe/brasnene", "Пяна или гел за бръснене", { only: /пяна|гел|крем|foam|gel|сапун/i })],
  "mazhe/brada": [n("mazhe/brasnene", "Тример или самобръсначка"), n("mazhe/aftarsheyv", "Афтършейв")],
  "mazhe/grizha-za-mazhe": [n("mazhe/brasnene", "Пяна или гел за бръснене", { only: /пяна|гел|крем|foam|gel/i }), n("mazhe/aftarsheyv", "Афтършейв")],
  // Hygiene
  "higiena/pasti-za-zabi": [n("higiena/chetki-za-zabi", "Четка за зъби"), n("higiena/vodi-za-usta", "Вода за уста"), n("higiena/interdentalni", "Конец за зъби", { only: FLOSS })],
  "higiena/chetki-za-zabi": [n("higiena/pasti-za-zabi", "Паста за зъби"), n("higiena/interdentalni", "Конец или интердентални четки", { only: FLOSS })],
  "higiena/elektricheski-chetki": [n("higiena/pasti-za-zabi", "Паста за зъби"), n("higiena/vodi-za-usta", "Вода за уста")],
  "higiena/vodi-za-usta": [n("higiena/pasti-za-zabi", "Паста за зъби"), n("higiena/interdentalni", "Конец за зъби", { only: FLOSS })],
  "higiena/interdentalni": [n("higiena/pasti-za-zabi", "Паста за зъби"), n("higiena/vodi-za-usta", "Вода за уста")],
  "higiena/damska-higiena": [n("higiena/intimna-higiena", "Гел за интимна хигиена"), n("higiena/mokri-karpichki", "Мокри кърпички", { only: WIPES })],
  "higiena/intimna-higiena": [n("higiena/damska-higiena", "Дамски превръзки")],
  "higiena/pamuchni": [n("litse/pochistvane", "Мицеларна вода или демакиант", { only: /мицелар|демакиант|micellar|двуфаз/i }), n("nokti/lakochistiteli", "Лакочистител")],
  // Accessories
  "aksesoari/chetki-za-grim": [n("grim/pudri", "Пудра"), n("grim/fon-dyo-ten", "Фон дьо тен")],
  "aksesoari/gabi-i-aplikatori": [n("grim/fon-dyo-ten", "Фон дьо тен"), n("grim/korektori", "Коректор")],
  "aksesoari/chetki-za-kosa": [n("kosa/bez-otmivane", "Спрей за лесно разресване"), n("aksesoari/za-kosa", "Ластици и шноли")],
  "aksesoari/za-kosa": [n("aksesoari/chetki-za-kosa", "Четка за коса")],
  "aksesoari/za-banya": [n("tyalo/dush-gelove", "Душ гел"), n("tyalo/skrabove", "Скраб за тяло")],
};

export type Pair = { card: CardProduct; why: string };

const KIDS = /детск|бебе|бебешк|\bkids?\b|\bbaby\b|junior|за деца|момче|момиче/i;
const MEN = /\bмъж|за мъже|\bmen\b|\bman\b|homme|uomo|\bmale\b/i;
const WOMEN = /дамск|за жени|\bwomen\b|\bwoman\b|femme|donna|\blady\b/i;
// Testers, displays and gift sets are not offered as an extra.
const NOT_OFFERED = /тестер|tester|мостр|sample|дисплей|display|комплект|\bset\b|подаръч|\bkit\b/i;

type Index = {
  products: readonly Product[];
  bySub: Map<string, Product[]>;
  /** Words of a name that are rare in the catalog: product lines and scents ("elseve", "hyaluron", "cool", "water"). */
  lineWords: Map<Product, Set<string>>;
};

let index: Index | null = null;

const words = (s: string) => s.toLowerCase().replace(/ё/g, "е").match(/[\p{L}][\p{L}'’]{2,}/gu) ?? [];

function build(products: readonly Product[]): Index {
  const bySub = new Map<string, Product[]>();
  const df = new Map<string, number>();
  const own = new Map<Product, string[]>();
  for (const p of products) {
    const key = `${p.category}/${p.sub}`;
    const list = bySub.get(key) ?? [];
    list.push(p);
    bySub.set(key, list);
    const brandWords = new Set(words(p.brand));
    const w = [...new Set(words(p.name))].filter((x) => !brandWords.has(x));
    own.set(p, w);
    for (const x of w) df.set(x, (df.get(x) ?? 0) + 1);
  }
  // A word on fewer than 120 of ~29 000 products names a line or a scent; common words name a product type.
  const lineWords = new Map<Product, Set<string>>();
  for (const [p, w] of own) lineWords.set(p, new Set(w.filter((x) => (df.get(x) ?? 0) < 120)));
  for (const list of bySub.values()) list.sort((a, b) => b.rank - a.rank);
  return { products, bySub, lineWords };
}

function db(): Index {
  const products = allProducts();
  if (!index || index.products !== products) index = build(products);
  return index;
}

/** A stable number in [0, 1) for a pair of SKUs. */
function jitter(a: string, b: string): number {
  let h = 2166136261;
  for (const ch of `${a}|${b}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const audience = (p: Product) => ({
  kids: p.facts.gender === "k" || p.tags.includes("detsa") || KIDS.test(p.name),
  men: p.facts.gender === "m" || MEN.test(p.name),
  women: p.facts.gender === "w" || WOMEN.test(p.name),
});

/** How well `x` fits `need` of `p`: null when it does not fit at all, otherwise a score (higher is better). */
function fit(p: Product, x: Product, need: Need): number | null {
  const { lineWords } = db();
  if (x.sku === p.sku || `${x.category}/${x.sub}` !== need.sub) return null;
  if (need.when && !need.when.test(p.name)) return null;
  if (x.stock <= 0 || Math.min(x.iw, x.ih) < 300 || NOT_OFFERED.test(x.name)) return null;
  if (need.only && !need.only.test(x.name)) return null;
  // An extra should not cost far more than the product itself (no 80 € water flosser with a mouthwash).
  if (x.price > p.price * 3 + 15) return null;
  const who = audience(p);
  const them = audience(x);
  // Children's products only with children's products; men's and women's lines are not mixed.
  if (them.kids !== who.kids) return null;
  if ((who.men && them.women && !them.men) || (who.women && them.men && !them.women)) return null;
  const sameBrand = Boolean(p.brandSlug) && x.brandSlug === p.brandSlug;
  const mine = lineWords.get(p) ?? new Set<string>();
  let shared = 0;
  for (const w of lineWords.get(x) ?? []) if (mine.has(w)) shared++;
  if (need.sameLine && !(sameBrand && shared > 0)) return null;
  // Same line first, then the same brand, then one of the best sellers of the kind — a different one for each product,
  // so the same sponge is not offered with every shower gel.
  return (sameBrand ? 4 : 0) + Math.min(shared, 2) * 3 + x.rank / 1000 + jitter(p.sku, x.sku) * 0.4;
}

/** Products that go well with `p`, at most `limit`, each with why. Nothing for sold-out products. */
export function pairsFor(p: Product, limit = 3): Pair[] {
  const needs = PAIRS[`${p.category}/${p.sub}`];
  if (!needs || p.stock <= 0) return [];
  const { bySub } = db();
  const used = new Set<string>([cardKey(p)]);
  const out: Pair[] = [];
  for (const need of needs) {
    if (out.length >= limit) break;
    let best: { x: Product; score: number } | null = null;
    for (const x of bySub.get(need.sub) ?? []) {
      if (used.has(cardKey(x))) continue;
      const score = fit(p, x, need);
      if (score !== null && (!best || score > best.score)) best = { x, score };
    }
    if (!best) continue;
    used.add(cardKey(best.x));
    out.push({ card: toCard(best.x), why: need.why });
  }
  return out;
}

/**
 * True when `skus` is a set the product page could offer: the product first, then one to three extras, each a
 * different kind of product that goes with it. The page's pick can change with stock between the visit and the order,
 * so any fitting extra counts, not only the one shown. The order uses this before it grants a bundle discount.
 */
export function isBundle(skus: string[]): boolean {
  if (skus.length < 2 || skus.length > 4 || new Set(skus).size !== skus.length) return false;
  const [main, ...extras] = skus.map((sku) => getBySku(sku));
  if (!main || main.stock <= 0 || extras.some((x) => !x)) return false;
  const needs = PAIRS[`${main.category}/${main.sub}`] ?? [];
  // Each extra must fill its own need: try every assignment (at most 3 extras).
  const assign = (i: number, taken: Set<number>): boolean => {
    if (i === extras.length) return true;
    return needs.some((need, n) => !taken.has(n) && fit(main, extras[i]!, need) !== null && assign(i + 1, new Set([...taken, n])));
  };
  return assign(0, new Set());
}
