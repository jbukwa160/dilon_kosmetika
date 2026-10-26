// Product names as shown in the shop: abbreviations written out, internal codes removed, SHOUTING toned down,
// units written one way ("50 мл", "4 г", "16 бр.", "3 × 100 г"). The brand is shown separately, so it is not part of
// the name.

/** Distributor shorthand: [pattern, what to write, words that make it unnecessary when the name already has them]. */
const ABBREVIATIONS: [RegExp, string, RegExp?][] = [
  [/(^|[\s(])ш-н(?=[\s,.]|$)/giu, "$1шампоан"],
  [/(^|[\s(])б-м(?=[\s,.]|$)/giu, "$1балсам"],
  [/(^|[\s(])(?:к-?)?кт(?=[\s,./]|$)/giu, "$1комплект"],
  [/(^|[\s(])к-т(?=[\s,.]|$)/giu, "$1комплект"],
  [/(^|[\s(])[кk]\s?\/\s?[тt](?=[\s,.(]|$)/giu, "$1комплект"],
  [/(^|[\s(.])м-ка(?=[\s,.]|$)/giu, "$1маска"],
  [/(^|[\s(])шн(?=[\s,.]|$)/giu, "$1шампоан"],
  [/(^|[\s(])дг(?=[\s,.]|$)/giu, "$1душ гел"],
  [/(^|[\s(])бм(?=\s(?:арома|aroma))/giu, "$1балсам"],
  [/(^|[\s(])бм\s?(?=\d)/giu, "$1боди мист "],
  [/(^|[\s(+])бл\s?(?=\d)/giu, "$1лосион за тяло "],
  [/(^|[\s(])пк(?=[\s,.]|$)/giu, "$1подаръчен комплект"],
  [/(^|[\s(])ву(?=[\s,.]|$)/giu, "$1вода за уста", /вода за уста/iu],
  [/(^|[\s(])дч\s?\/\s?з(?=[\s,.]|$)/giu, "$1детска четка за зъби", /четка за зъби/iu],
  [/(^|[\s(])ч\s?\/\s?з(?=[\s,.]|$)/giu, "$1четка за зъби", /четка за зъби/iu],
  [/(^|[\s(])3mm(?=[\s,.]|$)/giu, "$13 Minute Miracle"],
  [/(^|[\s(])к\.\s?тампони/giu, "$1козметични тампони"],
  [/(^|[\s(])дам\.\s?(?=превръзки)/giu, "$1дамски "],
  [/(^|[\s(])ess\.\s?/giu, "$1Essentials "],
  [/(^|[\s(])pureac\.\s?/giu, "$1Pure Active "],
  [/(^|[\s(])niacin\.\s?/giu, "$1Niacinamide "],
  [/(^|[\s(])sens\.\s?advansed/giu, "$1Sensitive Advanced"],
  [/(^|[\s(])миц\.\s?/giu, "$1мицеларна "],
  [/(^|[\s(])почист\.\s?/giu, "$1почистващ "],
  [/(^|[\s(])поч\.\s?(?=маска)/giu, "$1почистваща "],
  [/(^|[\s(])подхр\.\s?/giu, "$1подхранващ "],
  [/(^|[\s(])спр\.\s?бели кор\.?/giu, "$1спрей за бели корени"],
  [/(^|[\s(])спр\.?(?=\s)/giu, "$1спрей"],
  [/(^|[\s(])спр\.(?=\d)/giu, "$1спрей "],
  [/(^|[\s(])м\.\s?ст\.\s?/giu, "$1мъжки стик "],
  [/(^|[\s(])инвиз\.\s?/giu, "$1Invisible "],
  [/(^|[\s(])кокос\.\s?(?=мляко|масло|вода)/giu, "$1кокосово "],
  [/(^|[\s(])санд\.\s?(?=дърво)/giu, "$1сандалово "],
  [/(^|[\s(/])св\.\s?(?=беж|кафяв|рус|роз|сив|син|зелен)/giu, "$1светло"],
  [/(^|[\s(/-])т\.\s?(?=беж|кафяв|рус|роз|сив|син|зелен)/giu, "$1тъмно"],
  [/(^|[\s(])реген\.\s?/giu, "$1регенериращ "],
  [/(^|[\s(])пам\.\s?(?=тампони|дискове)/giu, "$1памучни "],
  [/(^|[\s(])депил\.(?=\s|$)/giu, "$1депилация"],
  [/(^|[\s(])тв\s?(?=\d)/giu, "$1тоалетна вода "],
  [/(^|[\s(])дълг\.\s?/giu, "$1дълготраен "],
  [/(^|[\s(])водоуст\.\s?(?=очна|спирала)/giu, "$1водоустойчива "],
  [/(^|[\s(])водоуст\.\s?/giu, "$1водоустойчив "],
  [/(^|[\s(])вит\.\s?(?=[цcсеeабa-z])/giu, "$1витамин "],
  [/(^|[\s(])натур\.\s?(?=съставки)/giu, "$1натурални "],
  [/(^|[\s(])натур\.\s?рус/giu, "$1натурално рус"],
  [/(^|[\s(])зл\.\s?връх/giu, "$1златен връх"],
  [/(^|[\s(])бамб\.\s?въглен/giu, "$1бамбуков въглен"],
  [/(^|[\s(])изк\.\s?нокти/giu, "$1изкуствени нокти"],
  [/(^|[\s(])гр\.\s?чай/giu, "$1зелен чай"],
  [/(^|[\s(])ест\.\s?косъм/giu, "$1естествен косъм"],
  [/(^|[\s(])керам\.\s?съд/giu, "$1керамичен съд"],
  [/(^|[\s(])дърв\.\s?съд/giu, "$1дървен съд"],
  [/(^|[\s(/])мет\.\s?кутия/giu, "$1метална кутия"],
  [/(^|[\s(])роз\.\s?глина/giu, "$1розова глина"],
  [/(^|[\s(])алумин?\.\s?соли/giu, "$1алуминиеви соли"],
  [/(^|[\s(])алум\.\s?бут\.?/giu, "$1алуминиева бутилка "],
  [/(^|[\s(])карт\.\s?оп\.?/giu, "$1картонена опаковка "],
  [/(^|[\s(])харт\.\s?оп\.?/giu, "$1хартиена опаковка "],
  [/(^|[\s(])афт\.\s?шейв/giu, "$1афтършейв"],
  [/(^|[\s(])гумена подл(?=[\s,.]|$)/giu, "$1гумена подложка"],
  [/(?<=бр\.\s)чет\.?\s*$/giu, "четки"],
  [/(^|[\s(])тъмен(?=тюркоаз|син|зелен|кафяв)/giu, "$1тъмен "],
  [/душкрем/giu, "душ крем"],
  [/(^|[\s(])д-т(?=[\s,.]|$)/giu, "$1дезодорант"],
  [/(^|[\s(])бк(?=[\s,.]|$)/giu, "$1боя за коса", /боя за коса/iu],
  [/(^|[\s(])чз(?=[\s,.]|$)/giu, "$1четка за зъби", /четка за зъби/iu],
  [/(^|[\s(])пз(?=[\s,.]|$)/giu, "$1паста за зъби", /паста за зъби/iu],
  [/(^|[\s(])дчз(?=[\s,.]|$)/giu, "$1детска четка за зъби", /четка за зъби/iu],
  [/(^|[\s(])дпз(?=[\s,.]|$)/giu, "$1детска паста за зъби", /паста за зъби/iu],
  [/(^|[\s(])кз(?=[\s,.]|$)/giu, "$1конец за зъби", /конец за зъби/iu],
  [/(^|[\s(])ск(?=\s+скраб)\s*/giu, "$1"],
  [/(^|[\s(])спир\.\s?/giu, "$1спирала "],
  [/(^|[\s(])автом\.\s?/giu, "$1автоматичен "],
  [/(^|[\s(])компл\.?(?=\s)/giu, "$1комплект"],
  [/(^|[\s(])сл\.\s?защ\.?/giu, "$1слънцезащитен"],
  [/(^|[\s(])изб\.\s?/giu, "$1избелващи "],
  [/(^|[\s(])овл\.\s?/giu, "$1овлажняващ "],
  [/(^|[\s(])акт\.?\s(?=въглен)/giu, "$1активен "],
  [/(^|[\s(])сил(?=[\s,.]|$)/giu, "$1силиконови"],
  [/(^|[\s(])искр\.\s?/giu, "$1искрящо "],
  [/(^|[\s(])пам\.\s?маска/giu, "$1памучна маска"],
  [/(^|[\s(])дн\.\s?кр\.?/giu, "$1дневен крем "],
  [/(^|[\s(])нощ\.\s?кр\.?/giu, "$1нощен крем "],
  [/(^|[\s(])дн\s?\/\s?нощ(?=[\s,.]|$)/giu, "$1дневен/нощен"],
  [/(^|[\s(])поч\.\s?лос\.?/giu, "$1почистващ лосион "],
  [/(^|[\s(])кр\.\s?без отмив\.?/giu, "$1крем без отмиване "],
  [/(^|[\s(])кр\.(?=\s|\d|$)/giu, "$1крем "],
  [/(^|[\s(])хидр(?:ат)?\.(?=\s|\p{L}|$)\s?/giu, "$1хидратиращ "],
  [/(^|[\s(])интенз\.\s?/giu, "$1интензивен "],
  [/(^|[\s(])концентр\.\s?/giu, "$1концентриран "],
  [/(^|[\s(])депилат\.\s?/giu, "$1депилиращ "],
  [/(^|[\s(])ексф\.?\s(?=гъба|ръкавица|маска|четка)/giu, "$1ексфолираща "],
  [/(^|[\s(])ексф\.?(?=\s)\s?/giu, "$1ексфолиращ "],
  [/(^|[\s(])ексф\.(?=\p{L})/giu, "$1ексфолиращ "],
  [/(^|[\s(])синт\.\s?/giu, "$1синтетични "],
  [/(^|[\s(])кис\.\s?/giu, "$1киселина "],
  [/(^|[\s(])чув(?:ств?)?\.\s?/giu, "$1чувствителна "],
  [/(^|[\s(])норм\.\s?/giu, "$1нормална "],
  [/(^|[\s(])комб\.\s?/giu, "$1комбинирана "],
  [/(^|[\s(-])пълн(?:ит|т)?\.\s?/giu, "$1пълнител "],
  [/(^|[\s(])пост\.\s?/giu, "$1поставка "],
  [/(^|[\s(])нож\.\s?/giu, "$1ножчета "],
  [/(^|[\s(])под\.\s?оп\.?\s?/giu, "$1подаръчна опаковка "],
  [/(^|[\s(])теч\.\s?/giu, "$1течен "],
  [/(^|[\s(])ежедн\.\s?/giu, "$1ежедневни "],
  [/(^|[\s(])ел\.\s?(?=четка)/giu, "$1електрическа "],
  [/(^|[\s(])п\/в(?=\s)/giu, "$1против"],
  [/(^|[\s(])акс\.\s?/giu, "$1аксесоар "],
  [/(^|[\s(])м\.\s?део(?=[\s,.]|$)/giu, "$1мъжки дезодорант"],
  [/(^|[\s(])м\.\s?стик(?=[\s,.]|$)/giu, "$1мъжки стик"],
  [/(^|[\s(])м\.\s?спрей(?=[\s,.]|$)/giu, "$1мъжки спрей"],
  [/(^|[\s(])инв\.\s?/giu, "$1Invisible "],
  [/(^|[\s(])бл-уайт(?=[\s,.\d]|$)/giu, "$1Black & White"],
  [/(^|[\s(])блек(?=[\s,.\d]|$)/giu, "$1Black"],
  [/(^|[\s(])(?:фдт|fdt)(?=[\s,.]|$)/giu, "$1фон дьо тен"],
  [/(^|[\s(])(?:едт|одт)(?=[\s,.+/]|$)/giu, "$1EDT"],
  [/(^|[\s(])мтв(?=[\s,.+/]|$)/giu, "$1мъжка тоалетна вода"],
  [/(^|[\s(])дтв(?=[\s,.+/]|$)/giu, "$1дамска тоалетна вода"],
  [/(^|[\s(])мпв(?=[\s,.+/]|$)/giu, "$1мъжка парфюмна вода"],
  [/(^|[\s(])дпв(?=[\s,.+/]|$)/giu, "$1дамска парфюмна вода"],
  [/((?:^|[\s(])(?:дамска|мъжка|унисекс)\s)тв(?=[\s,.+/]|$)/giu, "$1тоалетна вода"],
  [/(^|[\s(])(?:едп|одп)(?=[\s,.+/]|$)/giu, "$1EDP"],
  [/(^|[\s(])парф\.?\s*(\d+)\s+спрей/giu, "$1парфюмен спрей $2"],
  [/(^|[\s(])парф\.?(?=[\s*]|$)/giu, "$1парфюм"],
  [/душгел/giu, "душ гел"],
  [/(^|[\s(])део(?= спрей| стик| рол)/giu, "$1дезодорант"],
];

/** Words kept in capitals (acronyms, units, perfume concentrations). */
const ACRONYMS = new Set([
  "SPF", "UV", "UVA", "UVB", "EDP", "EDT", "EDC", "BB", "CC", "DD", "AHA", "BHA", "PHA", "Q10", "DNA", "LED", "XL", "XXL", "XXXL", "XS",
  "NYX", "OPI", "CBD", "SOS", "VIP", "ABC", "CHI", "IDC", "VZK", "SVR", "USA", "UK", "NY", "PH", "HD", "3D", "4D", "5D", "7D", "PRO",
  "PPD", "SPA", "N", "NO", "C", "E", "A", "B", "K", "D", "3", "IPL", "UV/LED", "LR", "OUD", "B5", "B3", "B12", "AC", "MAX", "II", "III",
  "IV", "VI", "IR", "PA", "NMF", "ACE", "CICA", "XS", "S", "M", "L", "XXS", "BIO", "W7", "R.O.C.S.", "GOSH", "ARTDECO",
]);
/** Short capitalised words that are not acronyms ("FOR MEN" → "For Men", "EAU DE" → "Eau De"). */
const SHORT_WORDS = new Set([
  "MEN", "FOR", "AND", "THE", "OF", "ONE", "NEW", "ALL", "MY", "TO", "IN", "ON", "BY", "SUN", "LIP", "EYE", "OIL", "GEL", "DAY",
  "AGE", "MIX", "AIR", "ICE", "RED", "HOT", "ZEN", "BOX", "SET", "KIT", "TOP", "BIG", "WOW", "YOU", "HER", "HIM", "SHE", "HIS",
  "SEA", "SKY", "JOY", "MAN", "BOY", "DRY", "WET", "FIX", "ART", "PEN", "CUT", "CAN", "MAT", "GLOW", "MAKE", "UP", "SOFT", "LUX",
  "OUT", "NUT", "TEA", "FIG", "GUM", "FUN", "LOVE", "PINK", "NUDE", "GOLD", "BLUE", "BABY", "KIDS", "PURE", "CARE", "LINE",
  "EAU", "DE", "LA", "LE", "DU", "DES", "LES", "ET", "SO", "GO", "BE", "ME", "IT", "AT", "AS", "OR", "OH", "GET", "YES", "WAY",
]);
/** Single Cyrillic letters that are words ("И", "С", "В"): lower case in a shouting name. */
const ONE_LETTER_WORDS = /^[ИСВАОУКЗ]$/u;

function titleWord(w: string): string {
  // Capital after a hyphen or a dot, and after an apostrophe only when a word follows ("D'Argent", but "Let's").
  return w.toLowerCase().replace(/(^|[-.])(\p{L})|(['’])(\p{L})(?=\p{L})/gu, (_, sep: string, ch: string, ap: string, ch2: string) =>
    sep !== undefined ? sep + ch.toUpperCase() : ap + ch2.toUpperCase(),
  );
}

/** SHOUTING words become normal case: Cyrillic ones lower case, Latin ones Title Case. Acronyms and codes stay. */
function isShouting(name: string): boolean {
  const cyrillic = name.match(/\p{Script=Cyrillic}/gu) ?? [];
  return cyrillic.length >= 6 && cyrillic.filter((ch) => ch === ch.toUpperCase()).length / cyrillic.length > 0.6;
}

function tameCaps(name: string, shouting = isShouting(name)): string {
  return name.replace(/[\p{L}\p{N}'’.&-]+/gu, (token) => {
    const letters = token.replace(/[^\p{L}]/gu, "");
    // "И" is always the conjunction; "С" and "В" can be a vitamin or a size, so only in a shouting name.
    if (letters.length < 2) return (shouting && ONE_LETTER_WORDS.test(token)) || token === "И" ? token.toLowerCase() : token;
    if (letters !== letters.toUpperCase()) return token;
    if (/\p{N}/u.test(token)) return token;
    if (ACRONYMS.has(token.toUpperCase()) || ACRONYMS.has(letters.toUpperCase())) return token;
    if (/\p{Script=Cyrillic}/u.test(token)) return token.toLowerCase();
    if (letters.length <= 3 && !SHORT_WORDS.has(letters.toUpperCase())) return token;
    return titleWord(token);
  });
}

/** Appliance rows that carry an English spec sheet as their name ("TN1400F1, Hair clipper Nomad, new design, …"). */
const DEVICE_TYPES: [RegExp, string][] = [
  [/\bbeard trimmer\b/i, "Тример за брада"],
  [/\bhair ?clipper\b/i, "Машинка за подстригване"],
  [/\bepilator\b/i, "Епилатор"],
  [/\bhair[- ]?remov(?:er|al)\b/i, "IPL уред за епилация"],
  [/\bhair ?dryer\b/i, "Сешоар"],
  [/\bhair ?straightener\b/i, "Преса за коса"],
  [/\bcurl(?:ing|er)\b/i, "Маша за коса"],
  [/\b(?:hot )?air (?:brush|styler)\b/i, "Четка-сешоар"],
  [/\bshaver\b/i, "Самобръсначка"],
  [/\btrimmer\b/i, "Тример"],
];

function specSheetName(s: string): string | null {
  if (/\p{Script=Cyrillic}/u.test(s.split(/[;,]/)[0])) return null;
  const m = s.match(/^\s*((?:[A-Z]{2,4} ?\d{2,4}[A-Z]?\d?)|(?:[A-Z]{2}\d{4}[A-Z]\d))[,\s]+(.+)$/);
  if (!m) return null;
  const [, model, rest] = m;
  for (const [re, type] of DEVICE_TYPES) {
    if (!re.test(rest)) continue;
    const head = rest.split(/[,;]|\s[-–]\s/)[0];
    const line = head
      .replace(re, " ")
      .replace(/\b(?:cordless|new design|ipl|device)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    // The line name only when it is short; a description is not a name.
    const named = line && line.split(" ").length <= 4 && !DEVICE_TYPES.some(([r]) => r.test(line)) ? ` ${line}` : "";
    return `${type}${named} ${model}`.replace(/\s{2,}/g, " ").trim();
  }
  return null;
}

/** Article numbers and supplier codes some brands put in every name. */
const BRAND_CODES: [RegExp, RegExp][] = [
  [/^(?:idc institute|martinelia)$/i, /(?<![\p{L}\p{N}.,/-])\d{4,6}[a-z]?(?![\p{L}\p{N}.,/-])(?!\s?(?:мл|г|бр|л)(?![\p{L}]))|^\s*Деко\s+|\s+MS(?=\s)/gu],
  [/^(?:abc|lorenay)$/i, /^(?:U|SPS)\s+|\s+(?:LH|DH|LF|H|D|K|SPS|F|FS|HS|LS|SH|DFH|DF|FH|S)$/gu],
  [/^air-val$/i, /\s+(?:D|F|FH|FL|HF1|F1|L)$/gu],
  [/^parsa beauty$/i, /\s+(?:S|SH|LS|SF|FS|HS)$/gu],
  [/^(?:killys|inter-vion)$/i, /\s+K$/gu],
  [/^naturella$/i, /,?\s+GP(?=[,\s]|$)/gu],
  [/^the english soap company$/i, /\s+ESC(?=\s|$)/gu],
  [/^rowenta$/i, /\s+нов(?=\s|$)/gu],
  [/^sisma$/i, /\s#?(?:[A-Z]\d[A-Z]{2}[- ]?\d{4}(?:[A-Z]\d{2})?|\d{3,4}(?:[A-Z]{1,2}|N-CV)|\d{4})(?=\s|$)/gu],
  [/^kent$/i, /\s\d{5}$/gu],
  [/^(?:hipp|ede)$/i, /(?<=\s)\d{5}(?=,)|^\s*\d{5}\s+(?=\p{L})/gu],
  [/^pantene$/i, /\s?\d+\/\d+\/\d+\s*$/gu],
];

export function cleanDisplayName(raw: string, opts: { perfume?: boolean; brand?: string } = {}): string {
  const spec = specSheetName(raw);
  if (spec) return spec;
  let s = ` ${raw.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").replace(/^[\s*#]+/, "").replace(/,(?=\p{L})/gu, ", ").replace(/\s+/g, " ").trim()} `;
  const brand = opts.brand ?? "";
  // Pantene's pack code is glued to the size: "360м6/40/6".
  if (/^pantene$/i.test(brand)) s = s.replace(/(\d)м(?=\d+\/\d+\/\d+)/gu, "$1 мл ");
  for (const [who, codes] of BRAND_CODES) if (who.test(brand)) s = ` ${s.trim().replace(codes, " ")} `;
  // Revlon writes its ColorStay line as "CS".
  if (/^revlon$/i.test(brand)) {
    s = s.replace(/(^|\s)CS(?=\s)/g, "$1ColorStay").replace(/(^|\s)SL(?=\s)/g, "$1Super Lustrous").replace(/\bCOM\s?\/\s?OIL SKIN\b/gi, "Combination/Oily Skin");
  }
  if (/^rowenta$/i.test(brand)) s = s.replace(/(\s)KL(?=\s|$)/g, "$1Karl Lagerfeld");
  for (const [re, to, already] of ABBREVIATIONS) {
    if (s.search(re) < 0) continue;
    // Drop the shorthand when the name spells the same thing out further on ("Елгидиум ЧЗ … четка за зъби").
    s = already && already.test(s.replace(re, "$1")) ? s.replace(re, "$1") : s.replace(re, to);
  }
  if (opts.perfume) {
    // La Rive and Dorall style set codes: "/EDT+DEO/", "/EDP+SG/", "/едт + део".
    const parts: Record<string, string> = { DEO: "дезодорант", SG: "душ гел", BL: "лосион за тяло", ASB: "афтършейв балсам", ASL: "афтършейв", ДЕО: "дезодорант" };
    const conc: Record<string, string> = { EDP: "EDP", EDT: "EDT", ЕДП: "EDP", ЕДТ: "EDT" };
    s = s.replace(
      /\/?\s*(?<![\p{L}])(EDP|EDT|ЕДП|ЕДТ)\s*\+\s*(DEO|SG|BL|ASB|ASL|ДЕО)(?![\p{L}])\s*\/?/giu,
      (_, a: string, b: string) => ` (${conc[a.toUpperCase()]} + ${parts[b.toUpperCase()]}) `,
    );
    // Dorall's set contents: "Д /пв + рол-он пф + лос + дг".
    s = s
      .replace(/(^|[\s,])[ДМ]\s?\/\s?пв(?=[\s+/]|$)/giu, "$1парфюмна вода")
      .replace(/(^|[\s,+])пв(?=[\s+/]|$)/giu, "$1парфюмна вода")
      .replace(/(^|[\s+])пф(?=[\s+/]|$)/giu, "$1парфюмиран")
      .replace(/(^|[\s+])лос(?=[\s+/]|$)/giu, "$1лосион за тяло")
      .replace(/(^|[\s+])дг(?=[\s+/]|$)/giu, "$1душ гел")
      .replace(/(^|[\s+])аш(?=[\s+/]|$)/giu, "$1афтършейв")
      .replace(/\s?\/\s*$/u, " ");
    // A gender letter after "комплект" ("комплект М (EDT + дезодорант)"), a slash before the concentration ("/EDP 30 мл").
    s = s.replace(/(комплект)\s+[МДMDHW](?=[\s(/]|$)/giu, "$1").replace(/\s\/\s?(?=EDP|EDT|ЕДП|ЕДТ|едп|едт)/gu, " ");
  }
  s = s
    // variant markers, promo markers and internal article numbers / codes
    .replace(/\|\s*различни (?:цветове|размери|видове|аромати)\s*-?\s*/giu, " ")
    .replace(/\(\s*промо\s*\)/giu, " ")
    .replace(/\(\s*пр\s?-?\s?\d+\s?%\s*\)/giu, " ")
    .replace(/\(\s*нова визия\s*\)/giu, " ")
    .replace(/\s?\/\s?джобен\b/giu, " ")
    .replace(/\s+само фф\s*$/iu, " ")
    .replace(/\sР\d{2}\s*$/u, " ")
    .replace(/^\s*(?:new|ново)\s+/iu, " ")
    .replace(/\(\s*new\s*\)/giu, " ")
    .replace(/\s+(?:ново|new)\s*$/iu, " ")
    .replace(/\s+\d{3,}!\s*$/u, " ")
    .replace(/!+\s*$/u, " ")
    .replace(/\s?\/?\s?(?:в|във) картонена (?:опаковка|кутия)\s*\/?/giu, " ")
    .replace(/^\s*промо(?:\s+(?=пакет|комплект))?\s+/iu, " ")
    .replace(/\s+промо\s*$/iu, " ")
    .replace(/\(\s*арт\.?\s*\d+\s*\)/giu, " ")
    .replace(/(^|\s|\/)\s?арт\.?\s*№?\s*\d+/giu, " ")
    .replace(/\(\s*\d{1,3}\s*\/\s*\d{2,4}\s*\)/g, " ")
    .replace(/\s?\/\s?\d{1,2}\.\d{3}\s*\/?/g, " ")
    .replace(/\s\/\s?\d{4,}\s*\/?/g, " ")
    .replace(/\/\d{4,}\/?\s*$/g, " ")
    .replace(/\s?\/\s?\d+\s?\/\s?[A-ZА-Я](?![\p{L}])\s*$/u, " ")
    .replace(/\s?\d+\s?(?:бр\.?|б)\s?\/\s?к(?![а-яё])/giu, " ")
    .replace(/\s?бр\.?\s?\/\s?(?:пак|оп)\.?/giu, " бр.")
    .replace(/\s?'\d{2}\s*$/u, " ")
    .replace(/\s\d{4}\s?-\s?\d{4}\s*$/g, " ")
    .replace(/(?<=\s)\d{6,}(?=[\s,]|$)/g, " ")
    .replace(/\s\d{6,}\s*$/g, " ")
    .replace(/\s[-–]\s?\d{5,}\s*$/g, " ")
    .replace(/\(\s*[A-ZА-Я]\d{3,}\s*\)/g, " ")
    .replace(/^\s*[CС]\d{4}\s+/u, " ")
    .replace(/^\s*(?!4711\b|1[89]\d\d\b|20\d\d\b)\d{4}\s+(?=\p{L})/u, " ")
    .replace(/^\s*0\d{4}\s+(?=\p{L})/u, " ")
    .replace(/\s\*\s?\d*\s/g, " ")
    .replace(/[*#®™]/g, " ")
    // children's ages: "3Г+" → "3+" (a weight before a "+" joining two products stays: "30 г + шампоан")
    .replace(/(?<![\d.,])([1-9]|1[0-2])\s?[гГ]\.?\+/gu, "$1+")
    // "Червило004" → "Червило 004"
    .replace(/(\p{Script=Cyrillic}{3,})(\d)/gu, "$1 $2")
    // units ("500мл.marshmallow" keeps a space after the unit)
    .replace(/(\d)\s*(?:ml|mL|ML|Ml|мл|МЛ|Мл|мЛ)(?![\p{L}])\.?/gu, "$1 мл ")
    .replace(/(\d)\s*(?:гр|ГР|Гр|gr|GR|g|G|г|Г)(?![\p{L}])\.?/gu, "$1 г ")
    .replace(/(\d)\s*(?:л|l|L)(?![\p{L}])\.?/gu, "$1 л ")
    .replace(/(\d)\s*(?:бр|БР|Бр|броя|pcs|PCS)(?![\p{L}])\.?/gu, "$1 бр. ")
    // "3x100 г" → "3 × 100 г"; "маска х10 бр." → "маска 10 бр." ("Relax 20 бр." keeps its x)
    .replace(/(\d)\s?[xх×]\s?(\d+(?:[.,]\d+)?)\s(мл|г|л|бр\.)/giu, "$1 × $2 $3")
    .replace(/(?<![\p{L}\p{N}])(?<!\d\s)[xх]\s?(\d+)\s(мл|г|бр\.)/gu, "$1 $2")
    // "White150 мл" → "White 150 мл"; codes after the size ("150 мл 33828") and promo tags ("250 мл NEW") go
    .replace(/(\p{Ll})(\d+ (?:мл|г|л|бр\.))/gu, "$1 $2")
    .replace(/(\d (?:мл|г|л|бр\.))\s+\d{4,}\s*$/u, "$1")
    .replace(/(?<=[\s\p{N}])(?:NEW|New)\s*$/u, " ")
    .replace(/\s-\p{L}{1,5}\s*$/u, " ")
    .replace(/\s+аковка\s*$/u, " ")
    .replace(/\s+(?:LF|LH|DH)\s*$/u, " ")
    .replace(/(\d)\s?%/g, "$1%")
    .replace(/(?<![\p{N}.,/-])(\d+)\s+\1(?![\p{N}.,/-])(?!\s?(?:мл|г|л|бр\.|×))/gu, "$1")
    .replace(/(\d)\s?в\s?1(?![\p{N}])/gu, "$1в1")
    .replace(/(\d)\s?цв\.?(?![\p{L}])/gu, "$1 цвята")
    .replace(/(\d)(цвята|дози|части|чифта)(?![\p{L}])/gu, "$1 $2")
    // "душ гел 400 мл+мист 100 мл" → "душ гел 400 мл + мист 100 мл"; a dash left where the brand stood goes
    .replace(/(?<=[\p{L}.])\s*\+\s*(?=\p{L})/gu, " + ")
    .replace(/\s[-–]\s*(?=\(|$)/g, " ")
    // the same lower-case word twice ("Гланц гланц"); names like "Кря Кря" are capitalised twice and stay
    .replace(/(?<![\p{L}])(\p{L}{3,})\s+(\p{Ll}{3,})(?![\p{L}])/gu, (m: string, a: string, b: string) => (a.toLowerCase() === b ? a : m))
    .replace(/\b(EDT|EDP)\s+\1\b/g, "$1")
    .replace(/(?<![\p{L}])(за|на|с|и)\s+\1(?![\p{L}])/giu, "$1");
  if (opts.perfume) {
    s = s
      .replace(/\b(EDP|EDT|EDC|edp|edt)\s*,?\s*(?:[DMWHДМ])(?=[\s,.)]|$)/gu, "$1")
      .replace(/,\s*(?:[DMWHДМ])\s*(?=[,(]|\s+(?:EDP|EDT|edp|edt|\d)|\s*$)/gu, " ")
      .replace(/\s(?:[DWHДМ])\s+(?=EDP|EDT|edp|edt)/gu, " ")
      .replace(/\b(?:edp)\b/g, "EDP")
      .replace(/\b(?:edt)\b/g, "EDT")
      .replace(/\s(?:W|M|D|H|Д|М|д|м)\s*$/u, " ");
  }
  // An unpaired double quote, doubled single quotes or a quote left at the end are clean-up leftovers.
  if ((s.match(/"/g) ?? []).length % 2 === 1) s = s.replace(/"/g, " ");
  s = s.replace(/''/g, " ").replace(/(\p{L})'\s*$/u, "$1").replace(/\s'\s*$/u, " ");
  if (!opts.perfume) s = s.replace(/^\s*[A-Z]\s+(?=[А-Я][а-я])/u, " ");
  s = s.replace(/\s*\?+\s*$/u, " ").replace(/(?<=\p{Ll}\s+|\d\s+)([ИСВ])(?=\s+\p{Ll})/gu, (m) => m.toLowerCase());
  // "Помада за вежди водоуст." → "водоустойчива": the adjective agrees with a feminine product word.
  s = s.replace(/(спирала|помада|очна линия|пудра|основа|база)((?:(?!молив)[^,])*?)водоустойчив(?![\p{L}])/giu, "$1$2водоустойчива");
  // A single consonant before the name ("Р Очна линия") is a leftover code.
  s = s.replace(/^\s*[БГДЖЗЛМНПРТФХЦЧШЩ]\s+(?=\p{Lu}|\d)/u, " ");
  // A stray capital letter after the size ("250 мл З").
  s = s.replace(/(\d (?:мл|г|л|бр\.))\s+[А-ЯA-Z]\s*$/u, "$1");
  // "No 305 коректор ..." (shade number first) → "коректор ..., No 305"
  const lead = s.match(/^\s*(No\.?\s?\d{1,4})\s+(\S.*)$/iu);
  if (lead) s = ` ${lead[2]}, ${lead[1]} `;
  s = tameCaps(s, isShouting(raw));
  s = s
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .replace(/,(?=[^\s\d])/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s-\s-\s/g, " - ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    // a single piece is not worth saying
    .replace(/[,\s]+1\s?бр\.?$/u, "")
    .replace(/^[\s,.;:\-–|/+!]+/u, "")
    .replace(/(?:[\s,;:\-–|/]|(?<!\d)\+)+$/u, "")
    .replace(/(?<!(?:^|[^\p{L}])(?:бр|ст))\.$/u, "")
    .trim();
  // Unbalanced brackets left by the clean-up.
  const open = (s.match(/\(/g) ?? []).length;
  const close = (s.match(/\)/g) ?? []).length;
  if (open > close) s = s.replace(/\s*\((?![^(]*\))[^(]*$/u, (m) => (m.length < 25 ? m.replace("(", "") : m));
  if (close > open) s = s.replace(/\)(?![^)]*\()/u, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
