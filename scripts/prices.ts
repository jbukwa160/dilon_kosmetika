// Retail price estimates. The export has no prices, so until data/prices.csv has real ones every product gets a
// believable price from its subcategory, the brand's price tier and the pack size. Estimates are marked
// priceConfirmed: false and the shop's order e-mail warns about them.

import { createHash } from "node:crypto";
import type { FactsOut, Place } from "./rules";

/** Typical price (euro) of a mid-market product of the subcategory, and its typical size in ml. */
const BASE: Record<string, [number, number?]> = {
  "fon-dyo-ten": [13.9, 30], "bb-i-cc-kremove": [12.9, 30], korektori: [9.4], pudri: [11.9], ruzh: [10.4], "bronzanti-i-kontur": [11.9],
  haylaytari: [11.4], "osnovi-i-fiksatori": [11.9, 30], spirali: [11.4], "ochni-linii": [8.9], "molivi-za-ochi": [6.9], "senki-za-ochi": [11.9],
  vezhdi: [8.4], migli: [7.9], chervila: [10.4], glantsove: [8.9], "molivi-za-ustni": [6.9], "balsami-za-ustni": [4.9], "komplekti-grim": [21.9],
  pochistvane: [11.9, 250], tonitsi: [13.9, 200], serumi: [21.9, 30], kremove: [19.9, 50], "okoloochen-kontur": [18.9, 15], maski: [4.9],
  eksfolianti: [16.9, 100], "masla-za-litse": [21.9, 30], "termalni-vodi": [10.9, 150], "komplekti-litse": [32.9],
  shampoani: [7.4, 250], balsami: [7.4, 200], "maski-za-kosa": [10.9, 250], "bez-otmivane": [11.9, 150], "serumi-i-olia": [13.9, 100],
  skalp: [16.9, 100], stilizirane: [8.4, 200], "boya-za-kosa": [8.9], "uredi-za-kosa": [54.9], "komplekti-kosa": [17.9],
  "dush-gelove": [5.4, 250], sapuni: [3.9, 100], skrabove: [9.9, 200], vana: [7.9], losioni: [9.9, 250], "masla-za-tyalo": [12.9, 100], "eterichni-masla": [8.9, 10],
  "ratse-i-kraka": [6.4, 75], dezodoranti: [6.4, 150], epilatsia: [8.9], "komplekti-tyalo": [18.9],
  lakove: [6.4], "gel-lakove": [10.4], "osnovi-i-top": [7.4], "grizha-za-nokti": [7.4], lakochistiteli: [4.9, 100], manikyur: [6.9],
  "za-litse": [18.9, 50], "za-tyalo": [16.9, 200], detska: [17.9, 150], "sled-slantse": [12.9, 200], avtobronzanti: [16.9, 150],
  brasnene: [10.9], aftarsheyv: [11.9, 100], brada: [13.9, 50], "grizha-za-mazhe": [16.9, 50], "komplekti-mazhe": [21.9],
  "pasti-za-zabi": [5.4, 75], "chetki-za-zabi": [4.4], "elektricheski-chetki": [44.9], "vodi-za-usta": [7.4, 500], interdentalni: [6.4],
  "damska-higiena": [4.4], "intimna-higiena": [6.4, 250], "mokri-karpichki": [2.9], pamuchni: [2.7],
  "chetki-za-grim": [9.9], "gabi-i-aplikatori": [6.4], "chetki-za-kosa": [8.4], "za-kosa": [4.4], instrumenti: [7.4], "za-banya": [5.4],
  neseseri: [13.9],
};

/** Perfume price of a 100 ml bottle by house tier. */
const PERFUME_100: Record<Tier, number> = { budget: 16, mass: 24, unknown: 34, mid: 52, premium: 78, luxury: 105, niche: 165 };

/** "mass" are drugstore brands (Nivea, Dove, Garnier); "budget" are inexpensive make-up and perfume lines. */
type Tier = "budget" | "mass" | "unknown" | "mid" | "premium" | "luxury" | "niche";
const TIER_FACTOR: Record<Tier, number> = { budget: 0.6, mass: 0.6, unknown: 0.72, mid: 0.95, premium: 1.45, luxury: 2.3, niche: 2.6 };

