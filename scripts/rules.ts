// Rules that pick the cosmetics out of the company-wide export and sort them into the shop's categories.
// The export's own categories are unreliable (lipsticks under "Printers & Ink", braces under "Perfumes"), so the
// subcategory comes from the product type named in the name: the type word that appears first wins
// ("Гъба за фон дьо тен" is a sponge, "Фон дьо тен с гъба" is a foundation). Perfume words win over everything
// ("Wanted Men Tonic Мъжка тоалетна вода" is a perfume, not a toner). Generic words ("маска", "серум", "балсам")
// are resolved with the rest of the name: "...за суха коса" makes a mask a hair mask.

export type CsvRow = {
  SKU: string;
  Name: string;
  EAN: string;
  Brand: string;
  Category: string;
  "Product Type": string;
  Inventory: string;
  Reserved: string;
  Status: string;
  Weight: string;
  Color: string;
  "Image URL": string;
  Created: string;
  Updated: string;
};

// JavaScript's \b only knows ASCII letters, so it never matches next to Cyrillic. rx() rewrites it Unicode-aware:
// a \b in front of a word becomes "no letter before", a \b after a word "no letter after" (cheap one-sided checks;
// a full two-sided boundary made the big alternations below slow). Compiled patterns are cached.
const LEAD = "(?<![\\p{L}\\p{N}])";
const TRAIL = "(?![\\p{L}\\p{N}])";
const compiled = new Map<string, RegExp>();
export function rx(source: string, flags = "iu"): RegExp {
  const key = `${flags}/${source}`;
  const hit = compiled.get(key);
  if (hit) return hit;
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\" && source[i + 1] === "b") {
      const next = source.slice(i + 2, i + 5);
      // Before a letter it starts a word; before a class or group it ends one when it follows a word or a group
      // ("мл)\b[^+]") and starts one otherwise ("\b[bc]c", ".*\b(?:лице|кожа)").
      const lead = /^[\p{L}\p{N}]/u.test(next)
        ? true
        : /^\[|^\((?!\?[=!<])|^\\[pdw]/.test(next)
          ? !/[\p{L}\p{N})\]]/u.test(out.slice(-1))
          : false;
      out += lead ? LEAD : TRAIL;
      i++;
      continue;
    }
    if (ch === "\\") {
      out += ch + (source[i + 1] ?? "");
      i++;
      continue;
    }
    out += ch;
  }
  const re = new RegExp(out, flags);
  compiled.set(key, re);
  return re;
}
const any = (parts: string[]) => rx(parts.join("|"));

// ── Which rows are cosmetics ──

/** Export categories that hold cosmetics (plus many misfiled rows, which the name rules sort out). */
export const COSMETIC_SOURCE = rx(
  "cosmet|make-?up|skin ?care|skincare|hair|perfum|fragranc|oral care|feminine|nail|lip ?gloss|козм|косм|колони и|парфюм|лак за нокти|червило|грижа|тоалетни води|боя за коса|боядисване|шампоан|сенки|спирала|фон дьо тен|балсам|маска за коса|дезодорант|хигиен|eau de|bath|body|beauty|пудра|руж|къна|плажна|крем за|серум|тоник|душ гел|сапун|глицерин|eye makeup|men's grooming|shaving|aftershave|deodorant|sunscreen|лакочистител|интимна",
);
/** Export categories with some cosmetics among other goods: a row needs an unmistakable cosmetics name. */
export const MIXED_SOURCE = rx(
  "^$|^other$|health|supplement|baby feeding|baby gear|майка и бебе|пособия и подаръци(?! > ученически)|gift|home & garden|за дома|food|cleaning|pack - other|kids|toys & games|играчки|бебе|personal care",
);
/** Names that are cosmetics beyond doubt. Rows from the mixed categories must contain one of these. */
export const UNMISTAKABLE = rx(
  [
    "шампоан", "shampoo", "балсам за (?:\\p{L}+ )?коса", "кондиционер", "conditioner", "маска за (?:\\p{L}+ )?коса", "hair mask", "серум за коса",
    "олио за коса", "масло за коса", "боя за коса", "hair colou?r", "лак за коса", "гел за коса", "пяна за коса", "спрей за коса", "сешоар",
    "преса за коса", "маша за коса", "изправител", "крем за лице", "дневен(?: \\p{L}+)? крем", "нощен(?: \\p{L}+)? крем", "серум", "околоо",
    "крем за очи", "мицелар", "тоник за лице", "пяна за лице", "гел за лице", "шийт маска", "sheet mask", "маска за лице", "face (?:mask|cream)",
    "eye cream", "ампул", "душ гел", "душ-гел", "shower gel", "лосион за тяло", "мляко за тяло", "крем за тяло", "body (?:lotion|oil|butter|mist|scrub)",
    "масло за тяло", "олио за тяло", "скраб", "крем за ръце", "hand cream", "крем за (?:крака|пети)", "за пети", "дезодорант", "deodorant",
    "антиперспирант", "рол-он", "\\bдео\\b", "сапун", "\\bsoap\\b", "соли за вана", "пяна за вана", "слънцезащит", "sunscreen", "\\bspf ?\\d",
    "след слънце", "автобронзант", "фон дьо тен", "\\bfoundation\\b", "коректор", "concealer", "пудра", "\\bруж\\b", "хайлайтър", "бронзант",
    "спирала за мигли", "mascara", "очна линия", "eyeliner", "молив за (?:очи|устни|вежди)", "сенки за очи", "eyeshadow", "червило", "lipstick",
    "гланц за устни", "lip gloss", "балсам за устни", "lip balm", "изкуствени мигли", "праймър", "лак за нокти", "nail polish", "гел лак",
    "лакочистител", "пила за (?:нокти|пети)", "ножичк\\p{L}* за нокти", "нокторезачк", "масло за нокти", "кожички", "парфюм", "тоалетна вода",
    "парфюмна вода", "\\bedp\\b", "\\bedt\\b", "eau de", "одеколон", "боди мист", "мист за тяло", "самобръсначк", "ножчета за бръснене",
    "пяна за бръснене", "гел за бръснене", "афтършейв", "after ?shave", "за брада", "\\bbeard\\b", "тример", "епилатор", "депилат", "восъчни ленти",
    "паста за зъби", "toothpaste", "четка за зъби", "toothbrush", "вода за уста", "mouthwash", "конец за зъби", "интердентал", "превръзки",
    "тампони", "интимен", "интимна", "мокри кърп", "влажни кърп", "бебешки кърп", "памучни", "клечки за уши", "четка за коса", "гребен", "шнол",
    "фиби", "ластици за коса", "четка за грим", "гъба за грим", "beauty blender", "пинсета", "козметичен несесер", "несесер за (?:грим|козметика)",
    "етерично масло", "масажно масло", "вазелин", "крем-сапун", "лосион", "козметичен комплект", "подаръчен комплект",
  ].join("|"),
);
/** Words that make a row from a mixed category something else (toys, food, clothes, bedding, gadgets). */
export const MIXED_NOT = rx(
  "\\bигр(?:а|и|ачк)|студио|творчески|направи си сам|кукл|фигур|ателие|трактор|колело|топка|стрел|шнорхел|бебешка шапка|лятна шапка|плажна шапка|зимна шапка|детска шапка|шал\\b|блузк|бермуди|тениск|рокл|панталон|яке\\b|обувк|ботуш|^ (?:\\p{L}+ ){0,2}чорап|матрак|чаршаф|възглав|одеяло|фолио|пюре|каша|десерт|адаптирано|сладкиш|чипс|бисквит|напитка|\\bсок\\b|мляно кафе|кафе на зърна|разтворимо кафе|кафе на прах|билков чай|чай за пиене|капсул|таблет|колаген на прах|ice cream|кейс|калъф|iphone|ipad|galaxy|macbook|лаптоп|телефон|часовник|папка|тетрад|^ [^,]{0,15}\\bраница|магнит|ключодърж|играчк|пъзел|конструктор|пластилин|рамка за|картина|рисуван|оцветяв|lint|мъх от дрехи|процесор|почистващ препарат|за под\\b(?! очи)|wc\\b|тоалетна чиния|кухн|посуд|тиган|чиния|(?<!менструална )чаша|^ бутилка|шише|термо (?:чорап|бельо|чаша|бутилка|кана)|термос|столче|количка|кошара|легло|памперс|(?<!смяна на )пелен|пчелно млечице(?=.*(?:ампули|\\bmg\\b|мг))|прополисова тинктура|есенция (?:\\p{L}+ ){0,3}№|капки\\b(?=.*есенция)",
);
/** Appliance categories: only hair, shaving, epilation and oral-care devices are taken from them. */
const APPLIANCE_SOURCE = rx("home appliances|малки електроуреди|kitchen|power|phones|storage");
const DEVICE = rx(
  "сешоар|hair ?dryer|преса за коса|изправител|straightener|маша за (?:коса|къдрене)|curling|стилизиращ уред|четка[- ]сешоар|airstyler|air styler|hot air brush|епилатор|epilator|самобръсначка|shaver|тример|trimmer|машинка за подстригване|hair ?clipper|електрическа четка за зъби|звукочестотна|иригатор|irrigator|накрайници за (?:ел|електрическа)|\\bipl\\b|уред за почистване на лицето|почистваща четка за лице",
);

export type Rejection = "inactive" | "pack" | "no-image" | "not-cosmetic" | "excluded" | "unclassified";

/** Never cosmetics, wherever the word appears in the name. */
export const ALWAYS_EXCLUDE = any([
  "феромон", "презерватив", "лубрикант", "вибратор", "\\beye of love\\b", "хранителна добавка", "\\bкапсули\\b", "\\bкапс\\.",
  "\\bтаблетки\\b(?! за (?:протези|плака|оцветяване|свеж дъх))", "\\bсироп\\b", "за кучета", "за котки", "\\bкуче", "\\bкотк[аи]\\b", "за домашни любимци",
  "\\bpet\\b", "мебел", "освежител за", "ароматизатор\\b(?! за коса)", "\\bсвещ", "\\bcandle", "дифузер",
  "ароматни пръчици", "перилен", "омекотител", "за пране", "за съдове", "съдомиялн", "\\bринсър", "\\bsomat\\b", "препарат за",
  "почистващ препарат", "дезинфектант", "за под\\b", "тоалетна хартия", "салфетки", "кухненска ролка", "\\bzewa", "\\btena\\b",
  "\\blibero\\b", "\\bpampers\\b", "(?<!смяна на )\\bпелени\\b", "инконтиненц", "урологичн", "подложки за легло", "ортез", "налакътник", "наколенк",
  "бандаж", "яка за шия", "медицински текстил", "\\bmedtextile\\b", "тест за бременност", "овулац", "термометър", "инхалатор",
  "аспиратор", "биберон", "залъгалк", "шише за хранене", "четка за шише", "четка за биберон", "ученическ", "тетрадк", "химикал",
  "флумастери", "\\bпастели\\b", "акварел", "пластилин", "слайм", "гоблен", "диамантено рисуване", "диамантен гоблен", "^ [^,]{0,15}\\bраница", "чанта за лаптоп",
  "розетк", "\\bшуко\\b", "\\bкабел", "сапунени (?:балони|мехури)", "\\bбалон", "конфети", "\\bкостюм", "\\bпарти\\b",
  "карнавал", "боя за лице", "face paint", "татуировки за деца", "временни татуировки", "кукла", "играчк", "\\bпъзел",
  "(?<!крака и )\\bобувки\\b", "чорапогащ", "^ (?:\\p{L}+ ){0,2}чорап", "маска за сън",
  "наочници", "тапи за уши", "\\bquies\\b", "кърпа за баня", "хавлия", "\\bхалат", "\\bбельо", "чехли", "билков чай", "чай за пиене", "чай в пакетчета", "насипен чай", "кафе на зърна",
  "бонбони", "дезодорант за (?:обувки|хладилник|кола)", "бой[ао] за (?:текстил|обувки|стени|дърво)",
  "лак за (?:дърво|мебели|паркет)", "стикер(?:и)? за (?:лаптоп|телефон)", "^ (?:\\p{L}+ )?калъф", "калъф за (?:телефон|кошче|таблет|лаптоп|очила)", "протектор за (?:екран|телефон|дисплей|камера)", "^ (?:\\p{L}+ )?зарядн", "молив hb",
  "графитен молив", "моливи за рисуване", "цветни моливи", "несесер с пособия", "pencil box", "\\d+ листа\\b",
  "за лечение на (?:херпес|гъбични|микози|инфекции|рани|изгаряния|хемороиди|брадавици)", "гъбични инфекции", "микоз", "лекарств", "\\bканестен", "\\bбатрафен", "антимикот", "\\bкомари", "кърлеж",
  "репелент", "\\brepellent", "домакинска", "барбекю", "\\bscrub daddy\\b", "дрънкалк", "^ вана\\b", "вана за бебе",
  "столче", "за кола\\b", "очила", "говежди колаген", "колаген на прах", "хидролизиран колаген(?=.*(?:прах|капсул|таблет|грама|дози|напитка))", "протеинова вафла", "протеинов бар", "protein (?:blend|bar|ice cream|powder)", "казеин", "\\bcasein\\b", "\\bwhey\\b",
  "шейкър", "\\bshaker\\b", "^ бутилка", "термос", "(?<!менструална )\\bчаша\\b", "\\bканцеларск", "\\bкаишка",
  "(?<!uv )(?<!led )\\bлампа\\b(?! за нокти)", "крушк", "\\bпрахосмукач", "\\bтиган", "\\bтенджер", "чайник", "кафемашин",
  "грим за лице и тяло за деца", "\\bмодел за прически", "кукла за прически", "\\bsparkle girlz\\b", "куфарче за оцветяване",
  "\\bpusheen\\b", "\\bapple watch\\b", "\\bbeoplay\\b", "сешоар за ръце", "термолепенк", "мистериозна капсула", "стерилни компреси", "марлени компреси", "компрес марл", "\\bкомпреси\\b",
  "освежител", "\\blego\\b", "ключодържател", "балсамов оцет", "винен оцет", "дресинг", "глюкомер", "фризьорски салон", "термоетикет", "\\bdragee|дражета",
  "\\bgummies\\b", "желирани бонбони", "матрак", "чаршаф", "алуминиево фолио", "опаковъчно фолио",
  "\\bкейс\\b", "\\biphone\\b", "\\bipad\\b", "\\bmacbook\\b", "\\bgalaxy s\\d", "fish oil", "pre-?workout", "креатин", "creatine",
  "\\beaa\\b", "\\bbcaa\\b", "isotonic", "protein ice cream", "адаптирано мляко", "\\bпюре\\b", "овесена каша",
  "\\bчипс\\b", "детски шал", "\\bблузк", "\\bбермуди", "ръкавици за фитнес", "\\blint remover", "мъх от дрехи", "\\bпроцесор",
  "студио за (?:красота|маникюр)", "творчески комплект", "направи си сам", "образователна игра", "\\bпапка\\b", "шише за сок",
  "пчелно млечице(?=.*(?:ампули|\\bmg\\b|мг|капсул|таблет))", "\\bшнорхел", "плажна топка", "\\bтрактор", "детско колело", "орехотрошачка", "органайзер", "поставка за",
  "wc комплект", "\\bwc\\b", "чорапогащник", "стелки", "кутия за бижута", "музикална кутия", "детска ножица", "\\bгривни\\b",
  "вагинален", "дезинфекц", "при болки в", "есенция (?:\\p{L}+ ){0,3}№", "chalk", "\\bbiotech\\b", "мляко на прах",
  "\\bнапитка", "\\bдъвки\\b", "био масло от шафранка", "масло от прасковени ядки", "растително масло от копайба", "virgin coconut oil",
  // Food (the export files nut spreads, biscuits and icing sugar under skin care and make-up)
  "\\bбисквити\\b", "\\bбиск\\.", "\\bleibniz\\b", "\\bвафл(?:и|ена)\\b", "\\bвафла с", "крем за мазане", "(?:лешников|какаов|фъстъчен|шоколадов|бадемов|ядков|сусамов|протеинов) крем",
  "\\bкрем (?:какао|лешник)", "крем от шам ?фъстък", "пудра захар", "за овкусяване", "кулинари", "за хранителни цели", "мурсалски чай", "сок от нар",
  "\\bкето\\b", "крем с лешници", "protein (?:cream|wafer|spread)", "coconut oil refined", "в зехтин\\b", "beet root powder", "протеин пудра", "за поръсване",
  // Food supplements (drinkable ampoules, tablets, tonics)
  "ампули за пиене", "\\bза пиене\\b", "(?:\\bmg\\b|\\bмг\\b)[^,]*ампул", "ампул[^,]*(?:\\bmg\\b|\\bмг\\b)", "\\btabs\\b", "\\btablets\\b", "еферв",
  "l-carnitine", "л-карнитин", "морски магнезий", "магнезиум", "течно желязо", "течен хром", "витамин c fast", "витамин [cс] 500", "spirulysat",
  "прополис \\+", "ретавитрол", "миелооптик", "бонген", "артилейн", "цитровакс", "tonimel", "peau nette", "апибиотик", "hyalurgen",
  "колаген морски ампули", "хидро колаген", "детокс ампули", "пробиотик за здраве", "витал тоник", "хлорофил, капки", "очния нерв", "щитовидн",
  "ампули (?:за|при) (?:\\p{L}+ ){0,3}(?:стави|памет|имунитет|кости|зрение|нервна|енергия|концентрация)", "имунитет.{0,40}(?:ампул|капки|дози)",
  "(?:ампул|капки|дози).{0,40}имунитет", "жлъчка", "черния дроб", "кръвообразуване", "лутеин",
  // Medicines and medical devices
  "хемороид", "анални фисури", "проктит", "кашлица", "рол-он при главоболие", "уримил", "менструални болки", "затоплящ пластир",
  "фиксираща лента", "(?:мускулни|ставни) (?:и (?:мускулни|ставни) )?болки", "болки и възпаления", "при болки", "рани и изгаряния", "крем за рани",
  "стерилни превръзки", "превръзки за рани", "\\bовули\\b", "въшки", "гниди", "спрей за нос", "(?:спрей|капки) за носа\\b", "носните пътища",
  "носната (?:лигавица|кухина)", "назал", "изотоник", "хипертони", "запушен нос", "коректор за зърна", "брадавици", "крем при херпес",
  "крем при гъбички", "клотримазол", "екзотербин", "фунгофин", "цеумед", "лечебен лак", "(?:след|против|при) ухапван", "ухапван\\p{L}* от", "насекоми", "алергозан", "ригенома", "дермазин",
  "кадермин", "\\bcrilen\\b", "виприн", "силбен", "алгезал", "капси 3", "цетилар", "рефригеранс", "arthrostop", "верналин", "тусинат", "цикатридина", "md-neck", "имуностимулатор",
  // Household cleaning, home and bath hardware
  "прозорци", "паркет", "\\bламинат\\b", "теракота", "гранитогрес", "табла на автомобил", "кожени изделия", "за стъкло\\b", "почистване на баня",
  "\\bмоп\\b", "стъкла и огледала", "за стъкла\\b", "белина", "за пералня", "сапун на прах", "почистващ прах", "почистващо средство", "керамични печки", "килими", "стоманена вълна",
  "нитрилни", "дезодорант за тъкани", "за дома и дрехите", "сапун за петна", "сапунени орехчета", "дозатор за (?:течен )?сапун", "диспенсър за сапун",
  "сензорен диспенсър", "кана за изплакване",
  // Electronics, car, sport and tools
  "външна батерия", "power bank", "\\bmah\\b", "air conditioner", "климатик", "\\bgardena\\b", "за трева\\b", "\\bовлажнител\\b(?! за)",
  "нагревател за мокри", "седалка за кола", "\\bisofix\\b", "маска силиконова", "поликарбонат", "темперирано стъкло", "за (?:голям|малък) нож",
  "ремонтни дейности", "antistatic curved tweezer",
  // Baby feeding gear and textiles
  "подаръчен комплект за новородено", "подаръчен комплект (?:chicco|nuk)\\b", "освежаващ и защитен", "natural feeling", "first choice", "perfect start", "памучни (?:носни )?кърпи\\b", "капак за (?:бебешки )?мокри",
  // Stationery
  "коректор(?:на|ен)? лента", "коректор писалка", "коректор за писалки", "рефил за коректор", "пълнител за коректор", "\\bролер\\b.{0,20}коректор",
  "коректор, с четка", "водна основа, дисплей", "\\bmaped\\b", "\\bcarioca\\b",
  // Toys and novelty gifts
  "\\bplaymobil\\b", "\\bmajorette\\b", "направи (?:\\p{L}+ )?сапун", "галактически сапуни", "лаборатория за сапуни", "желирани сапуни", "science play",
  "фризьорск\\p{L}* (?:колан|куфарче|комплект)", "куфарче (?:\\p{L}+ )?със сешоар", "\\bgirlz\\b", "печати с тампони", "скрабъл", "луксозна картичка",
  "дневник", "\\bjerrycan\\b", "за домашен любимец", "строителни машинки", "колички", "\\bщора", "изтрелвачка", "меки стрели", "гума[^,]*за изтриване",
  "за сетивата",
  // Adult products (the sex shop's range is sold in the 18+ shop)
  "ерекци", "възбужд", "пенис", "мастурб", "клитор", "анален", "задържащ серум", "интимен душ\\b(?![- ]гел)", "интимна помпа", "дилдо", "after sex",
  "gay bar", "за бюст и дупе", "за поддръжка на реалистични", "пудра за поддръжка", "\\blubricant\\b",
  // Sports nutrition, drinkable ampoules, pharmacy products, toys, textiles and trade displays found by the second review
  "cream of rice", "\\bgainer\\b", "\\btrunk\\b", "\\bhoyer\\b", "ампули за нос", "промивк", "амбинор", "физическа умора", "банеоцин", "кетодерм", "кетоконазол", "разноцветен лишей",
  "\\bпроктен\\b", "банивал", "физиологичен разтвор", "инхалац", "инхалиране", "вискофлу", "бронхит", "podologic medical", "гъбични симптоми",
  "онихолиза", "медицинско изделие", "капитикс", "our generation", "\\bbattat\\b", "за дрехи", "за тъкани", "кенгуру", "\\bдисплей\\b(?=.{0,12}(?:\\d+\\s?(?:бр|пр)|тест))",
  "кърп\\p{L}*.{0,40}\\d+\\s?[xх]\\s?\\d+\\s?см",
  // Found by the third review: pest control, cleaning vinegar, electrical fittings, protective masks, a massage gadget, a toy,
  // medicines (strength in mg per gram) and a hormone cream
  "(?:против|п ?/ ?в) (?:мравки|хлебарки|молци|гризачи)", "\\bбял оцет\\b", "оцет \\d+ ?%", "варовик", "\\blegrand\\b", "\\bceliane\\b", "единична рамка",
  "nanohedron", "omniguard", "\\bffp[123]\\b", "\\bkn95\\b", "smart ?goo?gles", "(?<!calvin )\\bklein\\b", "\\d+\\s?(?:мг|mg)\\s?/\\s?(?:г|g)\\b",
  "афламил", "aflamil", "розакта", "rosacta", "перметрин", "permethrin", "вагизан\\p{L}* (?:\\p{L}+ ){0,2}крем", "vagisan\\p{L}* (?:feucht)?cre",
  "прегненолон", "pregnenolone", "прогестерон",
]);

