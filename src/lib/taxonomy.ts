// Categories, subcategories and collections of the shop. Ids are the URL slugs (Bulgarian, transliterated).
// The import (scripts/rules.ts) sorts every product into exactly one category/subcategory; collections are
// cross-category groups computed from brand and name (Korean beauty, derma, natural, for men...).

export type Sub = {
  id: string;
  name: string;
  /** Heading the subcategory is listed under in the menu ("Лице", "Очи", "Устни" for make-up). */
  group?: string;
};

export type Category = {
  id: string;
  name: string;
  /** One line under the title of the category page. */
  intro: string;
  subs: Sub[];
};

export const CATEGORIES: Category[] = [
  {
    id: "grim",
    name: "Грим",
    intro: "Фон дьо тен, спирали, червила и всичко между тях — от любимите класики до новите нюанси на сезона.",
    subs: [
      { id: "fon-dyo-ten", name: "Фон дьо тен", group: "Лице" },
      { id: "bb-i-cc-kremove", name: "BB и CC кремове", group: "Лице" },
      { id: "korektori", name: "Коректори", group: "Лице" },
      { id: "pudri", name: "Пудри", group: "Лице" },
      { id: "ruzh", name: "Руж", group: "Лице" },
      { id: "bronzanti-i-kontur", name: "Бронзанти и контур", group: "Лице" },
      { id: "haylaytari", name: "Хайлайтъри", group: "Лице" },
      { id: "osnovi-i-fiksatori", name: "Основи и фиксатори", group: "Лице" },
      { id: "spirali", name: "Спирали", group: "Очи" },
      { id: "ochni-linii", name: "Очни линии", group: "Очи" },
      { id: "molivi-za-ochi", name: "Моливи за очи", group: "Очи" },
      { id: "senki-za-ochi", name: "Сенки за очи", group: "Очи" },
      { id: "vezhdi", name: "Вежди", group: "Очи" },
      { id: "migli", name: "Мигли", group: "Очи" },
      { id: "chervila", name: "Червила", group: "Устни" },
      { id: "glantsove", name: "Гланцове и олиа за устни", group: "Устни" },
      { id: "molivi-za-ustni", name: "Моливи за устни", group: "Устни" },
      { id: "balsami-za-ustni", name: "Балсами за устни", group: "Устни" },
      { id: "komplekti-grim", name: "Комплекти и палитри", group: "Още" },
    ],
  },
  {
    id: "litse",
    name: "Лице",
    intro: "Почистване, серуми и кремове за всеки тип кожа — подредени така, както ги нанасяте.",
    subs: [
      { id: "pochistvane", name: "Почистване и демакиаж", group: "Стъпки" },
      { id: "tonitsi", name: "Тоници и есенции", group: "Стъпки" },
      { id: "serumi", name: "Серуми и ампули", group: "Стъпки" },
      { id: "kremove", name: "Кремове за лице", group: "Стъпки" },
      { id: "okoloochen-kontur", name: "Околоочен контур", group: "Стъпки" },
      { id: "maski", name: "Маски за лице", group: "Специална грижа" },
      { id: "eksfolianti", name: "Пилинги и ексфолианти", group: "Специална грижа" },
      { id: "masla-za-litse", name: "Масла за лице", group: "Специална грижа" },
      { id: "termalni-vodi", name: "Термални води и мистове", group: "Специална грижа" },
      { id: "komplekti-litse", name: "Комплекти за лице", group: "Специална грижа" },
    ],
  },
  {
    id: "parfyumi",
    name: "Парфюми",
    intro: "Парфюмни и тоалетни води, ароматни мистове и подаръчни комплекти.",
    subs: [
      { id: "damski", name: "Дамски парфюми" },
      { id: "mazhki", name: "Мъжки парфюми" },
      { id: "uniseks", name: "Унисекс парфюми" },
      { id: "nishovi", name: "Нишови парфюми" },
      { id: "parfyumni-komplekti", name: "Парфюмни комплекти" },
      { id: "mistove", name: "Ароматни мистове за тяло" },
      { id: "detski-parfyumi", name: "Детски парфюми" },
    ],
  },
  {
    id: "kosa",
    name: "Коса",
    intro: "Шампоани, маски и стилизиране — за обем, блясък и коса, която се слуша.",
    subs: [
      { id: "shampoani", name: "Шампоани", group: "Измиване" },
      { id: "balsami", name: "Балсами", group: "Измиване" },
      { id: "maski-za-kosa", name: "Маски за коса", group: "Измиване" },
      { id: "bez-otmivane", name: "Грижа без отмиване", group: "Грижа" },
      { id: "serumi-i-olia", name: "Серуми и олиа", group: "Грижа" },
      { id: "skalp", name: "Скалп и косопад", group: "Грижа" },
      { id: "stilizirane", name: "Стилизиране", group: "Стил и цвят" },
      { id: "uredi-za-kosa", name: "Сешоари и преси", group: "Стил и цвят" },
      { id: "boya-za-kosa", name: "Боя за коса", group: "Стил и цвят" },
      { id: "komplekti-kosa", name: "Комплекти за коса", group: "Стил и цвят" },
    ],
  },
  {
    id: "tyalo",
    name: "Тяло",
    intro: "Душ гелове, лосиони и масла — малките ритуали, с които денят започва и свършва.",
    subs: [
      { id: "dush-gelove", name: "Душ гелове и пяни", group: "Баня" },
      { id: "sapuni", name: "Сапуни", group: "Баня" },
      { id: "skrabove", name: "Скрабове", group: "Баня" },
      { id: "vana", name: "Соли и бомбички за вана", group: "Баня" },
      { id: "losioni", name: "Лосиони и кремове", group: "Грижа" },
      { id: "masla-za-tyalo", name: "Масла за тяло", group: "Грижа" },
      { id: "eterichni-masla", name: "Етерични масла", group: "Грижа" },
      { id: "ratse-i-kraka", name: "Ръце и крака", group: "Грижа" },
      { id: "dezodoranti", name: "Дезодоранти", group: "Свежест" },
      { id: "epilatsia", name: "Епилация", group: "Свежест" },
      { id: "komplekti-tyalo", name: "Комплекти за тяло", group: "Свежест" },
    ],
  },
  {
    id: "nokti",
    name: "Нокти",
    intro: "Лакове, гел лакове и всичко за маникюр у дома.",
    subs: [
      { id: "lakove", name: "Лакове за нокти" },
      { id: "gel-lakove", name: "Гел лакове" },
      { id: "osnovi-i-top", name: "Основи и топ лакове" },
      { id: "grizha-za-nokti", name: "Грижа за нокти" },
      { id: "lakochistiteli", name: "Лакочистители" },
      { id: "manikyur", name: "Маникюр и педикюр" },
    ],
  },
  {
    id: "slantse",
    name: "Слънце",
    intro: "Слънцезащита за лице и тяло, грижа след слънце и тен без слънце.",
    subs: [
      { id: "za-litse", name: "Слънцезащита за лице" },
      { id: "za-tyalo", name: "Слънцезащита за тяло" },
      { id: "detska", name: "Детска слънцезащита" },
      { id: "sled-slantse", name: "След слънце" },
      { id: "avtobronzanti", name: "Автобронзанти" },
    ],
  },
  {
    id: "mazhe",
    name: "Мъже",
    intro: "Бръснене, брада и грижа за кожата — без излишни стъпки.",
    subs: [
      { id: "brasnene", name: "Бръснене" },
      { id: "aftarsheyv", name: "Афтършейв" },
      { id: "brada", name: "Брада и мустаци" },
      { id: "grizha-za-mazhe", name: "Грижа за лице" },
      { id: "komplekti-mazhe", name: "Комплекти за мъже" },
    ],
  },
  {
    id: "higiena",
    name: "Хигиена",
    intro: "Устна и интимна хигиена — всекидневното, което трябва да е под ръка.",
    subs: [
      { id: "pasti-za-zabi", name: "Пасти за зъби", group: "Устна хигиена" },
      { id: "chetki-za-zabi", name: "Четки за зъби", group: "Устна хигиена" },
      { id: "elektricheski-chetki", name: "Електрически четки", group: "Устна хигиена" },
      { id: "vodi-za-usta", name: "Води за уста", group: "Устна хигиена" },
      { id: "interdentalni", name: "Конци и интердентални четки", group: "Устна хигиена" },
      { id: "damska-higiena", name: "Дамска хигиена", group: "Лична хигиена" },
      { id: "intimna-higiena", name: "Интимна хигиена", group: "Лична хигиена" },
      { id: "mokri-karpichki", name: "Мокри кърпички", group: "Лична хигиена" },
      { id: "pamuchni", name: "Памучни тампони и клечки", group: "Лична хигиена" },
    ],
  },
  {
    id: "aksesoari",
    name: "Аксесоари",
    intro: "Четки, гъби, гребени и несесери — инструментите, които правят разликата.",
    subs: [
      { id: "chetki-za-grim", name: "Четки за грим" },
      { id: "gabi-i-aplikatori", name: "Гъби и апликатори" },
      { id: "chetki-za-kosa", name: "Четки и гребени" },
      { id: "za-kosa", name: "Шноли, фиби и ластици" },
      { id: "instrumenti", name: "Пинсети, огледала и инструменти" },
      { id: "za-banya", name: "За баня и душ" },
      { id: "neseseri", name: "Несесери" },
    ],
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function findSub(category: string, sub: string): Sub | undefined {
  return CATEGORY_BY_ID.get(category)?.subs.find((s) => s.id === sub);
}

// ── Collections ──

export type CollectionId = "novo" | "za-nego" | "detsa" | "k-beauty" | "dermokozmetika" | "naturalna" | "balgarska" | "podaratsi";

export type Collection = { id: CollectionId; name: string; title: string; intro: string };

export const COLLECTIONS: Collection[] = [
  { id: "novo", name: "Ново", title: "Нови продукти", intro: "Последните попълнения в каталога — нови марки, нови формули, нови нюанси." },
  {
    id: "k-beauty",
    name: "K-Beauty",
    title: "Корейска козметика",
    intro: "Есенции, шийт маски и кремове с центела, муцин и ферментирали съставки от Сеул.",
  },
  {
    id: "dermokozmetika",
    name: "Дермокозметика",
    title: "Дермокозметика",
    intro: "Аптечни марки, създадени с дерматолози — за чувствителна, суха и проблемна кожа.",
  },
  {
    id: "naturalna",
    name: "Натурална",
    title: "Натурална и био козметика",
    intro: "Сертифицирана био козметика и формули с растителни масла, екстракти и без излишни добавки.",
  },
  {
    id: "balgarska",
    name: "Българска",
    title: "Българска козметика",
    intro: "Розово масло, билки и мед — марки, родени в България.",
  },
  { id: "podaratsi", name: "Подаръци", title: "Подаръчни комплекти", intro: "Готови комплекти, които не се нуждаят от опаковане." },
  { id: "za-nego", name: "За него", title: "За него", intro: "Парфюми, бръснене и грижа за мъже." },
  { id: "detsa", name: "Деца", title: "Деца и бебета", intro: "Нежни формули за най-малките — от първата баня до първия парфюм." },
];

export const COLLECTION_BY_ID = new Map(COLLECTIONS.map((c) => [c.id, c]));