const TIERS: [Tier, string[]][] = [
  ["niche", [
    "nishane", "xerjoff", "olibanum", "carner barcelona", "essential parfums", "goldfield & banks", "tiziana terenzi", "the merchant of venice",
    "p. frapin & cie", "kayali", "parfums dusita", "blend oud", "new notes", "the house of oud", "house of thêom", "theodoros kalotinis perfumer",
  ]],
  ["luxury", [
    "chopard", "carven", "dolce&gabbana", "burberry", "versace", "prada", "givenchy", "dior", "chanel", "yves saint laurent", "armani",
    "giorgio armani", "gucci", "hermès", "boucheron", "jimmy choo", "roberto cavalli", "mugler", "lancôme", "estée lauder", "clinique",
    "shiseido", "sisley", "kérastase", "institut esthederm", "filorga", "rochas", "paco rabanne", "bvlgari", "montblanc", "lalique", "chloé",
    "valentino", "tom ford", "marc jacobs", "narciso rodriguez", "issey miyake", "jean paul gaultier", "carolina herrera", "oscar de la renta",
    "courrèges", "kenzo", "moschino", "trussardi", "salvatore ferragamo",
  ]],
  ["premium", [
    "hugo boss", "calvin klein", "davidoff", "azzaro", "cerruti", "dkny", "liu jo", "karl lagerfeld", "furla", "lierac", "nuxe", "caudalie",
    "vichy", "la roche-posay", "avène", "bioderma", "uriage", "eucerin", "svr", "ducray", "klorane", "a-derma", "apivita", "korres", "phyto",
    "rené furterer", "isdin", "cerave", "frezyderm", "wella professionals", "redken", "matrix", "l'oréal professionnel", "alfaparf milano",
    "chi", "olaplex", "moroccanoil", "real techniques", "philips", "oral-b", "braun", "mádara", "weleda", "dr. konopka's", "elizabeth arden",
    "lacoste", "guess", "elode", "antonio banderas", "christina aguilera", "sabrina carpenter", "the ordinary", "transparent lab", "medicube",
    "rituals", "sol de janeiro", "medi-peel", "beurer", "rowenta", "remington", "babyliss", "panasonic", "oclean", "curaprox", "tepe",
    "ahava", "jowaé", "topicrem", "noreva", "galenic", "skinceuticals", "kylie cosmetics", "milani", "artdeco", "max factor",
  ]],
  ["mass", [
    "nivea", "dove", "garnier", "pantene", "syoss", "gliss", "schauma", "head & shoulders", "palmolive", "colgate", "aquafresh", "lacalut",
    "rexona", "fa", "axe", "old spice", "balea", "ebelin", "alverde", "isana", "fructis", "timotei", "elseve", "always", "naturella",
    "libresse", "o.b.", "bella", "veet", "intesa", "cien", "nature box", "taft", "wellaflex", "gliss kur", "dontodent", "jordan", "trisa",
    "signal", "blend-a-med", "nivea men", "str8", "b.u.", "lycia", "malizia", "johnson's", "bochko", "бочко", "zdrave", "здраве", "aroma",
    "regal", "bilka", "biofresh", "ikarov", "rivana", "astera", "velnea", "llums", "victoria beauty", "nature of agiva", "bulgarian rose",
    "tesori d'oriente", "spuma di sciampagna", "fresh", "baby crema", "babylove", "sebamed baby",
  ]],
  ["mid", [
    "l'oréal paris", "maybelline new york", "rimmel", "bourjois", "revlon", "nyx professional makeup", "gosh copenhagen", "missha",
    "john frieda", "ogx", "tresemmé", "lee stafford", "neutrogena", "mixa",
    "sensodyne", "parodontax", "elmex", "listerine", "gillette", "wilkinson sword", "yves rocher",
    "farmstay", "mizon", "it's skin", "holika holika", "rom&nd", "peripera", "pierre cardin", "vivienne sabó", "lumene", "sebamed",
    "mustela", "babé", "ziaja", "lavera", "benecos", "speick",
    "pupa", "deborah", "kiko", "wet n wild", "essie", "opi", "schwarzkopf", "taft", "batiste", "palette", "tom tailor", "s.oliver", "nike",
    "adidas", "mexx", "betty barclay", "playboy", "lattafa", "maison alhambra", "armaf", "al haramain", "swiss arabian", "women'secret",
    "jacques zolty",
  ]],
  ["budget", [
    "golden rose", "wibo", "lovely", "essence", "catrice", "flormar", "aura", "bell", "eveline cosmetics", "revolution", "delia cosmetics",
    "idc institute", "vzk", "titania", "velnea", "llums", "la rive", "cuba", "coscentra", "verset", "jacques battini", "dorall collection",
    "chic'n glam", "côte d'azur", "nam", "trend !t up", "bel london", "profusion", "w7", "parsa beauty", "ebelin", "aroma", "regal",
    "bochko", "бочко", "здраве", "bilka", "biofresh", "ikarov", "rivana", "astera", "fitocosmetics", "cameleo", "marion", "lorenay",
    "malizia", "tesori d'oriente", "spuma di sciampagna", "lamis", "rue pergolese", "martinelia", "abc", "iv", "kent", "yesss", "andreia",
    "21 cosmetics", "pompea", "lip smacker", "crazy rumors", "nl beauty", "biobaza", "biobalance", "jordan", "trisa", "aquafresh",
    "pierrot", "nordics", "intesa", "top ten", "denim", "bilka", "farmona", "zoya goes pretty", "milva",
  ]],
];
const TIER_OF = new Map<string, Tier>();
for (const [tier, brands] of TIERS) for (const b of brands) if (b && !TIER_OF.has(b)) TIER_OF.set(b, tier);