/** Brands of school supplies, toys, home goods and supplements whose rows only look like cosmetics. */
const NOT_COSMETIC_BRANDS = new Set([
  "silver",
  "coolpack", "cool pack", "astra", "ars una", "herlitz", "kstationery", "colorino", "unkeeper", "miss lemonade", "santoro",
  "santoro gorjuss", "head", "derform", "diamond dotz", "revell", "lemax", "blomus", "brabantia", "medtextile", "hartmann",
  "bic", "faber-castell", "maped", "pixie crew", "cerda", "kids", "projektetplix", "barkin & meowson", "eye of love",
  "natural factors", "solgar", "born winner", "allnutrition", "nutrend", "ostrovit", "haya labs", "smartshake",
  "swedish nutra", "mitama", "graffiti", "lizzy card", "satch", "bambino casa", "beaba", "scrub daddy", "wenko", "zenner",
  "apli", "st.majewski", "kikkaboo", "амек тойс", "sparkle girlz", "rabalux", "gepa", "sportsheets", "beoplay", "fascino",
  "golden lady", "sky", "canpol", "canpol babies", "tommee tippee", "avent", "philips avent", "lorelli", "chipolino",
  "grupo erik editores s.l.", "disney stitch", "bros", "pompea", "lego", "topgal", "victorias journals", "victoria's journals",
  "ascensia diabetes care", "mantova", "peak", "profissimo", "general fresh", "phi essences", "fehnnatur", "ttoys", "sensillo",
  "baby matex", "craze", "esr", "spigen", "4smarts", "samsung", "xiaomi", "jip", "nerthus", "caran d'ache", "septona", "denkmit",
  "gymbeam", "kevin levrone", "kfd nutrition", "vemoherb", "trec nutrition", "natumi", "borola", "bama", "harbinger", "playshoes",
  "dickie", "floss and rock", "sophie la girafe", "maped", "gepa", "biotech usa",
  // toys
  "playmobil", "simba toys", "spin master", "ses", "goki", "tiny love", "clementoni", "mikamax", "hape", "fisher price", "fisher-price", "barbie",
  "bburago", "toi-toys", "rock star baby", "nboutique", "seven", "mattel", "hasbro", "vtech",
  // stationery
  "deli", "plus", "pentel", "uhu", "carioca", "tipp-ex", "uni", "lamy",
  // household, home and electronics
  "astonish", "cif", "swiffer", "vortex", "poliboy", "poliboy brandt & walther gmbh", "brand & walter gmbh", "casablanca", "arkadi", "heitmann",
  "emsal", "umbra", "tork", "munchkin", "dooky", "lionelo", "lanaform", "platinet", "richmond and finch", "cameron sino", "ecoflow", "victorinox",
  "relife", "gefu", "stk", "ekomet - 90",
  // food and supplements
  "protella", "nanosupps", "pural", "biogo", "mogli", "zuger", "sotto le stelle", "sottolestelle", "violife", "sukrin", "bio planet", "fresubin",
  "aromandise", "algosource", "lecovita", "bongen", "doppelherz", "doppelherz aktiv", "pure nutrition", "diet food", "sisinni",
  "nef de santé", "sfd", "tonika", "nature’s way", "nature's way", "alive", "retavitrol", "autan", "mielooptik", "hyalurgen", "biovita", "apibiotic",
  "arthiline", "phyto wave", "nat&form", "dietaroma", "vegavero", "amos vital gmbh", "best body nutrition", "hoyer", "esn",
  // medicines
  "procten", "neofitoroid", "procto glyvenol", "dermazin", "kadermin", "silben", "algesal suractive", "acic", "clotrimazole abr", "zentiva",
  "polpharma", "refrigerans", "tussinat", "sandoz", "vernalin", "proenzi", "rigenoma", "allergosan", "pediakid",
  "parasidose express", "hygia", "fungofin", "polinail", "guna", "biopharm", "paladin pharma", "marimer", "naso libero", "sterimar", "tonimer", "delmar",
  "ambinor", "baneocin", "ketoderm", "viscoflu", "cavisept",
  // found by the second review
  "hi pando", "bebetto", "trace minerals", "trained by jp", "chaos crew", "everbuild", "our generation", "battat",
]);
/** Brands of the sex shop's range (the same list the 18+ shop is built from), plus a few more seen in the export. */
const ADULT_BRANDS = new Set([
  "ouch!", "ns novelties", "california exotic", "california exotics", "pipedream", "dream toys", "tenga", "you 2 toys", "you2toys", "satisfyer",
  "blush", "hidden desire", "system jo", "cottelli collection", "guilty pleasure", "loveline", "toyjoy", "toyjoy classics", "shots toys", "shots",
  "fun factory", "dolphi", "calvin's condoms", "pjur", "xr brands", "doc johnson", "femmefunn", "femmefun / la nua", "wicked", "xocoon", "dorcel",
  "b-vibe", "strap on me", "orgie", "just glide", "mixgliss", "sportsheets", "joydivision", "curve toys", "la nua", "buttr", "jimmyjane",
  "love to love", "pillow talk", "svakom", "lovense", "leg avenue", "obsessive", "baci", "eye of love", "le desir", "rene rofe", "kinky diva",
  "magic motion", "sexwell", "little genie productions", "spencer fleetwood", "sevencreations", "autoblow", "fetish collection", "ann devine",
  "bad kitty", "taboom", "zero tolerance", "mister b", "my.size", "nature skin", "private", "selopa", "anos", "boo", "eropharm", "penisxxl",
  "stimul8 s8", "sex and mischief", "intimate health",
]);
/** Pictures hosted by the sex shop: those rows belong to the 18+ shop, whatever their name says. */
const ADULT_IMAGE_HOST = /(^|\/\/|\.)sexwellshop\.com\//i;

/** Brand column values (or resolved brands) of goods that only look like cosmetics. */
export function notCosmeticBrand(brand: string): boolean {
  const b = fixMixedScript(decodeEntities(brand)).trim().toLowerCase();
  return NOT_COSMETIC_BRANDS.has(b) || ADULT_BRANDS.has(b);
}

export function selectRow(r: CsvRow): Rejection | null {
  if (r.Status !== "Active") return "inactive";
  const name = r.Name ?? "";
  if (r["Product Type"] === "pack" || /^pack\b/i.test(name) || /^\d+\s*[xх]\s/i.test(name) || /^\d+x/i.test(r.SKU)) return "pack";
  if (!imageUrl(r)) return "no-image";
  const source = (r.Category ?? "").trim();
  const text = matchText(name);
  if (APPLIANCE_SOURCE.test(source)) {
    if (!DEVICE.test(text)) return "not-cosmetic";
  } else if (!COSMETIC_SOURCE.test(source)) {
    if (!MIXED_SOURCE.test(source)) return "not-cosmetic";
    if (!UNMISTAKABLE.test(text) || MIXED_NOT.test(text)) return "not-cosmetic";
  }
  if (notCosmeticBrand(r.Brand ?? "") || ADULT_IMAGE_HOST.test(r["Image URL"] ?? "")) return "excluded";
  if (ALWAYS_EXCLUDE.test(text)) return "excluded";
  return null;
}

/** The export joins several pictures with "$$$". The first valid http(s) URL is used. */
export function imageUrl(r: CsvRow): string | null {
  for (const part of (r["Image URL"] ?? "").split("$$$")) {
    const u = part.trim();
    if (/^https?:\/\/[^\s"']+$/i.test(u)) return u.replace(/^http:\/\//i, "https://");
  }
  return null;
}

// ── Text used for matching ──

const EXPAND: [RegExp, string][] = [
  [rx("\\bфдт\\b"), "фон дьо тен"],
  [rx("\\bfdt\\b"), "фон дьо тен"],
  [rx("\\bш-?н\\b\\.?"), "шампоан"],
  [rx("\\bшн\\b"), "шампоан"],
  [rx("\\bб-м\\b\\.?"), "балсам"],
  // Aroma writes its hair conditioners "Бм Арома …"; on body sets "БМ 85 мл + БЛ 90 мл" is body mist and body lotion.
  [rx("\\bбм\\b(?=\\s(?:арома|aroma))"), "балсам за коса"],
  [rx("\\bбм\\s?(?=\\d)"), "боди мист "],
  [rx("\\bбл\\s?(?=\\d)"), "лосион за тяло "],
  [rx("\\bпк\\b"), "подаръчен комплект"],
  [rx("\\bтв\\s?(?=\\d)"), "тоалетна вода "],
  [rx("\\bдч ?/ ?з\\b"), "детска четка за зъби"],
  [rx("\\bч ?/ ?з\\b"), "четка за зъби"],
  [rx("\\bву\\b"), "вода за уста"],
  [rx("\\bчетказа\\b"), "четка за"],
  [rx("\\bкрем ?/ ?бръсн\\.?\\s?"), "крем за бръснене "],
  [rx("\\bбръсн\\.\\s?"), "бръснене "],
  [rx("\\bпр\\.\\s?(?=сенки|торбички|бръчки|пърхот|косопад|акне|пъпки|целулит|стрии|изпотяване|несъвършенства)"), "против "],
  [rx("\\bтониз\\.\\s?"), "тонизиращо "],
  [rx("\\bдг\\b"), "душ гел"],
  [rx("\\bбк\\b"), "боя за коса"],
  [rx("\\bчз\\b"), "четка за зъби"],
  [rx("\\bк-т\\b"), "комплект"],
  [rx("\\b(?:к-)?кт\\b"), "комплект"],
  [rx("\\bпв\\b"), "парфюмна вода"],
  [rx("\\bк\\s?/\\s?т\\b"), "комплект"],
  [rx("\\bс-ма\\b"), "система"],
  [rx("\\bм-ка\\b"), "маска"],
  [rx("\\bд-т\\b"), "дезодорант"],
  [rx("\\bтеч\\."), "течен "],
  [rx("\\bел\\.\\s?(?=четка)"), "електрическа "],
  [rx("\\bп/в\\b"), "против"],
  [rx("\\bмиц\\."), "мицеларна "],
  [rx("\\bпам\\.\\s?"), "памучна "],
  [rx("\\bдн\\.\\s?кр\\.?"), "дневен крем "],
  [rx("\\bнощ\\.\\s?кр\\.?"), "нощен крем "],
  [rx("\\bпоч\\.\\s?лос\\.?"), "почистващ лосион "],
  [rx("\\bкр\\.\\s?без отмив\\.?"), "крем без отмиване "],
  [rx("\\bкр\\.(?=\\s)"), "крем"],
  [rx("\\bежедн\\."), "ежедневни "],
  [rx("\\bакс\\.\\s?"), "аксесоар "],
  [rx("\\bм\\.\\s?рол\\b"), "мъжки рол-он"],
  [rx("\\bрек\\.\\s?ст\\."), "rexona стик "],
  [rx("\\bспр\\.\\s?бели кор\\."), "спрей за бели корени"],
  [rx("\\bпарф\\b\\.?"), "парфюм"],
  [rx("\\bодт\\b"), "тоалетна вода"],
  [rx("\\bмтв\\b"), "мъжка тоалетна вода"],
  [rx("\\bдтв\\b"), "дамска тоалетна вода"],
  [rx("\\bмпв\\b"), "мъжка парфюмна вода"],
  [rx("\\bдпв\\b"), "дамска парфюмна вода"],
  [rx("(?<=(?:дамска|мъжка|унисекс) )тв\\b"), "тоалетна вода"],
  [rx("\\bодп\\b"), "парфюмна вода"],
  [rx("\\bедт\\b"), "edt"],
  [rx("\\bедп\\b"), "edp"],
  [rx("\\bmny\\b"), "maybelline"],
  [/душ-?гел/gu, "душ гел"],
  [/рол-? ?он/gu, "рол-он"],
  [/шампаоан|шампуан/gu, "шампоан"],
  [rx("\\bд[еe][оo]\\b"), "део"],
  [rx("\\bглос\\b"), "гланц"],
  [rx("\\bk\\s?/\\s?t\\b"), "комплект"],
  [rx("\\bпочист\\."), "почистващ "],
  [rx("\\bпремахв\\b\\.?"), "премахване на"],
  [rx("\\bспир\\."), "спирала "],
  [/мицерал/gu, "мицелар"],
  [/афтър ?шейв/gu, "афтършейв"],
  [/душ ?крем/gu, "душ крем"],
];

const EXPAND_GLOBAL: [RegExp, string][] = EXPAND.map(([re, to]) => [new RegExp(re.source, "giu"), to]);

/** Lower case, one alphabet per word, abbreviations written out. Padded with spaces. */
export function matchText(name: string): string {
  let t = ` ${fixMixedScript(decodeEntities(name)).toLowerCase().replace(/ё/g, "е")} `;
  t = t
    .replace(/(?<!spf\s?\d*)(\d),(\d)/g, "$1.$2")
    .replace(/(?<=(?:^|,|\p{L}{2})\s)(?<![\s\d](?:in|en)\s)([12]) (\d{3})(?=\s?(?:г|гр|g|мл|ml)(?![\p{L}]))/gu, "$1$2")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[“”„"«»]/g, " ")
    .replace(/[|+&,;()[\]{}]/g, " $& ")
    .replace(/(\p{L})\/(\p{L})/gu, "$1 / $2");
  for (const [re, to] of EXPAND_GLOBAL) t = t.replace(re, to);
  t = t.replace(/\s+/g, " ");
  return ` ${t.trim()} `;
}

/** Accented letters the export lost ("Lanc?me"). */
const LOST_ACCENTS: [RegExp, string][] = [
  [/Lanc\?me/g, "Lancôme"], [/LANC\?ME/g, "LANCÔME"], [/HERM\?S/g, "HERMÈS"], [/Herm\?s/g, "Hermès"], [/Cr\?me/g, "Crème"],
  [/CR\?ME/g, "CRÈME"], [/Courr\?ges/g, "Courrèges"], [/(^|\s)\? de Lancôme/g, "$1Ô de Lancôme"],
];

export function decodeEntities(s: string): string {
  let out = s
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "");
  if (out.includes("?")) for (const [re, to] of LOST_ACCENTS) out = out.replace(re, to);
  return out;
}

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", k: "к", t: "т", m: "м", A: "А", C: "С", E: "Е", O: "О", P: "Р", X: "Х",
  T: "Т", H: "Н", K: "К", M: "М", B: "В",
};
const CYRILLIC_TO_LATIN = Object.fromEntries(Object.entries(LATIN_TO_CYRILLIC).map(([lat, cyr]) => [cyr, lat]));

function oneScript(w: string): string {
  const cyr = (w.match(/\p{Script=Cyrillic}/gu) ?? []).length;
  const lat = (w.match(/[A-Za-z]/g) ?? []).length;
  if (!cyr || !lat) return w;
  const toCyr = w.replace(/[A-Za-z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch);
  const toLat = w.replace(/\p{Script=Cyrillic}/gu, (ch) => CYRILLIC_TO_LATIN[ch] ?? ch);
  // Prefer the alphabet that can spell the whole word.
  if (!/[A-Za-z]/.test(toCyr)) return toCyr;
  if (!/\p{Script=Cyrillic}/u.test(toLat)) return toLat;
  return cyr >= lat ? toCyr : toLat;
}

/**
 * A word typed with look-alike letters from the other alphabet ("кремa", "Sеrum", "blacк") is rewritten in its main
 * alphabet; two words glued together ("пpoзpaчнaTransparent", "кремSРF50") are split first.
 */
export function fixMixedScript(text: string): string {
  return text
    .replace(/(\p{L})(?=[SС][PР][FФ](?:\d|\s|$))/gu, "$1 ")
    .replace(/\p{L}+/gu, (w) => {
      if (!/\p{Script=Cyrillic}/u.test(w) || !/[A-Za-z]/.test(w)) return w;
      // "кремSPF", "VICHYДео-стик", "СОRАLБалсам": a capital after a small letter or after two capitals starts a new word.
      const parts = w.split(/(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu}{2})(?=\p{Lu}\p{Ll}{2})/u);
      return parts.length > 1 ? parts.map(oneScript).join(" ") : oneScript(w);
    });
}

// ── Classification ──

export type Place = { category: string; sub: string };

type Ctx = {
  /** Brand and name: used for the context checks (men, kids, hair...). */
  all: string;
  /** Name without the brand: used for the type words. */
  text: string;
  source: string;
  brand: string;
  hair: boolean;
  face: boolean;
  body: boolean;
  hands: boolean;
  feet: boolean;
  lips: boolean;
  men: boolean;
  women: boolean;
  kids: boolean;
  ml: number | undefined;
};

const P = (category: string, sub: string): Place => ({ category, sub });

const HAIR_BRANDS = rx(
  "^(?:wella professionals|wella|redken|matrix|l'oréal professionnel|londa professional|alfaparf milano|chi|lee stafford|john frieda|kérastase|kerastase|schwarzkopf professional|cutrin|lakmé|revlon professional|tigi|sebastian professional|olaplex|moroccanoil|davines|joico|paul mitchell|syoss|gliss|schauma|pantene|head & shoulders|ogx|tresemmé|batiste|taft|wellaflex|cameleo|marion|mi amante|brave\\.new\\.hair\\.?|hairmate|ekre|olioseta|lola from rio|spa master|phyto|rené furterer|lador|la'dor|kativa|novex|inebrya|framesi|fanola|kemon|lisap|selective|farouk|nioxin|biolage|keune|goldwell|kevin murphy|label\\.m|american crew|parusan|alpecin|plantur|biosilk|alfaparf|mil mil)$",
);
const CTX = {
  hair: rx("\\bкос(?:а|ата|и|ми|ъм)\\b|\\bplex\\b|новофан|novophane|скалп|кичур|къдри|\\bhair\\b|\\bscalp\\b|\\bcurl|косопад|пърхот|\\bкосъм|сешоар|blow ?dry|изправяне|\\bпреса\\b|\\bкорени\\b|\\bблонд"),
  face: rx("\\bлице(?:то)?\\b|\\bface\\b|\\bfacial\\b|нощна грижа|мазна (?:и \\p{L}+ )?кожа|комбинирана кожа|смесена кожа|бръчки|\\bакне\\b|пъпки|\\bпори\\b|anti-?age|анти-?ейдж|околоо|лифтинг|пигмент|несъвършенства|\\bwrinkle"),
  body: rx("\\bтяло(?:то)?\\b|\\bbody\\b|стрии|целулит"),
  hands: rx("\\bръце(?:те)?\\b|\\bhands?\\b"),
  feet: rx("\\bкрака(?:та)?\\b|ходил|\\bпети(?:те)?\\b|\\bfoot\\b|\\bfeet\\b|мазол|кокоши трън"),
  lips: rx("\\bустни(?:те)?\\b|\\blips?\\b"),
  men: rx(
    "\\bмъж|\\bмъже\\b|за мъже|\\bmen\\b|\\bmen'?s\\b|\\bman\\b|\\bhomme\\b|\\bfor him\\b|\\buomo\\b|\\bmale\\b|\\bhombre\\b|\\bbarber|\\bджентълмен|\\bmister\\b|\\bmen expert\\b|\\bbulldog\\b|\\bproraso\\b|\\bold spice\\b|\\baxe\\b|бръснене",
  ),
  women: rx("\\bдамск|\\bдами\\b|за жени|\\bжени\\b|\\bwom[ae]n\\b|\\bfemme\\b|\\bfor her\\b|\\blady\\b|\\bladies\\b|\\bdonna\\b|\\bgirl|\\bмомич|\\bmujer\\b|\\bvenus\\b|satin care"),
  kids: rx(
    "\\bбебе|\\bбебета\\b|бебешк|\\bдетск|за деца|\\bдеца(?:та)?\\b|\\bkids?\\b|\\bbebe\\b|\\bbébé\\b|\\bjunior\\b|\\bchildren|за малки|\\binfant|\\bnewborn|\\bmustela\\b|\\bchicco\\b|\\bpaw patrol|\\bfrozen\\b|\\bminnie\\b|\\bmickey\\b|\\bbatman\\b|spider-?man|\\bspidey\\b|\\bpeppa\\b|\\bhello kitty\\b|\\bmartinelia\\b|\\bза момичета\\b|\\bза момчета\\b|\\bbaby\\b(?=.*(?:бебе|бебешк|деца|kids|0\\+|месеца|newborn))|\\bhipp\\b|\\bbabyono\\b|\\bbebo\\b|\\bnuk\\b|\\bpiwy\\b",
  ),
};

/** Brands whose rows are hair colour even when the name has no type word ("Palette Deluxe 5-11 ..."). */
const HAIR_COLOUR_BRANDS = rx(
  "^(?:palette|wellaton|casting|excellence|londa color|color sensation|preference|kolora|3 chênes|schwarzkopf|syoss color|olia|nutrisse|igora|koleston|majirel|herbal time|naturtint|color naturals|phyto color|phytocolor)$",
);
/** Perfume houses: their rows without a type word are perfumes. */
const PERFUME_BRANDS = rx(
  "^(?:la rive|cuba|lattafa|maison alhambra|armaf|al haramain|swiss arabian|rasasi|afnan|ard al zaafaran|zimaya|jacques battini|dorall collection|coscentra|chic'?n glam|côte d'azur|verset|nishane|xerjoff|kayali|olibanum|carner barcelona|blend oud|new notes|essential parfums|goldfield & banks|tiziana terenzi|hugo boss|calvin klein|davidoff|azzaro|carven|chopard|cerruti|dkny|kenzo|moschino|liu jo|mexx|jimmy choo|burberry|roberto cavalli|karl lagerfeld|furla|dolce&gabbana|antonio banderas|elizabeth arden|tom tailor|s\\.oliver|pepe jeans|bugatti|guess|versace|paco rabanne|lancome|lancôme|givenchy|armani|giorgio armani|yves saint laurent|dior|chanel|gucci|prada|bvlgari|montblanc|lacoste|elode|chevignon|jil sander|mugler|hermès|attar collection|lamis|rue pergolese|parfums corania|women'secret|sabrina carpenter|betty barclay|rituals|vivienne westwood|naomi campbell|britney spears|ariana grande|bruno banani|joop|replay|benetton|playboy|lalique|trussardi|ferrari|baldessarini|beverly hills polo club|the house of oud|the merchant of venice|p\\. frapin & cie|christina aguilera|miss kay|carlos moya|raphael rosalee|boucheron|rochas|tesori d'oriente|shirley may|str8|real time|swarovski)$",
);
/** Niche and Arabian houses: their perfumes go to "Нишови парфюми", whatever the gender. */
const NICHE_HOUSES = rx(
  "^(?:nishane|xerjoff|olibanum|carner barcelona|blend oud|new notes|essential parfums|goldfield & banks|tiziana terenzi|the house of oud|the merchant of venice|p\\. frapin & cie|kayali|le labo|byredo|kilian|memo|initio|mancera|montale|juliette has a gun|escentric molecules|maison margiela|diptyque|jo malone|lattafa|maison alhambra|armaf|al haramain|swiss arabian|rasasi|afnan|ard al zaafaran|zimaya|attar collection|amouage|creed|parfums de marly|nasomatto|orto parisi|mind games|bdk parfums|ex nihilo|atelier cologne|acqua di parma|penhaligon's|floraiku|vilhelm parfumerie|marc-antoine barrois|sospiro|bois 1920|profumum roma|room 1015|histoires de parfums|etat libre d'orange|l'artisan parfumeur|maison crivelli|parfum d'empire|nobile 1942|lorenzo villoresi|laboratorio olfattivo|eight & bob|clean reserve|dusita|fueguia|arquiste)$",
);
/** Brands that make one kind of product, for rows without a type word. */
const BRAND_TYPES: [RegExp, Place][] = [
  [rx("^(?:rexona|axe|fa|old spice|lycia|b\\.u\\.|malizia|adidas|str8|borotalco)$"), P("tyalo", "dezodoranti")],
  [rx("^(?:libresse|always|naturella|o\\.b\\.|bella|discreet|palomita|carefree|kotex|tampax|be free|molped|masmi|silvercare)$"), P("higiena", "damska-higiena")],
  [rx("^(?:aquafresh|colgate|sensodyne|parodontax|elmex|lacalut|blend-a-med|signal|splat|r\\.o\\.c\\.s\\.|ecodenta|biomed|blanx|elgydium|dontodent|glimo|astera|pierrot|nordics|dentaid)$"), P("higiena", "pasti-za-zabi")],
  [rx("^(?:opi|essie|bel london|trend !t up|andreia)$"), P("nokti", "lakove")],
  [rx("^(?:ardell|eylure)$"), P("grim", "migli")],
  [rx("^(?:real techniques)$"), P("aksesoari", "chetki-za-grim")],
  [rx("^(?:kent|tangle teezer)$"), P("aksesoari", "chetki-za-kosa")],
  [rx("^(?:wilkinson sword|gillette)$"), P("mazhe", "brasnene")],
  [rx("^(?:st\\. moriz|b\\.tan)$"), P("slantse", "avtobronzanti")],
  [rx("^(?:batiste|clear)$"), P("kosa", "shampoani")],
  [rx("^(?:c-thru)$"), P("parfyumi", "mistove")],
];

type Rule = { re: RegExp; to: (c: Ctx) => Place | null; weak?: boolean; priority?: boolean };
const rule = (source: string, to: Place | ((c: Ctx) => Place | null), opts: { weak?: boolean; priority?: boolean } = {}): Rule => ({
  re: rx(source),
  to: typeof to === "function" ? to : () => to,
  ...opts,
});

/** Babies' and small children's care (nappy creams, baby lotions): body care, whatever the wording. */
const BABY_CARE = rx("\\bmustela\\b|мустела|\\bbaby\\b|\\bbebe\\b|\\bbébé\\b|бебе|бебета|бебешк|детск|за деца|\\bkids?\\b|подсичане|\\bпелен|nappy|diaper|гръдни зърна|\\bзърна\\b|крусти|кърмене|ланолин");

/** Generic "крем": face, body, hands, feet, hair or men from the rest of the name. */
function creamPlace(c: Ctx): Place {
  if (c.hands && !c.face) return P("tyalo", "ratse-i-kraka");
  if (c.feet && !c.face) return P("tyalo", "ratse-i-kraka");
  if (c.hair && !c.face && !c.body) return P("kosa", "bez-otmivane");
  if (BABY_CARE.test(c.all)) return P("tyalo", "losioni");
  if (rx("стави|мускул|кости|сухожилия|вени|капиляри|арника|arnica").test(c.text)) return P("tyalo", "losioni");
  if (c.body && !c.face) return P("tyalo", "losioni");
  if (c.face) return P("litse", "kremove");
  if (c.ml !== undefined && c.ml > 100) return P("tyalo", "losioni");
  return P("litse", "kremove");
}

const SUN_KIDS = rx("\\bbaby\\b|\\bbebe\\b|\\bbébé\\b|бебе|бебета|бебешк|детск|за деца|\\bдеца\\b|\\bkids?\\b|\\bjunior\\b|педиатри\\p{L}*|pediatri\\p{L}*");

function sunPlace(c: Ctx): Place {
  if (rx("след слънце|after ?sun|след плаж").test(c.text)) return P("slantse", "sled-slantse");
  if (c.kids || SUN_KIDS.test(c.all)) return P("slantse", "detska");
  if (c.lips && !c.body) return P("slantse", "za-litse");
  if (c.face && !c.body) return P("slantse", "za-litse");
  if (rx("тонира\\p{L}*|tinted|\\bcover touch\\b|компактн\\p{L}*|\\bcompact\\b").test(c.text) && !c.body) return P("slantse", "za-litse");
  if (c.body) return P("slantse", "za-tyalo");
  if (rx("\\bстик\\b|\\bstick\\b|флуид|fluid|cushion|\\bгел-крем").test(c.text) && (c.ml === undefined || c.ml <= 75)) return P("slantse", "za-litse");
  if (rx("\\bкрем\\b|\\bcream\\b").test(c.text) && c.ml !== undefined && c.ml <= 60) return P("slantse", "za-litse");
  return P("slantse", "za-tyalo");
}

/** Children's perfumes: named for children or after a cartoon character. */
const PERFUME_KIDS = rx(
  "\\bдетск|за деца|за момичета|за момчета|\\bkids?\\b|\\bbebe\\b|\\bbébé\\b|бебе|\\bmartinelia\\b|\\bjunior\\b|\\bwinnie\\b|\\bpooh\\b|\\btweety\\b|looney tunes|spider-?man|\\bspidey\\b|\\bfrozen\\b|hello kitty|paw patrol|пес патрул|\\bminnie\\b|\\bmickey\\b|\\bdisney\\b|\\bbarbie\\b|\\bcars\\b|\\bavengers\\b|\\bbatman\\b|\\bsuperman\\b|\\bpeppa\\b|\\bminions\\b|\\btweenies\\b|my little pony|lol surprise|pj masks|\\bpokemon\\b|\\bpokémon\\b|harry potter|хари потър|\\bstitch\\b|\\bsmurfs?\\b|\\bbluey\\b|toy story|\\bladybug\\b|\\bmarvel\\b|star wars|super mario|angel cat|tom (?:and|&) jerry|\\bcinnamoroll\\b|\\bsonic\\b|\\bbibi\\b|\\bhoobs\\b|\\bdigimon\\b|фроузън|замръзналото кралство",
);

function perfumePlace(c: Ctx): Place {
  if (PERFUME_KIDS.test(c.all)) return P("parfyumi", "detski-parfyumi");
  if (NICHE_HOUSES.test(c.brand.toLowerCase())) return P("parfyumi", "nishovi");
  const g = perfumeGender(c.all, c.brand);
  return P("parfyumi", g === "m" ? "mazhki" : g === "w" ? "damski" : "uniseks");
}

function serumPlace(c: Ctx): Place {
  if (rx("\\bнокти\\b|кожички|\\bnails?\\b|cuticle").test(c.text)) return c.hands ? P("tyalo", "ratse-i-kraka") : P("nokti", "grizha-za-nokti");
  if (rx("основа за грим|база за грим|праймър|\\bprimer\\b").test(c.text)) return P("grim", "osnovi-i-fiksatori");
  if (rx("скалп|\\bscalp\\b|косопад|hair loss|пърхот|растеж на косата").test(c.text) && !c.face) return P("kosa", "skalp");
  if (c.hair && !c.face) return P("kosa", "serumi-i-olia");
  if (rx("отслабв|липосукц|целулит|стрии|\\bslim|cellulite|stretch marks|мастна тъкан").test(c.text)) return P("tyalo", "losioni");
  if (c.body && !c.face) return P("tyalo", "losioni");
  return P("litse", "serumi");
}

function exfoliantPlace(c: Ctx): Place {
  if (c.hair) return P("kosa", "skalp");
  if (c.lips && !c.face) return P("grim", "balsami-za-ustni");
  if (c.feet && !c.face) return P("tyalo", "ratse-i-kraka");
  if (c.body && !c.face) return P("tyalo", "skrabove");
  return P("litse", "eksfolianti");
}

function maskPlace(c: Ctx): Place {
  // Peel-off, sheet and clay masks and sachets of 20 ml or less are for the face, even from a hair-care house.
  const faceKind = rx("peel[- ]off|sheet|шийт|лист|глин\\p{L}*|\\bclay\\b|пилинг|ampoule|ампул|серум").test(c.text) || (c.ml !== undefined && c.ml <= 20);
  if (c.hair && !c.face && (CTX.hair.test(c.all) || !faceKind) && !rx("\\bskin\\b|\\bкожа\\b").test(c.text)) return P("kosa", "maski-za-kosa");
  if (c.hands) return P("tyalo", "ratse-i-kraka");
  if (c.feet) return P("tyalo", "ratse-i-kraka");
  if (c.lips && !c.face) return P("grim", "balsami-za-ustni");
  // A tub of 250 ml or more is a hair mask ("Маска Арома Натурал нар 450 мл").
  if (!c.face && !c.body && c.ml !== undefined && c.ml >= 250) return P("kosa", "maski-za-kosa");
  return P("litse", "maski");
}

function balmPlace(c: Ctx): Place {
  if (c.lips) return P("grim", "balsami-za-ustni");
  if (c.hair || (/hair/i.test(c.source) && !rx("\\bкожа\\b|\\bskin\\b").test(c.text))) return P("kosa", "balsami");
  if (c.hands || c.feet) return P("tyalo", "ratse-i-kraka");
  if (c.face) return P("litse", "kremove");
  return P("tyalo", "losioni");
}

/** Base oils pressed from nuts and seeds: used neat on skin and hair, not aromatherapy. */
const CARRIER_OIL = rx(
  "арган|argan|жожоба|jojoba|рицин|castor|бадем|almond|кокос|coconut|\\bший\\b|shea|авокадо|avocado|макадамия|macadamia|шипк|rosehip|облепиха|sea buckthorn|коноп|hemp|черен кимион|black seed|гроздов|grape ?seed|пшеничен зародиш|wheat germ|витамин е\\b|vitamin e\\b|маслин|olive|сусам|sesame|кайсие|apricot|ленен|flax|тиквен|pumpkin|нар\\b|pomegranate|морков|carrot|слънчоглед|sunflower|марула|marula|baobab|баобаб|камелия|camellia|аргания",
);

function oilPlace(c: Ctx): Place {
  if (c.hair && !c.face && !c.body) return P("kosa", "serumi-i-olia");
  if (c.lips) return P("grim", "glantsove");
  if (c.face && !c.body) return P("litse", "masla-za-litse");
  // A vial of 15 ml or less is an essential oil ("Масло лавандула ривана 10 мл"), unless it is a carrier oil.
  if (!c.body && c.ml !== undefined && c.ml <= 15 && !CARRIER_OIL.test(c.text)) return P("tyalo", "eterichni-masla");
  return P("tyalo", "masla-za-tyalo");
}

function lotionPlace(c: Ctx): Place {
  if (c.hair && rx("обем|volume|оформяне|фиксиране|стилизиране|setting|styling|blow").test(c.text)) return P("kosa", "stilizirane");
  if (c.hair && rx("приглажда|термо|термич|\\bheat\\b|smoothing|кератин|keratin|блясък|\\bshine\\b|\\d+\\s?-?\\s?в\\s?-?\\s?1\\b|\\bin 1\\b").test(c.text)) return P("kosa", "bez-otmivane");
  if (c.hair) return rx("мляко|milk").test(c.text) ? P("kosa", "bez-otmivane") : P("kosa", "skalp");
  if (c.face && !c.body) return rx("мляко|milk").test(c.text) ? P("litse", "pochistvane") : P("litse", "tonitsi");
  if (c.hands || c.feet) return P("tyalo", "ratse-i-kraka");
  return P("tyalo", "losioni");
}

function tonicPlace(c: Ctx): Place {
  if (c.hair && !c.face) return P("kosa", "skalp");
  return P("litse", "tonitsi");
}

function scrubPlace(c: Ctx): Place {
  if (c.lips) return P("grim", "balsami-za-ustni");
  if (c.hair) return P("kosa", "skalp");
  if (c.feet) return P("tyalo", "ratse-i-kraka");
  if (c.face && !c.body) return P("litse", "eksfolianti");
  // Body scrubs come in tubs and jars of 150 ml and more; a small tube that does not say "body" is for the face.
  if (!c.body && !c.hands && c.ml !== undefined && c.ml <= 75) return P("litse", "eksfolianti");
  return P("tyalo", "skrabove");
}

function sprayPlace(c: Ctx): Place | null {
  if (c.hair) return P("kosa", "stilizirane");
  if (c.face) return P("litse", "termalni-vodi");
  if (c.body) return P("parfyumi", "mistove");
  if (rx("\\bкожа\\b|\\bskin\\b").test(c.all)) return P("tyalo", "losioni");
  return null;
}

/** Face cleansers by default; washes for babies or for hair and body, shampoos and intimate washes go to their own shelves. */
function cleansingPlace(c: Ctx): Place {
  if (rx("шампоан|shampoo").test(c.text) && !rx("\\bгел\\b|\\bgel\\b").test(c.text)) return P("kosa", "shampoani");
  if (rx("интим|intim").test(c.text)) return P("higiena", "intimna-higiena");
  if (c.face) return P("litse", "pochistvane");
  if ((c.hair && c.body) || rx("\\bдуш|shower").test(c.text) || (BABY_CARE.test(c.all) && (c.hair || c.body || rx("гел|gel|шампоан|крем|cream").test(c.text)))) {
    return P("tyalo", "dush-gelove");
  }
  return P("litse", "pochistvane");
}

/** A roll-on is a deodorant unless the name says it is aromatherapy, a spot treatment, a gel for tired legs or glitter. */
function rollOnPlace(c: Ctx): Place {
  if (rx("вени|капиляри|\\bстави|мускул|дяволски нокът|arnica|арника").test(c.text)) return P("tyalo", "losioni");
  // Mood words only in small vials: "Stress Protect" on a 50 ml roll-on is a deodorant.
  const vial = c.ml !== undefined && c.ml <= 15;
  if (rx("етерич|essential|лавандул|ароматерап").test(c.text) || (vial && rx("стрес|stress|релакс|спокой|\\bсън\\b|менструац|главоболие|пътуване|вертиго|виене на свят").test(c.text))) {
    return P("tyalo", "eterichni-masla");
  }
  if (rx("пъпки|\\bакне\\b|несъвършенства|blemish").test(c.text)) return P("litse", "serumi");
  if (rx("блясък|брокат|glitter|shimmer").test(c.text)) return P("grim", "haylaytari");
  return P("tyalo", "dezodoranti");
}

function razorPlace(c: Ctx): Place {
  if (rx("вежди|\\bbrows?\\b").test(c.text)) return P("aksesoari", "instrumenti");
  if (c.women && !c.men) return P("tyalo", "epilatsia");
  if (rx("\\bvenus\\b|\\bdaisy\\b|\\bintuition\\b|бикини|\\bsilk|дамск").test(c.all)) return P("tyalo", "epilatsia");
  return P("mazhe", "brasnene");
}

function powderPlace(c: Ctx): Place {
  // The name or a hair-care house has to say "hair": a pressed powder from the export's hair-care category is make-up.
  if (rx("\\bкос(?:а|ата|и)\\b|\\bhair\\b|корени|\\bhold\\b|\\bvolume\\b|обем|текстур|texturi").test(c.text) || HAIR_BRANDS.test(c.brand.toLowerCase())) return P("kosa", "stilizirane");
  if (c.feet) return P("tyalo", "ratse-i-kraka");
  if (c.kids || c.body) return P("tyalo", "losioni");
  return P("grim", "pudri");
}

/** Oral-care brands: their "четка" is a toothbrush even when the name only says "Cool Fresh medium четка". */
const TOOTHBRUSH_BRANDS = rx(
  "^(?:trisa|sensodyne|curaprox|oral-b|elmex|colgate|tepe|jordan|aquafresh|signal|parodontax|lacalut|elgydium|dentaid|interprox|gum|meridol|blend-a-med|nordics|biorepair|splat|r\\.o\\.c\\.s\\.|ecodenta|pierrot|dontodent|velsamed|vitis|piave|miradent|swissdent|ivory)$",
);

function brushPlace(c: Ctx): Place {
  if (rx("зъб|tooth|interdent|интердент|\\bезик|tongue").test(c.text)) return P("higiena", "chetki-za-zabi");
  if (rx("точкатор|декораци|украса|nail art|за нокти").test(c.text)) return P("nokti", "manikyur");
  if (rx("за (?:\\p{L}+ ){0,2}(?:грим|руж|пудра|фон дьо тен|сенки|очна линия|устни|коректор|хайлайтър|контур|бронзант|растуширане|опушване|вежди)|сенки|make-?up|kabuki|кабуки|прецизна").test(c.text)) {
    return P("aksesoari", "chetki-za-grim");
  }
  // Hair accessory brands, brush shapes and children's characters mean a hair brush ("ABC Четка кръгла L").
  if (c.hair || rx("гребен|боядисване|\\bбоя\\b|сешоар|разресване|разр\\.|\\bcomb\\b|кръгла|овална|плоска|\\bdisney\\b|с огл").test(c.text) || /^(?:tangle teezer|kent|olivia garden)$/i.test(c.brand)) {
    return P("aksesoari", "chetki-za-kosa");
  }
  if (TOOTHBRUSH_BRANDS.test(c.brand.toLowerCase()) || rx("\\b(?:medium|soft|hard|ultra ?soft|extra ?soft|sensitive|мека|средна|твърда)\\b").test(c.text)) {
    return P("higiena", "chetki-za-zabi");
  }
  if (rx("тяло|body|баня|вана|bath|гръб|масаж|антицел").test(c.text)) return P("aksesoari", "za-banya");
  if (rx("нокти|nail").test(c.text)) return P("nokti", "manikyur");
  if (rx("бръснене|shav").test(c.text)) return P("mazhe", "brasnene");
  if (rx("почист|cleans|ексфолира|силикон|\\bсил\\b|sonic|звук").test(c.text)) return P("aksesoari", "instrumenti");
  return P("aksesoari", "chetki-za-grim");
}

/** Make-up houses: a gift set of theirs that names no product is a make-up set, unless it is named after a scent ("Cinnamon
 * Swirl" is a body mist, body butter and body wash). */
const SCENT_NAMED = rx("cinnamon|vanilla|cookie|candy|caramel|cocoa|coconut|strawberr|cherry|peach|mango|berry|honey|almond|marshmallow|gingerbread|sugar|канела|ванили|кокос|ягод|череш|праскова|манго|\\bмед\\b|бадем|захар");
const MAKEUP_HOUSES = rx("^(?:revolution|makeup revolution|essence|catrice|nyx|nyx professional makeup|wibo|golden rose|rimmel|max factor|kiko|kiko milano|profusion|w7|technic|sunkissed|bh cosmetics|wet n wild|e\\.l\\.f\\.|barry m|makeup obsession|lovely|ingrid|claresa|pupa|deborah|artdeco|maybelline new york|benefit|too faced|urban decay|morphe)$");

/** Houses that only make sun care: their oils and lotions are tanning products. */
const SUN_BRANDS = rx("^(?:hawaiian tropic|piz buin|sun like|carroten|ambre solaire|tahiti|malibu|australian gold|cabana)$");
const EYE_AREA = rx("околоо\\p{L}*|около очите|оч(?:ен|ния|ни) контур|eye ?cream|eye ?contour|\\bза очи\\b");

/** Manicure tools are sold with the manicure, not with nail care. */
const NAIL_TOOL = rx("клещи|клещички|ножичк|ножица|нокторезачк|\\bпила\\b|\\bпили\\b|бутач|пушер|инструмент|избутване|резачка|щипци|кюрета|шпатула|\\bчетк|пинсет");

const RULES: Rule[] = [
  // ── Perfume (wins over every other word) ──
  rule(
    "парфюмна вода|парфюмирана вода|\\beau de parfum|\\beau de perfume\\b|\\beau de parfumee\\b|\\bedp\\b|парфюмен екстракт|\\bextrait\\b|\\bparfum\\b(?! (?:body|spray|deo|for hair))|тоалетна вода|\\beau de toilette|\\bedt\\b|одеколон|\\beau de cologne|\\bcologne\\b|\\bedc\\b|парфюмно масло|perfume oil|perfumed oil|\\boil perfume\\b|\\battar\\b|концентриран парфюм|\\belixir de parfum",
    (c) => perfumePlace(c),
    { priority: true },
  ),
  rule("(?<!(?:^|[^\\p{L}])без )(?<!(?:^|[^\\p{L}])(?:с|със) )(?<!(?:^|[^\\p{L}])(?:с|със) [^,]{0,40}[^\\p{L}]и )(?<!аромат на (?:\\p{L}+ )?)\\bпарфюм(?:и|а|ът)?\\b(?! от)(?! за (?:коса|кола|дом|пране|тяло|стая))(?! дезодорант)", perfumePlace),
  rule("\\bperfume\\b(?! (?:hand|body|collection|deo))|\\bfragrance\\b(?! (?:free|mist))", perfumePlace, { weak: true }),
  rule(
    "парфюмен спрей за тяло|парфюмен мист|парфюмиран спрей|боди мист|body mist|мист за тяло|спрей за тяло|ароматен спрей|hair & body mist|hair ?mist|мист за коса и тяло|мист за коса|body spray|fragrance mist|парфюм за коса|ароматна вода за тяло|\\bмист\\b(?! за лице)|\\bmist\\b(?! за лице)",
    (c) => {
      if ((rx("hair|коса").test(c.text) || HAIR_BRANDS.test(c.brand.toLowerCase())) && (HAIR_BRANDS.test(c.brand.toLowerCase()) || rx("\\boil\\b|олио|масло|хидрат|грижа|защит|кератин").test(c.text))) {
        return P("kosa", "bez-otmivane");
      }
      const skinCare = K_BEAUTY.has(c.brand.toLowerCase()) || DERMO.has(c.brand.toLowerCase()) || rx("peptide|пептид|hyalur|хиалурон|niacinamide|ниацинамид|\\bfacial\\b|\\bface\\b|лице").test(c.text);
      return skinCare && !c.body ? P("litse", "termalni-vodi") : P("parfyumi", "mistove");
    },
  ),
  // ── Make-up: face ──
  rule("фон ?дьо ?тен|фон-дьо-тен|\\bfoundation\\b(?! brush| primer)|\\bskin ?tint\\b|тинт за лице|серум[- ]тинт|serum tint|тониращ флуид|тониращ крем|течна пудра|крем[- ]пудра|пудра[- ]крем|liquid powder", P("grim", "fon-dyo-ten")),
  rule("\\bcushion\\b|къшън|кушон", P("grim", "fon-dyo-ten"), { weak: true }),
  rule("\\b(?:[bc]c|бб|сс)[- ]?(?:крем|cream|cushion|балсам|balm|fluid|флуид)\\b|\\bbb ?крем", P("grim", "bb-i-cc-kremove")),
  rule("околоочен коректор|коректор(?! за (?:коса|корени|лак|бръчки))(?! на (?:лак|бръчки))(?! бръчки)|concealer|камуфлаж|camouflage|\\bcorrector\\b(?! nail)", P("grim", "korektori")),
  rule("(?<!цвят )(?<!baking )пудр(?:а|и)\\b(?! цвят)(?![- ]бронз)(?![- ]руж)(?! за (?:маникюр|нокти))|\\bcreme puff\\b|компактна пудра", powderPlace),
  rule("(?<!baking )\\bpowder\\b(?! puff| brush| louder)", powderPlace, { weak: true }),
  rule("пудра[- ]хайлайтър|хайлайтър[- ]пудра|хайлайт\\p{L}*|highlight(?:er|ing powder)|озаряваща пудра|илюминатор|illuminat(?:or|ing drops)|\\bstrob", P("grim", "haylaytari")),
  rule("пудра[- ]бронз\\p{L}*|пудра[^,]{0,15}бронзира\\p{L}*|пудра[- ]контурира\\p{L}*|бронз(?:ираща|ова) пудра|bronzing powder|бронзант(?!ен мус)|\\bbronzer\\b|контурираща (?:пудра|палитра)|контуриращ (?:стик|молив)|палитра (?:за )?контур\\p{L}*|за контуриране|стик за контуриране|\\bcontour(?:ing)? (?:stick|palette|powder|kit|wand|duo)", P("grim", "bronzanti-i-kontur")),
  rule("\\bруж\\b|\\bblush(?:er)?\\b|руж мус|крем руж|пудра[- ]руж|руж[- ]пудра", P("grim", "ruzh")),
  rule("\\bmake[- ]?up\\b(?! (?:remover|brush|sponge|bag|set|kit|fix|palette|revolution))(?=.*(?:\\d|cover|colorstay|foundation))|make[- ]?up cover", P("grim", "fon-dyo-ten"), { weak: true }),
  rule("течен контур|liquid contour", P("grim", "bronzanti-i-kontur")),
  rule("матираща база|основа за заличаване|\\bбаза\\b(?=.*(?:грим|матира|лице|make))|праймър|\\bprimer\\b|make[- ]?up base|(?:основа|база) (?:за|под) фон дьо тен|база за грим|основа за грим|спрей[^,]{0,20}фиксиращ|фиксиращ[^,]{0,20}спрей|основа под грим|основа за лице|фиксатор за грим|фиксиращ спрей|спрей за фиксиране|фиксиращ мист|setting spray|fixing spray|fix(?:ing)? mist|make-?up fix", P("grim", "osnovi-i-fiksatori")),
  rule("блясък за (?:лице|тяло|коса)|glitter (?:gel|roll)", (c) => (c.hair || rx("парфюм").test(c.text) ? null : P("grim", "haylaytari"))),
  rule(
    "(?:спрей|spray)[^,]{0,25}(?:(?:с|със) (?:\\p{L}+ )?блясък|брокат|glitter|shimmer|озаряващ|(?<!авто)бронз)|(?:озаряващ|бляскав|блестящ|shimmer|glitter)[^,]{0,10}(?:спрей|spray)",
    (c) => (c.hair || rx("парфюм|фиксир|setting|\\bfix").test(c.text) ? null : P("grim", "haylaytari")),
  ),
  // ── Make-up: eyes ──
  rule("спирал[аи](?! за коса)(?!(?: \\p{L}+){0,2} за вежди)|\\bmascara\\b|туш за мигли", P("grim", "spirali")),
  rule("(?:сапун|вакса|восък|помада|гел)(?![^,]{0,25}мигли)[^,]{0,25}вежди|(?:скраб|пилинг) за вежди|brow scrub|спирала за вежди|brow mascara|гел за вежди|brow gel|молив(?:и)? за вежди|пудра за вежди|сенки за вежди|помада за вежди|сапун за вежди|восък за вежди|къна за вежди|боя за вежди|боя за мигли|ламиниране на вежди|маркер за вежди|тинт за вежди|eyebrow|\\bbrows?\\b|\\bвежди\\b", P("grim", "vezhdi")),
  rule("очна линия|очни линии|eye ?liner|dip ?liner|\\bliner\\b(?! lip)|\\bлайнер|подводка|\\bink liner", P("grim", "ochni-linii")),
  rule("молив(?:и)? (?:за )?очи|каял|\\bkajal\\b|\\bkohl\\b|eye ?pencil|гел молив за очи|автоматичен молив за очи", P("grim", "molivi-za-ochi")),
  rule("(?<!против )(?<!тъмни )сенки(?! за вежди)(?! и торбички)(?! под очите)|eye ?shadow|eyeshadow|база за сенки|палитра сенки", P("grim", "senki-za-ochi")),
  rule("\\blashes\\b", P("grim", "migli"), { weak: true }),
  rule("изкуствени мигли|мигли на снопчета|лепило за мигли|lash glue|серум за мигли|серум за вежди и мигли|серум за мигли и вежди|lash serum|lash (?:&|and) brow serum|\\bмигли\\b", P("grim", "migli")),
  // ── Make-up: lips ──
  rule("червил[оа]|\\blipsticks?\\b(?! base)|lip colou?r|lipfinity|colou?r elixir|lip ?tint|тинт за устни|\\blip ?stain|lip ?crayon|lip ?paint|lip tattoo|liquid lips?|matte ink|vinyl ink|color riche|colou?r sensational", P("grim", "chervila")),
  rule("гланц(?:ове)?(?! за нокти)|lip ?gloss|lip ?glaze|\\bglossy lips?\\b|олио за устни|масло за устни|lip ?oil|плъмпер|\\bplump(?:er|ing)? (?:lip|gloss|fluid)|lip ?plump|lip ?fluid|гел за устни|топър за устни|lip topper|топ за устни|блясък за устни|lip brilliance|lip shine", P("grim", "glantsove")),
  rule("молив(?:и)? за устни|молив устни|lip ?liner|контур за устни|lip ?pencil|контурен молив", P("grim", "molivi-za-ustni")),
  rule("балсам(?:и)? (?:за )?устни|пачове за устни|lip ?balm|lip ?butter|грижа за устни|маска за устни|lip ?mask|скраб за устни|пилинг за устни|lip ?scrub|серум за устни|lip ?serum|lip ?treatment|база за устни|lipstick base|lip ?care|lip ?primer|стик за устни|хидратиращ стик за устни", P("grim", "balsami-za-ustni")),
  rule("\\btint\\b|\\bтинт\\b", (c) => (c.face && !c.lips ? P("grim", "fon-dyo-ten") : P("grim", "chervila")), { weak: true }),
  rule("\\bза устни\\b|\\blips?\\b", P("grim", "glantsove"), { weak: true }),
  rule("комплект (?:за |с )?грим\\p{L}*|грим комплект|makeup kit|make-?up set", P("grim", "komplekti-grim")),
  rule("палитра(?! за нокти)|гримове|make-?up palette|face palette|\\bpalette\\b|адвент календар|advent calendar", P("grim", "komplekti-grim"), { weak: true }),
  // ── Face care ──
  rule(
    "мицелар\\p{L}*(?![^,]{0,30}(?:шампоан|душ|интим|за коса|за тяло))|\\bmicellar\\b(?![^,]{0,30}(?:шампоан|shampoo))|околоочен демакиант|демакиант за очи|eye make-?up remover|демакиант|дегримьор|демакиаж|за демакиране|за премахване на грим|make-?up remover|кърпички за демакиаж|двуфазен демакиант|почистваща кърпа за лице|почистващ(?:а|о|и)? (?:гел|пяна|мляко|олио|масло|балсам|лосион|вода|кърпички|пудра|паста|мус|крем|емулсия)(?! за (?:тяло|ръце|коса|скалп|интимна|баня|душ|протези|зъбни))|измиващ(?:а|о|и)? (?:гел|пяна|крем|мляко|олио|емулсия|лосион|мус)(?! за (?:тяло|ръце|коса|интимна))|пенещ се гел|гел мусан|измив\\p{L}* (?:гел|пяна|крем|мляко)(?! за (?:тяло|ръце|коса|интимна|бебета))|nettoyant\\p{L}*|\\bcleanser\\b(?![^,]{0,20}(?:шампоан|shampoo))|за о?т?страняване на грим|премахване на (?:\\p{L}+ ){0,3}грим|почистващ\\p{L}* \\p{L}+ мляко|\\bmoussant|cleans(?:er|ing (?:gel|foam|oil|balm|milk|water|cream|powder))|face wash|facial wash|пяна за лице|гел за лице|гел за измиване|мляко за лице|ензимна пудра|enzyme powder|дълбокопочистваща",
    cleansingPlace,
  ),
  rule("тоник(?! за (?:коса|вана))|тонер(?![^,]{0,40}\\bкоса)|\\btoner\\b|лосион за лице|(?<!perfume )(?<!парфюмна )есенция|есенции|розова вода|флорална вода|хидролат|\\bhydrolat|first treatment|treatment essence", tonicPlace),
  rule("\\btonic\\b|\\bessence\\b(?! (?:mask|sheet))", tonicPlace, { weak: true }),
  rule("ampoule[- ]?mask|ампул\\p{L}*[- ]маска|маска[- ]ампула|серум[- ]маска|serum[- ]mask", maskPlace),
  rule("серум(?:и)?|\\bserums?\\b|ампул(?:а|и)|\\bampoules?\\b|концентрат(?! за коса)", serumPlace),
  rule("бустер|\\bbooster\\b", serumPlace, { weak: true }),
  rule("околоо\\p{L}*|около очите|оч(?:ен|ния|ни) контур|eye ?cream|eye ?contour|eye (?:and|&) lip|eye ?gel|eye ?serum|серум за очи|крем за очи|гел за очи|пачове(?! за (?:устни|пъпки|акне))|patch(?:es)?\\b(?! for lips)|\\bпач\\b|под очите|за зоната около очите|хидрогел пачове|очи и устни|за клепачи|клепачи|торбички|тъмни кръгове|против (?:тъмни )?сенки", P("litse", "okoloochen-kontur")),
  rule("крем(?:ове)?(?: за)? лице\\b|facial cream|дневен(?: \\p{L}+)? крем|нощен(?: \\p{L}+)? крем|крем[- ](?:нощен|дневен)|day cream|night cream|face cream|гел[- ]крем(?! за (?:тяло|ръце|крака))|крем[- ]гел за лице|sleeping (?:cream|pack)|moisturi[sz](?:er|ing cream)|anti-?age(?:ing)? cream|крем против бръчки|коректор (?:на |за )?бръчки|\\bкрем-маска(?! за (?:\\p{L}+ ){0,3}(?:коса|коси))|крем-флуид|флуид за лице|емулсия за лице|\\bemulsion\\b|универсален крем|хидратант", P("litse", "kremove")),
  rule("цикабио|cicabio|cicaplast|цикапласт|cicalfate|цикалфат|грижа за кожата", P("litse", "kremove"), { weak: true }),
  rule("алое вера гел|гел алое|гел от алое|aloe (?:vera )?(?:gel|99)|aloe 99|успокояващ гел", (c) => (c.face && !c.body ? P("litse", "kremove") : P("tyalo", "losioni"))),
  rule("\\bкрем(?:ове)?\\b|\\bcreams?\\b|\\bcrème\\b|\\bcrema\\b|\\bcreme\\b(?! gloss| supreme| puff)", creamPlace, { weak: true }),
  rule("\\bфлуид\\b|\\bfluid\\b|\\bемулсия\\b|\\bгел\\b(?=.*\\b(?:лице|кожа|акне)\\b)|хидрогел", (c) => (c.body && !c.face ? P("tyalo", "losioni") : P("litse", "kremove")), { weak: true }),
  rule("маск(?:а|и)\\b(?! за сън)|\\bmasks?\\b|шийт маска|sheet mask|\\bsheet\\b|лист маска|глинена маска|clay mask|peel[- ]off|essence mask|pocket pack|sleeping mask", maskPlace),
  rule("пилинг(?! за (?:тяло|крака|ходила|пети|скалп|устни))(?! (?:тоник|тонер|комплект|маска))|\\bpeel(?:ing)?\\b(?! (?:toner|tonic|mask))(?![- ]off)|ексфолиант|ексфолиращ (?:серум|гел|лосион|флуид)|скраб за лице|face scrub|ензимен|pore scrub", exfoliantPlace),
  rule("exfoliat\\p{L}*", exfoliantPlace, { weak: true }),
  rule("гликолова|салицилова|млечна киселина|бадемова киселина|azelaic|азелаинова|\\baha\\b|\\bbha\\b|\\bpha\\b|salicylic|glycolic", exfoliantPlace, { weak: true }),
  rule("(?:пачове|пластири) (?:за|против|срещу) (?:акне|пъпки)|acne patch\\p{L}*|pimple patch\\p{L}*", P("litse", "serumi")),
  rule("олио за лице|масло за лице|face oil|facial oil|сух[оа] олио за лице", P("litse", "masla-za-litse")),
  rule("(?<!\\bс (?:\\p{L}+ ){0,2})термална вода|thermal water|мист за лице|face mist|facial mist|спрей за лице|хидратиращ мист за лице", P("litse", "termalni-vodi")),
  // ── Hair ──
  rule("шампоан|shampoo|сух шампоан|dry shampoo", (c) => (rx("оцветяващ шампоан|тониращ шампоан|шампоан[- ]боя|шампоан оцветител").test(c.text) ? P("kosa", "boya-za-kosa") : rx("брада|beard").test(c.text) ? P("mazhe", "brada") : P("kosa", "shampoani"))),
  rule("балсам за (?:\\p{L}+ ){0,4}(?:коса|коси)(?![^,]{0,20}без (?:отмиване|изплакване))|балсам[- ]кондиционер|кондиционер(?! за (?:пране|дрехи))|(?<!skin )conditioner|балсам за къдрици", P("kosa", "balsami")),
  rule("(?:крем-)?маска за (?:\\p{L}+ ){0,3}(?:коса|коси)|hair mask|маска за къдрици", P("kosa", "maski-za-kosa")),
  rule("без отмиване|без изплакване|leave[- ]in", (c) => (c.face || c.body || BABY_CARE.test(c.all) ? null : P("kosa", "bez-otmivane"))),
  rule("спрей за (?:лесно )?разресване|спрей[- ]балсам|спрей[- ]кондиционер|термозащит\\p{L}*|топлинна защита|heat protect\\p{L}*|(?:вода|мляко|флуид|крем|грижа) за (?:\\p{L}+ ){0,2}коса|спрей за коса(?=.*(?:хидрат|блясък|защит|разрес|подхран|възстан|термо|10 ?в ?1|грижа))|еликсир за коса|hair elixir|hair milk|hair water|hair cream|blow ?dry cream|10 ?в ?1|течни кристали", P("kosa", "bez-otmivane")),
  rule("серум за (?:\\p{L}+ ){0,2}коса|олио за (?:\\p{L}+ ){0,2}коса|масло за (?:\\p{L}+ ){0,2}коса|hair oil|hair serum|серум за връхчета|масло за връхчета|кератинов серум|серум за къдрици|hair ampoule", P("kosa", "serumi-i-olia")),
  rule("арганово масло|argan oil|масло от арган", (c) => (c.hair ? P("kosa", "serumi-i-olia") : c.face ? P("litse", "masla-za-litse") : P("tyalo", "masla-za-tyalo")), { weak: true }),
  rule("против косопад|при косопад|косопад|hair loss|ампули за коса|ампули против|тоник за коса|лосион за коса|лосион против (?:косопад|пърхот)|растеж на косата|hair growth|(?:серум|скраб|пилинг|тоник|лосион|грижа|маска|балсам|олио|масло) за (?:\\p{L}+ )?скалп|scalp (?:serum|scrub|tonic|care|treatment|peel)", P("kosa", "skalp")),
  rule("скалп|\\bscalp\\b|против пърхот|пърхот|anti-?dandruff", P("kosa", "skalp"), { weak: true }),
  rule("лак за коса|hair ?spray|hairspray|спрей за коса|гел за коса|гел коса|hair gel|вакса(?! за вежди)|восък за коса|\\bhair wax|помада(?! за вежди)|паста за коса|hair paste|styling paste|глина за коса|пяна за (?:коса|обем)|мус за (?:коса|обем)|volumi[sz]ing (?:mousse|foam)|лосион за (?:обем|оформяне|фиксиране|стилизиране)|спрей за обем|текстуриращ|texturi[sz]|солен спрей|sea salt|крем за къдрици|curl cream|(?:стилизиращ|стилизиране|\\bstyling\\b)(?![^,]*(?:вежди|\\bbrow|четк|brush|гребен))|моделираща гума|гума за коса|пудра за коса|hair powder|за оформяне(?! на (?:кожички|вежди|нокти))|гел за оформяне|хидратиращ гел за къдрици|силна фиксация|wet look", P("kosa", "stilizirane")),
  rule("\\bwax\\b(?! strips)|\\bclay\\b|\\bpomade\\b|\\bmousse\\b(?![^,]*(?:боя|colou?r|blush|руж))", P("kosa", "stilizirane"), { weak: true }),
  rule("боя за коса|мус[- ]боя|\\bбоя\\b(?! за (?:вежди|мигли|текстил|обувки|лице))|hair colou?r(?![^,]{0,30}(?:шампоан|балсам|маска|shampoo|conditioner|mask))|hair dye|оцветител|перманентна боя|крем[- ]боя|\\bоксидант|\\bокислител|\\bdeveloper\\b|изрусител|изсветлител|\\bbleach|тонер [^,]{0,40}\\bкоса|\\bкъна\\b(?! за вежди)|\\bhenna\\b|\\bхена\\b|оцветяващ(?:а|о)? (?:шампоан|балсам|мус|маска|пяна|спрей)(?! за устни)|тониращ(?:а)? (?:балсам|шампоан|маска)|цвят за коса|color & soin|colou?r remover|премахване на боя|корективна боя|за боядисване|боядисване|коректор за (?:коса|корени)|спрей за (?:бели )?корени|бели корени|root (?:touch|concealer|cover)|magic retouch|phytocolor|изсветляващ (?:\\p{L}+ )?(?:крем|спрей|пудра|прах) за (?:\\p{L}+ )?коса", P("kosa", "boya-za-kosa")),
  rule("изсветлява\\p{L}*|изрусява\\p{L}*", (c) => (c.hair && !c.face ? P("kosa", "boya-za-kosa") : null), { weak: true }),
  rule("\\bеликсир\\b|\\belixir\\b|fill-?up", (c) => (c.hair ? P("kosa", "serumi-i-olia") : c.face ? P("litse", "serumi") : null), { weak: true }),
  rule(
    "сешоар|hair ?dryer|преса за коса|\\bпреса\\b(?= с пара| за коса| с керамични)|steampod|изправител|straightener|маша за (?:коса|къдрене)|\\bcurling\\b|стилизиращ уред|четка[- ]сешоар|airstyler|air styler|hot air brush|hair dryer brush",
    (c) => (c.ml !== undefined ? P("kosa", "stilizirane") : P("kosa", "uredi-za-kosa")),
  ),
  // ── Body ──
  rule("душ гел|shower gel|body wash|душ крем|душ пяна|пяна за вана|пяна за баня|bath foam|bubble bath|душ олио|shower oil|гел за душ|гел за баня|душ мус|shower cream|shower foam|за душ и вана|за вана и душ|душ и вана|гел за тяло и коса|гел за коса и тяло|мицеларн\\p{L}* вода за коса и тяло|(?:олио|масло) за измиване(?: на (?:коса и )?тяло)?|измиващо (?:олио|масло)|душ[- ]олио|душ[- ]масло|измиващ гел за (?:\\p{L}+ ){0,2}тяло|измиващ крем|cr[eè]me lavante|\\blavante\\b|почистващ крем за бебета|душ пилинг", P("tyalo", "dush-gelove")),
  rule("кутия за сапун|поставка за сапун", P("aksesoari", "za-banya")),
  rule("сапун(?:и|че)?\\b|\\bsoaps?\\b|крем[- ]сапун|течен сапун|сапунерка", (c) => (rx("брада|beard").test(c.text) ? P("mazhe", "brada") : rx("бръснене|shav").test(c.text) ? P("mazhe", "brasnene") : rx("сапунерка").test(c.text) ? P("aksesoari", "za-banya") : P("tyalo", "sapuni"))),
  rule("скраб(?:ове)?|\\bscrub\\b|пилинг за тяло|body scrub|захарен скраб|солен скраб|кафеен скраб", scrubPlace),
  rule("(?<!алуминиеви )\\bсоли\\b", (c) => (c.feet ? P("tyalo", "ratse-i-kraka") : P("tyalo", "vana")), { weak: true }),
  rule("тоник за вана|кристали за (?:вана|баня)|bath crystals|сол(?:и)? за (?:вана|баня)|соли за баня|бомбичк\\p{L}*|bath bomb|bath salt|масло за вана|добавка за вана", P("tyalo", "vana")),
  rule("лосион за (?:\\p{L}+ ){0,2}тяло|мляко за тяло|крем за тяло|body lotion|body milk|body cream|body butter|масло за тяло на крем|балсам за тяло|суфле за тяло|желе за тяло|гел за тяло|серум за тяло|крем против стрии|стрии|антицелулит\\p{L}*|целулит|отслабващ|стягащ лосион|разширени вени|капиляри|\\bvarico|мляко за ръце и тяло|емолиент\\p{L}*|\\bмехлем\\b|мус за тяло|body mousse", P("tyalo", "losioni")),
  rule("тоалетно мляко", (c) => (c.body || BABY_CARE.test(c.all) || rx("лосион").test(c.text) ? P("tyalo", "losioni") : P("litse", "pochistvane"))),
  rule("лосион(?:и)?\\b|\\blotion\\b|\\bмляко\\b|\\bmilk\\b|\\bмялко\\b", lotionPlace, { weak: true }),
  rule("(?:масло за тяло|олио за тяло|сухо олио|сухо масло|dry oil|body oil|масажно масло|масло за масаж|massage oil|кокосово масло|бадемово масло|масло за бебета|baby oil|\\b100% (?:био )?масло|масло (?:жожоба|шипка|ший|карите)|ший масло|масло ший)(?![^,]{0,30}за (?:\\p{L}+ ){0,2}(?:коса|коси|лице)(?! и тяло))", P("tyalo", "masla-za-tyalo")),
  // Pure rose oil (otto) comes in vials of a few millilitres; "крем с розово масло" names an ingredient.
  rule("розово масло(?! за (?:\\p{L}+ ){0,2}(?:коса|коси|лице))", (c) => (rx("100 ?%|натурално|мускал|\\bзгу\\b|\\botto\\b|абсолю").test(c.text) || (c.ml !== undefined && c.ml <= 10) ? P("tyalo", "eterichni-masla") : P("tyalo", "masla-za-tyalo"))),
  rule("(?<!(?:^|[^\\p{L}])(?:с|със|и|от) (?:\\d+ )?)(?:етерично масло|етерични масла)|essential oils?|синергия от етерични", (c) => (rx("масажно|за масаж|massage").test(c.text) ? P("tyalo", "masla-za-tyalo") : P("tyalo", "eterichni-masla"))),
  rule("ароматерапия|aromatherapy", P("tyalo", "eterichni-masla"), { weak: true }),
  rule("масло от\\b|олио\\b|\\boil\\b(?![- ]free)|\\bмасло\\b", oilPlace, { weak: true }),
  rule("\\b(?:bb|cc)\\b(?! powder| пудра)", (c) => (c.hair ? null : P("grim", "bb-i-cc-kremove")), { weak: true }),
  rule("подсичане", P("tyalo", "losioni")),
  rule("крем за ръце|hand cream|лосион за ръце|маска за ръце|ръкавици за (?!почистване|баня|пилинг|душ|ексфолиране)|балсам за ръце|серум за ръце|крем за крака|крем за пети|конски кестен|rosskastanien|horse chestnut|сапун за (?:пети|крака)|за пети\\b|напукани пети|ходила|\\bfoot\\b|\\bfeet\\b|мазоли|кокоши трън|пилинг за крака|чорапи за пилинг|пилинг чорапи|пилинг за ходила|дезодорант за крака|спрей за крака|пудра за крака|крем за нокти и ръце|за ръце и нокти|hand (?:sorbet|balm|lotion|mask)|\\bкрем ръце\\b", P("tyalo", "ratse-i-kraka")),
  rule("дезодорант|\\bdeodorant|антиперспирант|antiperspirant|anti-?perspirant|anti-?transpirant|antitranspirant|\\bдео\\b(?![^,]*(?:превръзк|ежедневк|panty|liner|тампон))|\\bdeo\\b(?![^,]*(?:превръзк|ежедневк|panty|liner|тампон))|против изпотяване|стик против|кристален дезодорант|алунит|стипца|\\balum\\b|\\bdeo-?spray|парфюмен дезодорант|\\bap\\b(?= (?:\\d|roll|рол|spray|спрей|stick|стик))", P("tyalo", "dezodoranti")),
  rule("рол-он|roll-? ?on", rollOnPlace, { weak: true }),
  rule("депилатор|депилация|депилиращ|кола маска|\\bдепил\\.|восък[^,]{0,20}(?:депил|епил)|рол-он восък|восък рол-он|затопляне на восък|нагревател за восък|wax heater|восъчни ленти|восък за (?:депилация|епилация)|перли восък|восъчни перли|wax (?:pearls|beans|beads)|hard wax|wax strips|ленти за (?:епилация|депилация)|ленти лице|епилатор|епилация|\\bepilat|\\bipl\\b|бикини тример|тример за жени|дамска самобръсначка|самобръсначка за жени|ножчета за дамска|дамска система|крем за депилация|hair removal|depilatory|епилиращ\\p{L}*", P("tyalo", "epilatsia")),
  // ── Nails ──
  rule("лакочистител|лакочистващ|nail polish remover|премахване на (?:лак|гел лак)|ацетон|разтворител за лак|течност за премахване|премахване на (?:\\p{L}+ )?(?:лак|гел лак|гел-лак)|за отстраняване на лак|коректор на лак|nail polish corrector|за премахване на лак", P("nokti", "lakochistiteli")),
  rule("\\bhybrid\\b", P("nokti", "gel-lakove"), { weak: true }),
  rule("гел лак|gel polish|гел[- ]лак|хибрид(?:ен)? лак|\\buv лак|\\bled лак|\\bsemilac|\\buv/led|полигел|polygel|акрил(?:ен)? гел|строителен гел|builder gel|гел за нокти", P("nokti", "gel-lakove")),
  rule("топ лак|топ-лак|top ?coat|база за нокти|base ?coat|основа за нокти|основа за лак|основа и топ|база и топ|изглаждаща база|матиращ топ|сушител за лак|drops? за сушене|бързосъхнещ|капки за (?:бързо )?съхнене|express dry|dry drops", P("nokti", "osnovi-i-top")),
  rule("лак(?:ове)? за нокти|nail ?polish|nail lacquer|nail colou?r|\\bлак(?:ове)?\\b(?! за (?:коса|мебели|дърво))|\\bnail enamel", P("nokti", "lakove")),
  rule("олио за кожички|олио за (?:\\p{L}+ )?нокти|масло за (?:\\p{L}+ )?нокти|заздравител|укрепител за нокти|nail (?:care|treatment|strengthener|oil|serum|hardener)|кератин за нокти|серум за нокти|крем за нокти|за кожички|cuticle|балсам за нокти|грижа за нокти|растеж на нокти|възстановител за нокти|ускорител за растеж|кожички|nail cleaner|cleaner за нокти|nail expres", P("nokti", "grizha-za-nokti")),
  rule("пила(?: за нокти)?\\b|пили за нокти|nail file|буфер за нокти|полиращ блок|ножичк\\p{L}* за нокти|ножичк\\p{L}*(?=.*(?:нокти|кожички))|клещи\\b|клещички|инструмент[^,]{0,25}(?:кожички|нокти|маникюр)|избутване на кожички|пудра за (?:маникюр|нокти)|nail powder|dip powder|акрилна пудра|нокторезачк\\p{L}*|резачка за нокти|комплект за маникюр|маникюр|педикюр|изкуствени нокти|залепващи нокти|press[- ]on|лепило за нокти|nail art|декорации за нокти|стикери за нокти|шаблони за нокти|лампа за нокти|uv лампа|led лампа|бутач|пушер|сепаратор|разделител за пръсти|ножичка с предпазител|\\bпемза|pumice|кюрета|ренде за пети", P("nokti", "manikyur")),
  rule("против гъбички|срещу гъбички|при гъбички", (c) => (c.feet ? P("tyalo", "ratse-i-kraka") : P("nokti", "grizha-za-nokti"))),
  // ── Sun ──
  rule("слънцезащ\\p{L}*|слъцезащит\\p{L}*|sunscreen|sun ?(?:cream|lotion|spray|milk|fluid|stick|protect\\p{L}*|block|care|screen)|фотозащит\\p{L}*|fotoprotector|photoprotect\\p{L}*|uv protector|anthelios|photoderm|ambre solaire|\\bsoleil\\b|за плаж|плажн\\p{L}*|след слънце|after ?sun|след плаж|\\bsun like\\b|фотодерм|\\bsun\\b(?=.*\\bspf(?!\\p{L}))|(?:олио|масло|мляко|спрей|лосион|флуид|емулсия|oil|milk|spray|lotion|fluid|emulsion) [^,]{0,30}\\bspf(?!\\p{L})|загар|каротен\\p{L}*|олио за (?:\\p{L}+ )?тен|масло за (?:\\p{L}+ )?тен|за тен\\b|(?:бърз|наситен|дълбок|шоколадов|златист|бронзов)(?: и \\p{L}+)? тен\\b|tan accelerator|ускорител на тен|бронзиращо (?:мляко|олио|масло)|tanning oil", sunPlace),
  rule("автобронзант\\p{L}*|автобронзиращ|самопотъмняващ|self[- ]?tan|\\btanning (?:mousse|water|drops|lotion|foam|mist|gel)|бронзиращ (?:лосион|спрей|гел|крем|мус)|тен без слънце|drops bronz", P("slantse", "avtobronzanti")),
  // ── Men ──
  rule("самобръсначк\\p{L}*|бръснач|ножчета|резервни ножчета|пяна за бръснене|гел за бръснене|крем за бръснене|сапун за бръснене|четка за бръснене|shav(?:ing|er)|\\brazors?\\b|преди бръснене|машинка за бръснене|машинка за подстригване|hair ?clipper|\\bтример(?! за (?:нос|бикини))|\\btrimmer\\b|за бръснене|система за бръснене", razorPlace),
  rule("\\bblades?\\b", razorPlace, { weak: true }),
  rule("\\bone ?blade\\b", razorPlace),
  rule("афтършейв|after ?shave|aftershave|след бръснене|лосион след бръснене|балсам след бръснене", P("mazhe", "aftarsheyv")),
  rule("\\bбрад(?:а|ата)\\b|\\bbeard\\b|мустаци|moustache|mustache", P("mazhe", "brada")),
  // ── Hygiene ──
  rule("паста за зъби|пасти за зъби|toothpaste|зъбна паста|паста за профилактика|\\bпаста\\b(?=.*(?:зъб|венц|пародонт|кариес|избелв|флуор|дентал|\\bмента|\\bmint|whit))|гел за зъби", P("higiena", "pasti-za-zabi")),
  rule("\\bпаста\\b", (c) => (/oral/i.test(c.source) || rx("xylit|ксилит|детска паста|\\bjunior\\b").test(c.text) ? P("higiena", "pasti-za-zabi") : null), { weak: true }),
  rule("електрическа четка|електрически четки|електрическа детска четка|звукочестотна|ултразвукова четка|sonicare|накрайни(?:к|ци)|наконечник|резервн(?:а|и) глав(?:а|и)(?![^,]*(?:пил|пет|ролк))|резерв\\p{L}* за четка|\\beb ?\\d{2}\\b|глави за четка|electric toothbrush|brush heads?|\\bsonic\\b|power ?brush|батерийна четка|\\boral-b\\b(?= .*(?:\\bio\\d?\\b|pro \\d|vitality|genius|smart|stages power))", P("higiena", "elektricheski-chetki")),
  rule("четк(?:а|и) за зъби|toothbrush|tooth brush|четка (?:за )?(?:зъби )?(?:medium|soft|hard|ultra soft|мека|средна|твърда)\\b", P("higiena", "chetki-za-zabi")),
  rule("вода за уста|води за уста|mouthwash|mouth ?rinse|вода за устна кухина|листерин|listerine|спрей за уста|орален спрей|разтвор за уста", P("higiena", "vodi-za-usta")),
  rule("ръкавиц\\p{L}* за (?:нанасяне|автобронз\\p{L}*)|(?:tanning|applicator|self[- ]?tan) mitt", P("aksesoari", "gabi-i-aplikatori"), { priority: true }),
  rule("конец за зъби|зъбен конец|конци за зъби|dental floss|\\bfloss|интердентал\\p{L}*|interdental|интерпрокс|клечки за зъби|стъргалка за език|почистване на езика|тел за брекети|восък за брекети|иригатор|\\birrigator|water ?flosser|душ за уста|протез\\p{L}*|\\bcorega\\b|избелващи ленти|ленти изб|whitening strips|избелване на зъби|комплект за път(?! с несесер)", P("higiena", "interdentalni")),
  rule("превръзки|\\bпревръзка|(?<!памучни )(?<!козметични )тампон(?:и)?\\b(?! яйце)(?! за (?:грим|почистване|демакиаж|лице))|\\btampons?\\b|\\bpads\\b|менструалн\\p{L}*|pantyliner|\\bpanty\\b|ежедневки|ежедневни (?:превръзки|дамски)|за родилки", P("higiena", "damska-higiena")),
  rule("интимен|интимна|интимно|интимни|intimate|\\bintima\\b|гел за интимна|за интимна", P("higiena", "intimna-higiena")),
  rule("мокри кърп\\p{L}*|влажни кърп\\p{L}*|wet wipes|\\bwipes\\b|бебешки кърпички|\\bкърпички\\b|\\bкърпи\\b(?! за (?:коса|глава))", (c) => (rx("грим|демакиаж|лице|face|make-?up").test(c.text) && !c.kids && !c.hands && !rx("антисептик|антибактериал|antibacterial|дезинфек").test(c.text) ? P("litse", "pochistvane") : P("higiena", "mokri-karpichki"))),
  rule(
    "(?:хидратиращи|ексфолиращи|почистващи и ексфолиращи|напоени|тонизиращи|пилинг) (?:тампони|дискове|пачове) за лице|toner pads?|peeling pads?",
    (c) => (rx("ексфолира|пилинг|peeling").test(c.text) ? P("litse", "eksfolianti") : P("litse", "tonitsi")),
  ),
  rule("памучни (?:тампони|дискове|клечки|пръчици)|козметични тампони|клечки за уши|cotton (?:pads|buds)|тампон\\p{L}* за (?:грим|почистване|демакиаж|лице)|тампони за почистване", P("higiena", "pamuchni")),
  // ── Accessories ──
  rule("четк(?:а|и|ата|ите) за (?:грим|руж|пудра|фон дьо тен|сенки|очна линия|устни|коректор|хайлайтър|контур|бронзант|растуширане|опушване|прецизн)|makeup brush|make-?up brushes|brush set|brush collection|комплект четки|кабуки|\\bkabuki\\b|четка(?= (?:no|№|#)? ?\\d)|\\bfoundation brush|\\bpowder brush|\\bblush brush|\\bчетк(?:а|и)\\b(?! за (?:зъби|коса|тяло|баня|нокти|бръснене|шише))", brushPlace),
  rule(
    "(?:blush(?:er)?|eye ?shadow|powder|foundation|concealer|contour(?:ing)?|bronzer|highlighter|kabuki|blender|blending|brow|liner|lip|fan|stippling|buffing|angled|crease|smudge|cheek|shader)\\s+brush(?:es)?\\b",
    brushPlace,
  ),
  rule("шаблон\\p{L}* за (?:очна линия|очи|вежди|грим)|\\bstencils?\\b", P("aksesoari", "instrumenti")),
  rule("(?:стойка|поставка|държач|чаша) за (?:\\p{L}+ ){0,2}четк\\p{L}*", P("aksesoari", "za-banya")),
  rule("гъб(?:а|и|ичка|ички) за (?:грим|фон дьо тен|пудра|нанасяне|автобронзант|тен)|ръкавиц\\p{L}* за (?:автобронзант|нанасяне)|beauty ?blender|blending sponge|make-?up sponge|\\bблендер\\b|апликатор(?:и)?\\b(?! за тампон)(?! за вежди)|пухче|пухчета|\\bpuff\\b|спонж|гъбичк\\p{L}* за (?:грим|пудра|фон|нанасяне|почистване|лице)|\\bгъбичка\\b|\\bsponge\\b|тампон яйце|яйце за грим|ръкавиц\\p{L}* за почистване на лице|почистващи ръкавици", P("aksesoari", "gabi-i-aplikatori")),
  rule("гъба за (?:баня|тяло|душ)|гъба конджак|конджак|\\bгъба\\b|ексфолираща ръкавица|ръкавица за (?:баня|пилинг|душ)|люфа|loofah|четка за тяло|четка за баня|масажна ръкавица|шапка за (?:баня|душ)|кесе\\b|\\bkese\\b|дозатор за сапун", P("aksesoari", "za-banya")),
  rule("\\bcomb\\b", P("aksesoari", "chetki-za-kosa"), { weak: true }),
  rule("четк(?:а|и) (?:за )?коса|гребен\\p{L}*|hair ?brush|детанглер|detangl\\p{L}*|tangle teezer|четка за разресване|кръгла четка|плоска четка|\\bчетка\\b(?=.*коса)", P("aksesoari", "chetki-za-kosa")),
  rule("шнол(?:а|и)|фиб(?:а|и)\\b|ластик(?:а|ът|ци)?\\b|ластици|диадем(?:а|и)|scrunchie|скрънчи|щипк(?:а|и) за коса|щипка\\b|клипс(?:ове)? за коса|\\bролки\\b|бигуди|мрежичка за коса|тюрбан|кърпа за коса|кърп(?:а|и) за глава|microfib(?:re|er) hair|hair towel|hair ?clips?(?!per)|hair ?ties?|bobby pins?|аксесоар(?:и)? за коса|\\bлента за коса|hair jewels", P("aksesoari", "za-kosa")),
  rule("пинсет\\p{L}*|tweezer\\p{L}*|огледал\\p{L}*|\\bmirror\\b|острилка|\\bsharpener\\b|извивачка за мигли|за извиване на мигли|eyelash curler|\\bножичк(?:а|и)\\b|ролер за лице|jade roller|гуа ша|gua sha|масажор за лице|дермарол\\p{L}*|derma ?roller|уред за (?!епилация)(?:\\p{L}+ ){0,2}(?:почистване|лице|кожа|масаж|мезотерапия|микродермабразио)|почистваща четка за лице|led маска|бръснач за вежди|самобръсначка за вежди|бръснач за лице|миглоизвивачк\\p{L}*|\\bножица\\b", P("aksesoari", "instrumenti")),
  rule("(?:несесер|куфар\\p{L}*|кутия) с (?:гримове|грим)\\b", P("grim", "komplekti-grim")),
  rule("куфар\\p{L}* за грим\\p{L}*|storage case|козметичн(?:а|и) чант\\p{L}*|козметичен несесер|несесер за (?:грим|козметика|баня|тоалетни|пътуване|бижута)|тоалетна чант\\p{L}*|тоалетен несесер|toiletry bag|cosmetic bag|beauty bag|make-?up bag|куфар с козметични", P("aksesoari", "neseseri")),
  rule("\\bнесесер\\p{L}*", (c) => (COSMETIC_SOURCE.test(c.source) ? P("aksesoari", "neseseri") : null), { weak: true }),
  rule("комплект за (?:тяло|баня)", P("tyalo", "komplekti-tyalo")),
  rule("комплект за коса|продукти за коса", P("kosa", "komplekti-kosa")),
  rule("комплект за (?:лице|грижа за лице)", P("litse", "komplekti-litse")),
  rule("комплект за устни|lip kit", P("grim", "komplekti-grim")),
  rule(
    "подаръчен комплект|gift set",
    (c) => PERFUME_BRANDS.test(c.brand.toLowerCase()) && !/^(?:rituals|women'secret|tesori d'oriente)$/i.test(c.brand) ? P("parfyumi", "parfyumni-komplekti")
      : /cosmetics & makeup|makeup|грим/i.test(c.source) || (MAKEUP_HOUSES.test(c.brand.toLowerCase()) && !SCENT_NAMED.test(c.text)) ? P("grim", "komplekti-grim")
      : c.hair ? P("kosa", "komplekti-kosa")
      : c.face ? P("litse", "komplekti-litse")
      : P("tyalo", "komplekti-tyalo"),
    { weak: true },
  ),
  // ── Weak: last words before giving up ──
  rule("\\bбалсам(?:и)?\\b|\\bbalm\\b|\\bbalsam\\b", balmPlace, { weak: true }),
  rule("\\bспрей\\b|\\bspray\\b", sprayPlace, { weak: true }),
  rule("\\bгел\\b|\\bgel\\b", (c) => ((c.hair && c.body) || (c.kids && (c.hair || c.body)) ? P("tyalo", "dush-gelove") : c.hair ? P("kosa", "stilizirane") : c.face ? P("litse", "pochistvane") : c.body ? P("tyalo", "dush-gelove") : null), { weak: true }),
  rule("\\bпяна\\b|\\bfoam\\b", (c) => (c.hair ? P("kosa", "stilizirane") : c.face ? P("litse", "pochistvane") : P("tyalo", "dush-gelove")), { weak: true }),
  rule("\\btreatment\\b|\\bтретман\\b|\\bterapia\\b|\\bтерапия\\b", (c) => (c.hair ? P("kosa", "maski-za-kosa") : c.face ? P("litse", "serumi") : null), { weak: true }),
  rule("\\bза лице\\b", P("litse", "kremove"), { weak: true }),
];

const SET = rx("комплект|\\bсет\\b|\\b\\d cigars\\b|(?<!& ?)\\bset\\b|\\bkit\\b|подаръчн\\p{L}*|подарък|\\bgift\\b|\\bduo pack\\b|кутия с\\b|\\bколекция\\b|\\btrio\\b|\\bтрио\\b");
/** Two products with their own sizes in one pack: "… 50 мл + … 15 мл". */
const BUNDLE = rx("\\d\\s?(?:мл|ml|г|g)\\b[^+]*(?<!spf\\s?\\d{1,3}\\s?)\\+[^+]*\\d\\s?(?:мл|ml|г|g)\\b|\\d\\s?(?:мл|ml)\\b\\s(?:и|and|&)\\s(?!\\d)[^,+]*\\d\\s?(?:мл|ml|г|g)\\b");
/** One product with a bonus: "Шампоан 400 мл + 100 мл". */
const BONUS = rx("^[^+]*\\d\\s?(?:мл|ml)\\s?\\+\\s?\\d+\\s?(?:мл|ml)\\b[^+]*$");
const SET_SUB: Record<string, string> = {
  grim: "komplekti-grim",
  litse: "komplekti-litse",
  kosa: "komplekti-kosa",
  tyalo: "komplekti-tyalo",
  mazhe: "komplekti-mazhe",
  parfyumi: "parfyumni-komplekti",
};

function context(all: string, text: string, source: string, brand: string): Ctx {
  const hairBrand = HAIR_BRANDS.test(brand.toLowerCase());
  return {
    all,
    text,
    source,
    brand,
    // The export's hair category and hair-care houses count only when the name does not speak of skin, face or body.
    hair: CTX.hair.test(all) || ((/^hair care$|pack - hair/i.test(source) || hairBrand) && !CTX.face.test(all) && !CTX.body.test(all) && !rx("\\bкожа\\b|\\bskin\\b").test(all)),
    face: CTX.face.test(all),
    body: CTX.body.test(all),
    hands: CTX.hands.test(all),
    feet: CTX.feet.test(all),
    lips: CTX.lips.test(all),
    men: CTX.men.test(all),
    women: CTX.women.test(all),
    kids: CTX.kids.test(all),
    ml: volumeMl(all),
  };
}

type Hit = { index: number; length: number; place: Place; weak: boolean; priority: boolean };

function hits(c: Ctx): Hit[] {
  const out: Hit[] = [];
  for (const r of RULES) {
    const m = r.re.exec(c.text);
    if (!m) continue;
    const place = r.to(c);
    if (place) out.push({ index: m.index, length: m[0].length, place, weak: Boolean(r.weak), priority: Boolean(r.priority) });
  }
  return out.sort((a, b) => a.index - b.index || b.length - a.length);
}

const PERFUME_SOURCE = /^(?:perfumes & fragrances|pack - perfumes & fragrances|парфюми|тоалетни води|men's fragrance|women's fragrances?|men's fragrances|women's eau de parfum|men's eau de parfum|unisex eau de parfum|perfume|fragrance|eau de parfum|колони и парфюми)$/i;

/**
 * Category and subcategory for a product, or null when the name is not recognisably a cosmetic product.
 * `name` is the product name with the brand removed (so the brand "Essence" is not read as an essence); `full` is
 * brand + name, used for the context ("Men's Master" makes a set a men's set).
 */
export function classify(name: string, full: string, source: string, brand: string): Place | null {
  const text = matchText(name);
  const all = matchText(full);
  const c = context(all, text, source, brand);
  const found = hits(c);
  const priority = found.find((h) => h.priority);
  const strong = found.filter((h) => !h.weak);
  let place = priority?.place ?? strong[0]?.place ?? found[0]?.place ?? null;

  if (!place) {
    // No type word at all: one-product brands, perfume houses and hair colour lines name only the product.
    const b = brand.toLowerCase();
    if (HAIR_COLOUR_BRANDS.test(b) || (/hair/i.test(source) && rx("\\b\\d{1,2}[.,/-]\\d{1,2}\\b").test(text) && !c.face)) place = P("kosa", "boya-za-kosa");
    else if (PERFUME_BRANDS.test(b) && (c.ml !== undefined || PERFUME_SOURCE.test(source.trim()))) place = perfumePlace(c);
    else if (PERFUME_SOURCE.test(source.trim()) && c.ml !== undefined) place = perfumePlace(c);
    else {
      for (const [re, p] of BRAND_TYPES) if (re.test(b)) place = p;
    }
    if (!place) return null;
  }

  // Sets: a gift set or several product types in one pack goes to the "sets" subcategory of the category most of its
  // products belong to; a set with a perfume in it is a perfume set. Two sizes joined by "+" ("Крем 50 мл + Околоочен
  // крем 15 мл") are a set too, even when the name does not say so.
  // "7.0 комплект за коса" is a hair-colour kit in shade 7.0.
  if (rx("^\\s?\\d{1,2}[.,/]\\d{1,2}\\s").test(text) && rx("комплект за коса").test(text)) return P("kosa", "boya-za-kosa");
  const bundle = BUNDLE.test(text) && !BONUS.test(text);
  const toolFor = place.category === "aksesoari" && rx("за нанасяне|за почистване на|за премахване на").test(text);
  if ((SET.test(text) || bundle) && place.category !== "higiena" && place.category !== "nokti" && !toolFor) {
    // A named set ("комплект за устни", "lip kit") is a set; the generic "подаръчен комплект" is not a product of it.
    const named = found.find((h) => !h.weak && /komplekti/.test(h.place.sub));
    if (named) return c.men && !c.women && ["tyalo", "litse", "kosa"].includes(named.place.category) ? P("mazhe", "komplekti-mazhe") : named.place;
    // Sun care with extras ("лосион SPF50 + мече + несесер") stays with the sun care.
    if (place.category === "slantse") return place;
    // "Четки за сенки": what a tool is for is not a product of the set.
    const purpose = (h: Hit) => /(?:^|\s)(?:за|for)\s$/u.test(text.slice(Math.max(0, h.index - 5), h.index));
    const items = found.filter((h) => !/komplekti/.test(h.place.sub) && !purpose(h));
    const products = items.filter((h) => h.place.category !== "aksesoari" && h.place.category !== "higiena");
    const kinds = new Set(items.filter((h) => !h.weak).map((h) => `${h.place.category}/${h.place.sub}`));
    const gift = rx("подаръч|подарък|\\bgift\\b").test(text);
    // "Комплект стик + гел + афтършейв", "комплект спрей, афтършейв, пяна": a list of products.
    const at = text.search(rx("комплект|\\bset\\b"));
    const listed = at >= 0 && (
      (text.slice(at).match(/\s\+\s/g)?.length ?? 0) >= 2 ||
      rx("^(?:комплект|set)\\s(?:\\p{L}+(?:\\s\\p{L}+)?\\s?,\\s?){2,}\\p{L}+").test(text.slice(at)) ||
      new Set(found.filter((h) => h.index > at && !h.weak && !/komplekti/.test(h.place.sub)).map((h) => h.place.sub)).size >= 2
    );
    const perfume = products.find((h) => h.place.category === "parfyumi" && h.place.sub !== "mistove");
    if (perfume || (place.category === "parfyumi" && place.sub !== "mistove")) {
      if ((perfume?.place ?? place).sub === "detski-parfyumi") return P("parfyumi", "detski-parfyumi");
      if (gift || bundle || kinds.size >= 2 || rx("комплект|\\bset\\b|\\bсет\\b|\\+|\\bcigars\\b").test(text)) return P("parfyumi", "parfyumni-komplekti");
      return place;
    }
    if (gift || bundle || listed || kinds.size >= 2) {
      // The category with the most kinds of products in the set ("маска за очи + масло за тяло + душ крем" is a body set).
      const votes = new Map<string, number>();
      for (const sub of new Set(products.map((h) => `${h.place.category}/${h.place.sub}`))) {
        const cat = sub.split("/")[0];
        votes.set(cat, (votes.get(cat) ?? 0) + 1);
      }
      const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? place.category;
      const category = (votes.get(place.category) ?? 0) === (votes.get(top) ?? 0) ? place.category : top;
      const forMen = (c.men && !c.women) || products.some((h) => h.place.category === "mazhe");
      if (forMen && ["tyalo", "litse", "kosa", "mazhe"].includes(category)) return P("mazhe", "komplekti-mazhe");
      if (category === "slantse") return products.find((h) => h.place.category === "slantse")?.place ?? place;
      const setSub = SET_SUB[category];
      if (setSub && (products.length || category === place.category)) return P(category, setSub);
    }
  }

  // An oil, mist or spray with a real sun protection factor is a sunscreen ("Спрей олио за слънце SPF6"); so is any oil or
  // lotion of a suncare house.
  const protection = spf(all);
  const sprayOrOil = place.sub !== "losioni" || rx("спрей|spray|олио|масло|\\boil\\b|мляко|\\bmilk\\b|лосион|lotion").test(text);
  if (protection !== undefined && protection >= 6 && sprayOrOil && ["masla-za-tyalo", "losioni", "termalni-vodi", "mistove"].includes(place.sub)) return sunPlace(c);
  if (SUN_BRANDS.test(c.brand.toLowerCase()) && ["masla-za-tyalo", "losioni"].includes(place.sub)) return sunPlace(c);
  // A face cream with SPF 50 is a sunscreen ("SPF50 крем за лице"); a day cream with SPF 50 stays a day cream.
  if (place.sub === "kremove" && protection !== undefined && protection >= 50 && !BABY_CARE.test(all) && !rx("дневен|\\bday\\b").test(text)) {
    return P("slantse", "za-litse");
  }
  // Babies' face creams sit with the other baby care, not with the anti-ageing creams.
  if (place.sub === "kremove" && BABY_CARE.test(all)) return P("tyalo", "losioni");
  // "Нощен околоочен крем", "гел-крем за околоочен контур": the eye area decides, not the generic cream words.
  if (place.sub === "kremove" && EYE_AREA.test(text)) return P("litse", "okoloochen-kontur");
  // A brush or sponge named after the make-up it is for ("Четка на фон дьо тен", "Бронзираща пудра четка", "Concealer
  // Sponges") is a tool, but not "спирала с извита четка", "коректор четка 10" (a brush-tip pen) or "пудра + гъба".
  const tool = text.match(
    rx("(?<!(?:^|[^\\p{L}])(?:с|със|и|with|\\+)(?: \\p{L}+){0,2} )(?:четк(?:а|и|ата|ите) (?:за|на)\\b|(?:пудра|руж|бронзант\\p{L}*|хайлайтър|кабуки) четка(?!\\s?\\d{1,3}\\b)|\\b(?:liner|lip|eye|powder|blush|foundation|kabuki|contour|concealer|brow|fan|blending|shader) brush(?:es)?\\b(?! (?:tip|liner|pen|on))|\\bsponges?\\b|апликатор за грим)"),
  );
  if (place.category === "grim" && tool) return /sponge|апликатор/.test(tool[0]) ? P("aksesoari", "gabi-i-aplikatori") : P("aksesoari", "chetki-za-grim");
  // Brow mascaras and tinted brow gels sold as "спирала".
  if (place.sub === "spirali" && rx("вежди|\\bbrows?\\b").test(text) && !rx("мигли и вежди|вежди и мигли|lash (?:&|and) brow").test(text)) return P("grim", "vezhdi");
  // Sonic and battery toothbrushes.
  if (place.sub === "chetki-za-zabi" && rx("електри\\p{L}*|звуков\\p{L}*|звукочестот\\p{L}*|ултразвуков\\p{L}*|\\bsonic\\p{L}*|hydrosonic|sonicare|на батерии|\\bbattery\\b").test(text)) {
    return P("higiena", "elektricheski-chetki");
  }
  // Make-up tools named after what they are for ("Eyebrow Tweezers") are tools.
  if (place.category === "grim" && rx("(?<!(?:^|[^\\p{L}])(?:с|и) )(?:tweezer\\p{L}*|пинсет\\p{L}*|ножичк\\p{L}*|ножица|бръснач\\p{L}*|острилка|sharpener|извивачка|curler)").test(text)) {
    return P("aksesoari", "instrumenti");
  }
  // Tools from the nail-care words ("Клещи кожички", "Nail Care Ножичка за кожички") go with the manicure tools.
  if (place.sub === "grizha-za-nokti" && NAIL_TOOL.test(text)) return P("nokti", "manikyur");
  // A beauty device named after the make-up it works with ("B-Glossy Blush, Уред за …") is a device.
  if (place.category === "grim" && rx("\\bуред\\b|\\bапарат\\b|\\bdevice\\b").test(text)) return P("aksesoari", "instrumenti");

  // Men's face care lives with the other men's products.
  if (c.men && !c.women && place.category === "litse" && !["termalni-vodi", "komplekti-litse"].includes(place.sub)) {
    return P("mazhe", "grizha-za-mazhe");
  }
  return place;
}

// ── Facts read from the name ──

export function volumeMl(text: string): number | undefined {
  // "50 m" on dental floss is metres, so only "ml"/"мл" count.
  const m = text.match(rx("(\\d+(?:[.,]\\d+)?)\\s?(?:ml|мл)\\b"));
  if (m) {
    const v = Number(m[1].replace(",", "."));
    if (v > 0 && v <= 5000) return v;
  }
  const l = text.match(rx("(\\d+(?:[.,]\\d+)?)\\s?(?:l|л|литра?|литър)\\b"));
  if (l) {
    const v = Number(l[1].replace(",", ".")) * 1000;
    if (v > 0 && v <= 10000) return v;
  }
  return undefined;
}

function weightG(text: string): number | undefined {
  for (const m of text.matchAll(rx("(\\d+(?:[.,]\\d+)?)\\s?(?:g|гр|г|gr|grams?|грама)\\b\\.?", "giu"))) {
    // "0-3 г", "до 4 г.", "3г+" are children's ages (години), not grams.
    const before = text.slice(Math.max(0, m.index - 6), m.index);
    const v = Number(m[1].replace(",", "."));
    if (/\d\s?[-–]\s?$|(?:^|[^\p{L}])(?:до|от|над)\s$/u.test(before) || (v <= 12 && /^\s?\+/.test(text.slice(m.index + m[0].length)))) continue;
    if (v > 0 && v <= 5000) return v;
  }
  return undefined;
}

function pieces(text: string): number | undefined {
  // "5 + 2 бр." is a pack of seven, but not "Mach 3 + 2 бр." (a razor model), "CS 5460 + 6 бр." or "120 бр./2+1 бр.".
  const extra = text.match(
    rx("(?<![\\p{L}\\p{N}/.,])(?<!(?:mach|cs|fusion|xtreme|sensor|blue|hydro|quattro|protector|venus|prestige|turbo|excel|series|серия|model|модел)\\s?)(\\d{1,3})\\s?\\+\\s?(\\d{1,3})\\s?(?:бр|броя|pcs)\\b"),
  );
  if (extra) return Number(extra[1]) + Number(extra[2]);
  const m = text.match(rx("(\\d+)\\s?(?:бр|броя|pcs|pc|pieces)\\b\\.?")) ?? text.match(rx("[xх]\\s?(\\d+)\\s?(?:бр|броя)\\b"));
  if (!m) return undefined;
  const v = Number(m[1]);
  return v >= 2 && v <= 500 ? v : undefined;
}

function spf(text: string): number | undefined {
  const m = text.match(rx("spf\\s?(\\d{1,3})\\+?"));
  return m && Number(m[1]) <= 100 ? Number(m[1]) : undefined;
}

export type GenderCode = "w" | "m" | "u";

const MEN_PERFUME = rx(
  "\\bмтв\\b|\\bмпв\\b|\\bмъжк\\p{L}*|\\bмъже\\b|за мъже|за него\\b|\\bm\\d{3}\\b|\\bhomme\\b|\\bpour homme\\b|\\bfor (?:him|men)\\b|\\bmen\\b|\\bman\\b|\\buomo\\b|\\bmale\\b|\\bhombre\\b|\\bboy\\b|\\bhim\\b|\\bmister\\b|\\bmr\\.|\\bgent\\b|\\bgentleman\\b|(?:,|\\bedt|\\bedp)\\s?(?:м|m|h)\\b|\\b(?:м|m|h)\\s?(?:,|\\bedt|\\bedp)|\\s(?:m|h|м)\\s*$",
);
const WOMEN_PERFUME = rx(
  "\\bдтв\\b|\\bдпв\\b|\\bдамск\\p{L}*|\\bжени\\b|за жени|за нея\\b|\\bw\\d{3}\\b|\\bfemme\\b|\\bpour femme\\b|\\belle\\b|\\bfor (?:her|women)\\b|\\bwom[ae]n\\b|\\blady\\b|\\bgirl\\b|\\bdonna\\b|\\bmujer\\b|\\bher\\b|\\bmiss\\b|\\bqueen\\b|\\bprincess\\b|(?:,|\\bedt|\\bedp)\\s?(?:д|d|w)\\b|\\b(?:д|d|w)\\s?(?:,|\\bedt|\\bedp)|\\s(?:w|d|д)\\s*$",
);

/** Gender of a perfume from the name ("Дамска", "Pour Homme", ", D", " W"). Undefined when the name does not say. */
export function perfumeGender(text: string, brand: string): GenderCode | undefined {
  void brand;
  if (rx("унисекс|\\bunisex\\b").test(text)) return "u";
  const m = MEN_PERFUME.test(text);
  const w = WOMEN_PERFUME.test(text);
  if (m && !w) return "m";
  if (w && !m) return "w";
  return undefined;
}

export function concentration(text: string): "parfum" | "edp" | "edt" | "edc" | "oil" | "mist" | undefined {
  if (rx("парфюмно масло|perfume oil|perfumed oil|\\boil perfume\\b|\\battar\\b|concentrated perfume oil").test(text)) return "oil";
  if (rx("парфюмна вода|парфюмирана вода|eau de parfum|eau de perfume|\\bedp\\b").test(text)) return "edp";
  if (rx("тоалетна вода|eau de toilette|\\bedt\\b").test(text)) return "edt";
  if (rx("одеколон|eau de cologne|\\bcologne\\b|\\bedc\\b").test(text)) return "edc";
  if (rx("парфюмен екстракт|\\bextrait\\b|\\belixir de parfum|концентриран парфюм|\\bparfum\\b|(?<!(?:^|[^\\p{L}])без )\\bпарфюм\\b").test(text)) return "parfum";
  if (rx("\\bмист\\b|\\bmist\\b|спрей за тяло|body spray").test(text)) return "mist";
  return undefined;
}

export type FactsOut = {
  ml?: number; g?: number; pcs?: number; spf?: number; gender?: "w" | "m" | "u" | "k"; conc?: "parfum" | "edp" | "edt" | "edc" | "oil" | "mist";
};

export function factsFor(full: string, place: Place, brand: string): FactsOut {
  const text = matchText(full);
  const facts: FactsOut = {};
  const ml = volumeMl(text);
  if (ml !== undefined) facts.ml = ml;
  else {
    const g = weightG(text);
    if (g !== undefined) facts.g = g;
  }
  const n = pieces(text);
  if (n !== undefined) facts.pcs = n;
  const s = spf(text);
  if (s !== undefined && s >= 2) facts.spf = s;
  if (place.category === "parfyumi") {
    if (place.sub === "detski-parfyumi") facts.gender = "k";
    else {
      const g = place.sub === "mazhki" ? "m" : place.sub === "damski" ? "w" : perfumeGender(text, brand);
      if (g) facts.gender = g;
    }
    const conc = place.sub === "mistove" ? "mist" : concentration(text);
    if (conc) facts.conc = conc;
  }
  return facts;
}

type Tag = "za-nego" | "detsa" | "k-beauty" | "dermokozmetika" | "naturalna" | "balgarska" | "podaratsi";

/** Collections a product belongs to (besides "novo", which the import adds by date). */
export function tagsFor(full: string, place: Place, brand: string): Tag[] {
  const text = matchText(full);
  const tags: Tag[] = [];
  const b = brand.toLowerCase();
  const men = place.category === "mazhe" || place.sub === "mazhki" || (CTX.men.test(text) && !CTX.women.test(text));
  if (men) tags.push("za-nego");
  if (CTX.kids.test(text) || place.sub === "detska" || place.sub === "detski-parfyumi") tags.push("detsa");
  if (K_BEAUTY.has(b)) tags.push("k-beauty");
  if (DERMO.has(b)) tags.push("dermokozmetika");
  if (NATURAL.has(b) || rx("\\bбио\\b|\\bbio\\b|organic|органичн|натурал(?:на|ен|но|ни) (?:козметика|сапун|продукт|крем|масло)|\\bnatural cosmetics\\b|naturkosmetik|сертифициран|\\bвеган|\\bvegan\\b").test(text)) tags.push("naturalna");
  if (BULGARIAN.has(b) || rx("розово масло|роза дамасцена|българска роза|rose of bulgaria|bulgarian rose").test(text)) tags.push("balgarska");
  if (rx("подаръч|подарък|\\bgift\\b").test(text) || ["parfyumni-komplekti", "komplekti-grim", "komplekti-litse", "komplekti-kosa", "komplekti-tyalo", "komplekti-mazhe"].includes(place.sub)) {
    tags.push("podaratsi");
  }
  return tags;
}

const K_BEAUTY = new Set([
  "missha", "medi-peel", "farmstay", "mizon", "la'dor", "rom&nd", "peripera", "mediheal", "aplb", "enough", "doori", "medicube",
  "it's skin", "holika holika", "skin1004", "cosrx", "beauty of joseon", "anua", "round lab", "torriden", "some by mi", "jigott", "snp",
  "kundal", "ottie", "beauugreen", "dr. melaxin", "isntree", "purito", "innisfree", "etude", "etude house", "laneige", "sulwhasoo",
  "the face shop", "tonymoly", "klairs", "heimish", "benton", "pyunkang yul", "iunik", "neogen", "banila co", "a'pieu", "a’peiu", "nacific",
  "dr. jart+", "esthetic house", "3w clinic", "eyenlip", "deoproce", "the saem", "skinfood", "nature republic", "coxir", "ma:nyo",
  "manyo", "numbuzin", "abib", "mixsoon", "axis-y", "haruharu wonder", "jumiso", "celimax", "dr.ceuracle", "tirtir", "clio", "dasique",
  "elizavecca", "frudia", "secret key", "petitfee", "lebelage", "jm solution", "isov", "goodal", "vt cosmetics", "d'alba", "aestura",
  "illiyoon", "ample:n", "skin&lab", "by wishtrend", "iope", "hera", "papa recipe", "berrisom", "g9skin", "unpa", "mediflower",
  "daeng gi meo ri", "ryo", "masil", "dr. althea", "yadah", "kocostar", "hibiskin", "as:us", "purederm", "bear fruits", "dr. ceuracle",
  "ahc", "skin79", "tony moly", "neulii", "esfolio", "ekel", "jayjun", "bergamo", "dear doer", "dr.g", "mary&may",
]);
const DERMO = new Set([
  "vichy", "la roche-posay", "avène", "bioderma", "uriage", "eucerin", "svr", "ducray", "klorane", "a-derma", "lierac", "apivita", "nuxe",
  "rené furterer", "mustela", "sebamed", "topicrem", "noreva", "isdin", "cerave", "filorga", "institut esthederm", "jowaé", "dermedic",
  "frezyderm", "phyto", "elgydium", "korff", "neostrata", "sesderma", "heliocare", "acm", "cetaphil", "biotrade", "inopharm", "galenic",
  "caudalie", "embryolisse", "skinceuticals", "mixa", "neutrogena", "the ordinary", "skincyclopedia", "pharmaceris", "iwostin", "emolium",
  "hada labo", "aveeno", "physiogel", "pranarom", "synchroline", "luxéol", "collagena", "babé", "transparent lab", "byphasse",
]);
const NATURAL = new Set([
  "lavera", "benecos", "speick", "urtekram", "wooden spoon", "alverde", "weleda", "dr. konopka's", "organic shop", "cosnature", "logona",
  "sante", "dmbio", "mádara", "ce'bio", "alteya organics", "biofresh", "nature of agiva", "rose of bulgaria", "bilka", "la saponaria",
  "comptoir des lys", "the humble co.", "zoya goes pretty", "tri-bio", "fleurance nature", "barwa", "biobaza", "eterika", "napiers",
  "hawkins & brimble", "naturelle with love", "bioherba", "bioapteka", "natura siberica", "green line", "dr. hauschka", "annemarie börlind",
  "eubiona", "kneipp", "cattier", "melvita", "lamazuna", "khadi", "neobio", "attitude", "friendly organic", "organyc", "argital",
  "bio-d", "benessence", "plant therapy", "ikarov", "mastiha", "naturando",
]);
const BULGARIAN = new Set([
  "bulgarian rose", "rose of bulgaria", "nature of agiva", "aroma", "regal", "бочко", "zdrave", "здраве", "bilka", "biofresh",
  "victoria beauty", "ikarov", "refan", "lavena", "rivana", "astera", "alteya organics", "zoya goes pretty", "dermicos", "biotrade",
  "inopharm", "leganza", "milva", "herbs of bulgaria", "naturelle with love", "ellie", "rosa impex", "sun like",
]);