function tierFor(brand: string, place: Place): Tier {
  const t = TIER_OF.get(brand.toLowerCase());
  if (t) return t;
  if (place.sub === "nishovi") return "niche";
  return "unknown";
}

/** Same SKU, same "random" number between 0 and 1. */
function unit(sku: string, salt = ""): number {
  const h = createHash("sha1").update(sku + salt).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

/** Retail-looking price: 4,49 / 7,90 / 12,99 / 34,90 / 89,00. */
function retail(value: number, sku: string): number {
  const v = Math.max(1.49, value);
  if (v >= 60) return Math.max(59, Math.round(v / 5) * 5 - (unit(sku, "e") < 0.5 ? 0.1 : 0));
  const whole = Math.floor(v);
  const endings = v < 10 ? [0.49, 0.79, 0.9, 0.99] : [0.49, 0.9, 0.99];
  const end = endings[Math.floor(unit(sku, "c") * endings.length)];
  return Math.round((whole + end) * 100) / 100;
}

export function estimatePrice(sku: string, name: string, brand: string, place: Place, facts: FactsOut): number {
  const tier = tierFor(brand, place);
  const jitter = 0.88 + unit(sku) * 0.26;
  const lower = name.toLowerCase();

  if (place.category === "parfyumi" && place.sub !== "mistove") {
    let base = PERFUME_100[tier];
    if (facts.conc === "edt" || facts.conc === "edc") base *= 0.86;
    if (facts.conc === "parfum") base *= 1.15;
    if (place.sub === "parfyumni-komplekti") base *= 1.25;
    if (place.sub === "detski-parfyumi") base = Math.min(base, 22);
    const ml = facts.ml && facts.ml >= 3 && facts.ml <= 250 ? facts.ml : 75;
    return retail(base * Math.pow(ml / 100, 0.72) * jitter, sku);
  }

  const [basePrice, typicalMl] = BASE[place.sub] ?? [9.9];
  let price = basePrice * TIER_FACTOR[tier];
  // Devices are priced by kind, not by the cosmetic subcategory.
  if (/епилатор|epilator|ipl/.test(lower)) price = 69 * (tier === "budget" ? 0.6 : 1);
  else if (/самобръсначка|shaver|тример|trimmer|машинка/.test(lower) && /(?:електр|electric|braun|philips|remington|series|oneblade)/.test(lower)) price = 59;
  else if (place.sub === "elektricheski-chetki" && /накрайни|глав|heads|наконечник/.test(lower)) price = 16.9 * (facts.pcs && facts.pcs > 2 ? 1.6 : 1);
  else if (place.sub === "brasnene" && /ножчета|blades|резервни/.test(lower)) price = 14.9 * TIER_FACTOR[tier];
  else if (place.sub === "senki-za-ochi" && /палитра|palette/.test(lower)) price *= 1.7;
  else if (place.sub === "maski" && (facts.ml ?? 0) >= 40) price = 13.9 * TIER_FACTOR[tier];

  if (typicalMl && facts.ml && facts.ml > 0) price *= Math.min(2.4, Math.max(0.55, Math.pow(facts.ml / typicalMl, 0.55)));
  if (facts.pcs && facts.pcs >= 3 && ["damska-higiena", "mokri-karpichki", "pamuchni", "maski", "chetki-za-zabi", "za-kosa"].includes(place.sub)) {
    price *= Math.min(2.2, Math.max(1, Math.pow(facts.pcs / 10, 0.35)));
  }
  return retail(price * jitter, sku);
}
