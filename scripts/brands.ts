// Brand clean-up: one spelling per brand ("CATRICE", "Catrice", "Катрис" → Catrice), the real brand for rows that only
// name a distributor ("L'oreal bg", "Procter & Gamble", "#N/A"), and the brand taken off the front of the product name.

import { decodeEntities, fixMixedScript } from "./rules";

/** Comparison key: lower case, no accents, letters and digits only. */
export function brandKey(value: string): string {
  const v = fixMixedScript(decodeEntities(value)).trim();
  const ascii = /[A-Za-z]/.test(v) ? v.normalize("NFKD").replace(/[\u0300-\u036f]/g, "") : v;
  return ascii.toLowerCase().replace(/[^0-9a-zа-я]+/g, "");
}

/** Brand column values that are not brands. */
const NOT_BRANDS = new Set([
  "henkelagcokgaa1", "humanprotect", "другимарки", "лавенаадбулдент",
  "", "na", "none", "nan", "0", "proctergamble", "essity", "lorealbg", "pierrefabredermokosmetik", "johnsonjohnsondoo", "kids",
  "otherbrands", "generic", "nobrand", "unbranded", "unilever", "henkel", "beiersdorf", "coty", "orbico", "makeupfinishin",
  "generalfresh", "jtiperfumes", "sopharmaplcsofia", "unknown", "brand", "noname", "beautypersonalcare", "lillydrogerie",
  "sonstige", "unbekannt", "other", "others", "diverse", "various", "misc", "асортимент", "combsbrushes", "facepowders",
  "generaltopicsdistribution", "generaltopics", "haircare", "skincare", "cosmetics", "makeup", "beauty", "drogerie", "bio", "био",
  "organic", "natural", "vip", "wh", "promo", "new", "ново", "nonbrand", "privatelabel",
  // distributors, and supplement or food brands written on cosmetics rows
  "amix", "myprotein", "appliednutrition", "fanutrition", "scitecnutrition", "swanson", "doublewoodsupplements", "freelife", "nestle",
  "други", "drugi", "aftershave", "366", "johnsonjohnson", "generaltopicsdeutschland", "amperel", "queisser", "alliance", "sinclaer",
  "padu", "caruno", "empeak", "queisserpharma", "sinclaerpharma", "abopharma", "alliancepharmaceuticals", "rayatoys", "xavax",
]);
/** Brand values that look like an export category ("Combs & Brushes", "Face Powders", "Eye Shadow"). */
const CATEGORY_LIKE =
  /^(?:combs? & brushes|brushes|face powders|powders|make[- ]?up finishin\p{L}*(?: sprays?)?|makeup sets|lip make[- ]?up|make[- ]?up removers|hair care|skin ?care|make[- ]?up|cosmetics & .*|beauty & .*|personal care|accessories|eye ?shadow|lip ?gloss|face primer|foundations|mouthwash|toothpaste|assorted|colorete)$/iu;

/**
 * Company names in the brand column ("ASAM GMBH & CO. BETRIEBS - KG", "ISISPHARMA-FRANCE", "Ladrome laboratoire",
 * "ЗЕДА ЕООД") are cut down to the name the shoppers know.
 */
function companyBrand(value: string): string {
  let v = value.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    v = v
      .replace(/\s+(?:gesellschaft|naturwaren)\b.*$/iu, "")
      .replace(/[\s,]+(?:gmbh(?:\s*&\s*co\.?)?(?:\s*betriebs)?(?:\s*-?\s*kg)?|&\s*co\.?(?:\s*kg)?|kg|ag|ltd\.?|limited|inc\.?|llc|sarl|sas|s\.\s?a\.?|s\.\s?l\.?|s\.r\.l\.?|s\.p\.a\.?|b\.v\.?|sp\.\s?z\s?o\.o\.|е?оод|ад)$/iu, "")
      .replace(/[\s-]+(?:france|italy|germany|deutschland|polska|int\.?)$/iu, "")
      .replace(/^(?:sas\s+)?laboratoires?\s+|\s+laboratoires?$/iu, "")
      .trim();
  }
  return v;
}

/** Spelling variants and sub-lines that belong to one brand, and the brand's own styling of its name. */
const CANON: Record<string, string> = {
  // Lines, company suffixes and spellings that split one brand into several brand pages
  alverdenaturkosmetikmen: "alverde", alverdebaby: "alverde", alverdenaturschon: "alverde", laveranaturkosmetik: "lavera",
  hurrawbalm: "Hurraw", argitaldigferrarocsnc: "Argital", hadalabotokyo: "Hada Labo", chamoscosmetics: "Chamos", parsa: "Parsa Beauty",
  parsamen: "Parsa Beauty", aromacream: "Aroma", dontodentpro: "Dontodent", rexonamen: "Rexona", afroditacosmetics: "Afrodita",
  splatprofessional: "SPLAT", biofreshcosmetics: "BioFresh", hairmajestyprofessional: "Hair Majesty", philipsoneblade: "Philips",
  farmonasweetsecret: "Farmona", chiccocosmetics: "Chicco", belldefinesbeauty: "Bell", bellpphu: "Bell", afnanperfumes: "Afnan",
  schwarzkopfmenperfect: "Schwarzkopf", schwarzkopftaft: "Schwarzkopf", schwarzkopflive: "Schwarzkopf",
  lorealparisrevitalift: "L'Oréal Paris", lorealparismenexpert: "L'Oréal Paris", lorealparisexcellencecreme: "L'Oréal Paris",
  loralparisexcellence: "L'Oréal Paris", lorealparismagicretouch: "L'Oréal Paris", lorealpariselseve: "L'Oréal Paris",
  preference: "L'Oréal Paris", artdecoasianspa: "ARTDECO", skindoctorscosmeceuticals: "Skin Doctors", senitzmo: "Seni",
  iv: "Inter-Vion", interv: "Inter-Vion", intervion: "Inter-Vion", palettedeluxe: "Palette", miamanteprofessional: "Mi Amante",
  puritoseoul: "Purito", babylovenature: "babylove", jessadiskret: "Jessa", mixababy: "Mixa", standelliprofessional: "Standelli",
  garnierbody: "Garnier", agivabath: "Agiva", kokonacosmetics: "Kokona", vianaturalpomegranateandrose: "Via natural",
  каро: "Karo", intenso: "The English Soap Company", bravenewhair: "Brave.New.Hair", kingcgillette: "King C. Gillette", visiomedbiosynex: "Visiomed",
  goldenrose: "Golden Rose", revolution: "Revolution", makeuprevolution: "Revolution", iheartrevolution: "Revolution",
  relovebyrevolution: "Revolution", revolutionpro: "Revolution", revolutionskincare: "Revolution", revolutionhaircare: "Revolution",
  revolutionbeauty: "Revolution", catrice: "Catrice", катрис: "Catrice", essence: "essence", есенс: "essence", nivea: "Nivea",
  niveasun: "Nivea", niveamen: "Nivea", нивеа: "Nivea", velnea: "Velnea", nyxprofessionalmakeup: "NYX Professional Makeup",
  nyx: "NYX Professional Makeup", nyxprofessionalmakeupmakeup: "NYX Professional Makeup", wibo: "Wibo", artdeco: "ARTDECO",
  flormar: "Flormar", aura: "Aura", balea: "Balea", baleamen: "Balea", baleaprofessional: "Balea", baleamed: "Balea",
  alverdenaturkosmetik: "alverde", alverde: "alverde", bell: "Bell", bellhypoallergenic: "Bell", hypoallergenic: "Bell",
  lovely: "Lovely", trendtup: "trend !t up", titania: "Titania", eveline: "Eveline Cosmetics", evelinecosmetics: "Eveline Cosmetics",
  revlon: "Revlon", bourjois: "Bourjois", bourjoisparis: "Bourjois", lorealparis: "L'Oréal Paris", loreal: "L'Oréal Paris",
  loral: "L'Oréal Paris", lorealcosmetics: "L'Oréal Paris", elseve: "L'Oréal Paris", casting: "L'Oréal Paris",
  excellencecolor: "L'Oréal Paris", excellence: "L'Oréal Paris", lavera: "lavera", gosh: "GOSH Copenhagen",
  goshcopenhagen: "GOSH Copenhagen", llums: "Llums", uriage: "Uriage", delia: "Delia Cosmetics", deliacosmetics: "Delia Cosmetics",
  bioderma: "Bioderma", abc: "ABC", maybellinenewyork: "Maybelline New York", maybellinenewyorkmup: "Maybelline New York",
  maybelline: "Maybelline New York", dove: "Dove", eucerin: "Eucerin", syoss: "Syoss", gillette: "Gillette", idc: "IDC Institute",
  idcinstitute: "IDC Institute", vzk: "VZK", philipssonicare: "Philips", philips: "Philips", vichy: "Vichy",
  pierrecardin: "Pierre Cardin", larive: "La Rive", bulgarianrose: "Bulgarian Rose", avene: "Avène", aroma: "Aroma",
  pantene: "Pantene", farmona: "Farmona", natureofagiva: "Nature of Agiva", garnier: "Garnier", missha: "Missha", oralb: "Oral-B",
  yvesrocher: "Yves Rocher", palette: "Palette", farmstay: "FarmStay", klorane: "Klorane", sebamed: "Sebamed", medipeel: "Medi-Peel",
  nam: "NAM", maxfactor: "Max Factor", larocheposay: "La Roche-Posay", gum: "GUM", woodenspoon: "Wooden Spoon", gliss: "Gliss",
  chi: "CHI", benecos: "Benecos", speick: "Speick", bioten: "Bioten", lumene: "Lumene", rexona: "Rexona", nlbeauty: "NL Beauty",
  elgydium: "Elgydium", ziaja: "Ziaja", trisa: "Trisa", farmonaprofessional: "Farmona Professional", malizia: "Malizia",
  milani: "Milani", johnfrieda: "John Frieda", mustela: "Mustela", ardell: "Ardell", apivita: "Apivita", fa: "Fa",
  always: "Always", organicshop: "Organic Shop", bel: "Bel London", bellondon: "Bel London", colgate: "Colgate",
  antoniobanderas: "Antonio Banderas", oldspice: "Old Spice", neutrogena: "Neutrogena", wellaprofessionals: "Wella Professionals",
  victoriabeauty: "Victoria Beauty", aderma: "A-Derma", lador: "La'dor", aquafresh: "Aquafresh", perlier: "Perlier",
  biobaza: "Biobaza", lierac: "Lierac", svr: "SVR", tesoridoriente: "Tesori d'Oriente", braun: "Braun", essie: "Essie",
  essiecosmetics: "Essie", schauma: "Schauma", sundance: "Sundance", babe: "Babé", cuba: "Cuba", bilka: "Bilka", ikarov: "Ikarov",
  mixa: "Mixa", nuxe: "Nuxe", jordan: "Jordan", renefurterer: "René Furterer", palmers: "Palmer's", viviennesabo: "Vivienne Sabó",
  viviennesaboparis: "Vivienne Sabó", prestige: "Prestige", w7: "W7", bochko: "Бочко", бочко: "Бочко", curaprox: "Curaprox",
  taft: "Taft", phyto: "Phyto", ebelin: "ebelin", ebelinprofessional: "ebelin", zdrave: "Здраве", здраве: "Здраве", bella: "Bella",
  mizon: "Mizon", romnd: "rom&nd", str8: "STR8", lorenay: "Lorenay", marion: "Marion",
  lorealprofessionnelparis: "L'Oréal Professionnel", lorealprofessionnel: "L'Oréal Professionnel", rivana: "Rivana",
  sensodyne: "Sensodyne", ducray: "Ducray", lacalut: "Lacalut", palmolive: "Palmolive", biofresh: "BioFresh", lycia: "Lycia",
  biotrade: "Biotrade", inopharm: "Inopharm", zoyagoespretty: "Zoya Goes Pretty", aplb: "APLB", medicube: "Medicube",
  itsskin: "It's Skin", theenglishsoapcompany: "The English Soap Company", biobalance: "Biobalance", cameleo: "Cameleo",
  miamante: "Mi Amante", "21cosmetics": "21 Cosmetics", headshoulders: "Head & Shoulders", wetnwild: "wet n wild",
  redken: "Redken", jacquesbattini: "Jacques Battini", korres: "Korres", dontodent: "Dontodent", nordics: "Nordics",
  orjena: "Orjena", opi: "OPI", barwa: "Barwa", yesss: "Yesss", kolora: "Kolora", scottishfinesoaps: "Scottish Fine Soaps",
  himalaya: "Himalaya", tomtailor: "Tom Tailor", jessa: "Jessa", esthederm: "Institut Esthederm", astera: "Astera",
  crazyrumors: "Crazy Rumors", chicco: "Chicco", luxeol: "Luxéol", versetheatlhbeauty: "Verset", verset: "Verset", versetparfums: "Verset",
  dermicos: "Dermicos", langelica: "L'Angelica", airval: "Air-Val", dooricosmetics: "Doori", doori: "Doori", oclean: "Oclean",
  bfresh: "B.fresh", coscentra: "Coscentra", korff: "Korff", purederm: "Purederm", cebio: "Ce'Bio", profusion: "Profusion",
  kyliecosmetics: "Kylie Cosmetics", wilkinsonsword: "Wilkinson Sword", wilkinson: "Wilkinson Sword",
  lrhealthbeauty: "LR Health & Beauty", elmex: "elmex", isdin: "ISDIN", topicrem: "Topicrem", marshmallow: "Marshmallow",
  dermedic: "Dermedic", schaebens: "Schaebens", nike: "Nike", pompea: "Pompea", parsabeauty: "Parsa Beauty", parsa20: "Parsa Beauty",
  "3chenes": "3 Chênes", cerave: "CeraVe", weleda: "Weleda", eterika: "Eterika", naturella: "Naturella",
  womensecret: "Women'secret", calvinklein: "Calvin Klein", karllagerfeld: "Karl Lagerfeld", faro: "Faro", listerine: "Listerine",
  nichebeautylabsltransparentlab: "Transparent Lab", transparentlab: "Transparent Lab", skincyclopedia: "Skincyclopedia",
  collagena: "Collagena", stmoritz: "St. Moriz", stmoriz: "St. Moriz", facefacts: "Face Facts", madara: "Mádara",
  treaclemoon: "Treaclemoon", linziclip: "LinziClip", soliver: "s.Oliver", dolcegabbana: "Dolce&Gabbana", everyday: "Everyday",
  babylove: "babylove", drkonopkas: "Dr. Konopka's", alteyaorganics: "Alteya Organics", leestafford: "Lee Stafford",
  venus: "Venus", sunlike: "Sun Like", dmbio: "dmBio", peripera: "Peripera", napiers: "Napiers", wellaflex: "Wellaflex",
  roseofbulgaria: "Rose of Bulgaria", urtekram: "Urtekram", yardleylondon: "Yardley London", yardley: "Yardley London",
  enough: "Enough", jigott: "Jigott", fleurancenature: "Fleurance Nature", parodontax: "Parodontax", intesa: "Intesa",
  hadalabo: "Hada Labo", libresse: "Libresse", vitabay: "Vitabay", lattafa: "Lattafa", bu: "B.U.", leganza: "Leganza",
  hellosmile: "Hello Smile", dentility: "Dentility", babycare: "Baby Care", hipp: "HiPP", cosnature: "cosnature",
  filorga: "Filorga", cocosolis: "Cocosolis", herbaltime: "Herbal Time", byphasse: "Byphasse", drmelaxin: "Dr. Melaxin",
  bettybarclay: "Betty Barclay", adidas: "adidas", nishane: "Nishane", tepe: "TePe", londacolor: "Londa Professional",
  londa: "Londa Professional", fairness: "Fairness", bioherba: "Bioherba", topten: "Top Ten", yoskine: "Yoskine", mexx: "Mexx",
  carroten: "Carroten", regal: "Regal", bebo: "Bebo", babyono: "BabyOno", synchroline: "Synchroline",
  thehumbleco: "The Humble Co.", eylure: "Eylure", medix: "Medix", staywell: "Stay Well", matrix: "Matrix",
  blackwhite: "Black & White", lilly: "Lilly", moe28: "MOE28", mammababy: "Mamma & Baby", baladeenprovence: "Balade en Provence",
  batiste: "Batiste", holikaholika: "Holika Holika", chlapuchlap: "Chlapu Chlap", cutrin: "Cutrin", pepejeans: "Pepe Jeans",
  pierrot: "Pierrot", hugoboss: "Hugo Boss", hugo: "Hugo Boss", lakme: "Lakmé", yasumi: "Yasumi",
  londaprofessional: "Londa Professional", hairmate: "Hairmate", wellaton: "Wellaton", kryakrya: "Krya-Krya", ob: "o.b.",
  ootdbeauty: "OOTD Beauty", cotedazur: "Côte d'Azur", elizabetharden: "Elizabeth Arden", realtechniques: "Real Techniques",
  sabrinacarpenter: "Sabrina Carpenter", elode: "Elode", armaf: "Armaf", soapfactory: "Soap Factory", babycrema: "Baby Crema",
  bettinabarty: "Bettina Barty", colorsensation: "Garnier", bioapteka: "Bioapteka", blanx: "BlanX", visage: "Visage",
  discreet: "Discreet", florinda: "Florinda", milvaproduct: "Milva", milva: "Milva",
  sensillo: "Sensillo", tresemme: "TRESemmé", ogx: "OGX", pizbuin: "Piz Buin", cthru: "C-Thru", palomita: "Palomita",
  milmil: "Mil Mil", reginaroses: "Regina Roses", diamondrose: "Diamond Rose", deba: "Deba", lasaponaria: "La Saponaria",
  christianlaurent: "Christian Laurent", ahavadsl: "AHAVA", ahava: "AHAVA", hawkinsbrimble: "Hawkins & Brimble",
  dentaid: "Dentaid", dentaidvitis: "Dentaid", tribio: "Tri-Bio", bornwinner: "Born Winner", nofear: "No Fear",
  revoxb77: "Revox B77", revox: "Revox B77", snp: "SNP", schwarzkopfcremesupreme: "Schwarzkopf", schwarzkopf: "Schwarzkopf",
  spumadisciampagna: "Spuma di Sciampagna", olibanum: "Olibanum", frezyderm: "Frezyderm", dorall: "Dorall Collection",
  dorallcollection: "Dorall Collection", kent: "Kent", lipsmacker: "Lip Smacker", coslys: "Coslys", jimmychoo: "Jimmy Choo",
  furla: "Furla", ottie: "Ottie", comptoirdeslys: "Comptoir des Lys", kiflab: "Kiflab", theordinary: "The Ordinary",
  jowae: "Jowaé", microcell2000: "Microcell 2000", savondumidi: "Savon du Midi", martinispa: "Martini Spa", padu: "Padu",
  kundal: "Kundal", beauugreen: "Beauugreen", irohanature: "Iroha Nature", skin1004: "SKIN1004", revuele: "Revuele",
  karlminck: "Karl Minck", burberry: "Burberry", robertocavalli: "Roberto Cavalli", dermacol: "Dermacol", lastva: "Lastva",
  drasca: "Drasca", asamkrauterhof: "Asam", martinelia: "Martinelia", essentialparfums: "Essential Parfums", rimmel: "Rimmel",
  rimmellondon: "Rimmel", alfaparf: "Alfaparf Milano", alfaparfmilano: "Alfaparf Milano", maisonalhambra: "Maison Alhambra",
  alhambra: "Maison Alhambra", alharamain: "Al Haramain", swissarabian: "Swiss Arabian", carnerbarcelona: "Carner Barcelona",
  blendoud: "Blend Oud", newnotes: "New Notes", goldfieldbanks: "Goldfield & Banks", tizianaterenzi: "Tiziana Terenzi",
  xerjoff: "Xerjoff", kayali: "Kayali", chopard: "Chopard", carven: "Carven", azzaro: "Azzaro", cerruti1881: "Cerruti",
  cerruti: "Cerruti", dkny: "DKNY", kenzo: "Kenzo", moschino: "Moschino", liujo: "Liu Jo", davidoff: "Davidoff",
  bugatti: "Bugatti", rituals: "Rituals", chevignon: "Chevignon", jilsander: "Jil Sander", thierrymugler: "Mugler", mugler: "Mugler",
  hermes: "Hermès", sheglam: "SHEGLAM", nuksbebe: "NUK", nuk: "NUK", bh: "BH Cosmetics", bhcosmetics: "BH Cosmetics",
  rocs: "R.O.C.S.", splat: "SPLAT", ecodenta: "Ecodenta", interprox: "Interprox", vitis: "Dentaid", signal: "Signal",
  blendamed: "Blend-a-med", meridol: "meridol", elmexsensitive: "elmex", glimo: "Glimo", jordanoral: "Jordan", nverde: "Nverde",
  wenko: "Wenko", eclat: "Éclat", thebodyshop: "The Body Shop", sanex: "Sanex", axe: "Axe", ax: "Axe", adidasmen: "adidas",
  playboy: "Playboy", fructis: "Garnier", garnierfructis: "Garnier", skinnaturals: "Garnier", ambresolaire: "Garnier",
  hydraextreme: "Maybelline New York", colorsensational: "Maybelline New York", fitme: "Maybelline New York",
  lifestyle: "Lifestyle", lpro: "L'Oréal Professionnel", wella: "Wella", wellakoleston: "Wella", koleston: "Wella",
  andreia: "Andreia", goldenlady: "Golden Lady", tesori: "Tesori d'Oriente", vivienne: "Vivienne Sabó", boss: "Hugo Boss",
  "dr.tishaac7": "Dr. Tisha AC7", drtishaac7: "Dr. Tisha AC7", biotradebg: "Biotrade", babylovebaby: "babylove",
  gillettevenus: "Gillette", venusgillette: "Gillette", avenesun: "Avène", eauthermaleavene: "Avène", phytocolor: "Phyto",
  colornaturals: "Garnier", garnierskinnaturals: "Garnier", лиерак: "Lierac", theenglishsoapco: "The English Soap Company",
  esc: "The English Soap Company", mrgroomer: "Mister Groomer", mistergroomer: "Mister Groomer", sebastianprofessional: "Sebastian Professional",
  kerastase: "Kérastase", olaplex: "Olaplex", moroccanoil: "Moroccanoil", aquaphor: "Eucerin", cicaplast: "La Roche-Posay",
  wsgillette: "Gillette", btan: "b.tan", rosaimpex: "Rosa Impex", dralthea: "Dr. Althea", deardoer: "Dear Doer",
  lacalutaktiv: "Lacalut", veet: "Veet", silkepil: "Braun", remington: "Remington", rowenta: "Rowenta", beurer: "Beurer",
  babyliss: "BaByliss", babylisspro: "BaByliss", dyson: "Dyson", panasonic: "Panasonic", oralbbraun: "Oral-B",
  // Perfume and make-up houses, so rows without a brand column still get theirs from the name.
  joop: "JOOP!",
  guerlain: "Guerlain",
  lolitalempicka: "Lolita Lempicka",
  rochas: "Rochas",
  pacorabanne: "Paco Rabanne",
  rabanne: "Rabanne",
  lancome: "Lancôme",
  givenchy: "Givenchy",
  dior: "Dior",
  christiandior: "Dior",
  chanel: "Chanel",
  ysl: "Yves Saint Laurent",
  yvessaintlaurent: "Yves Saint Laurent",
  giorgioarmani: "Giorgio Armani",
  armani: "Giorgio Armani",
  emporioarmani: "Giorgio Armani",
  gucci: "Gucci",
  prada: "Prada",
  versace: "Versace",
  bvlgari: "Bvlgari",
  bulgari: "Bvlgari",
  montblanc: "Montblanc",
  lacoste: "Lacoste",
  guess: "Guess",
  escada: "Escada",
  cacharel: "Cacharel",
  isseymiyake: "Issey Miyake",
  jeanpaulgaultier: "Jean Paul Gaultier",
  carolinaherrera: "Carolina Herrera",
  valentino: "Valentino",
  narcisorodriguez: "Narciso Rodriguez",
  marcjacobs: "Marc Jacobs",
  chloe: "Chloé",
  tomford: "Tom Ford",
  esteelauder: "Estée Lauder",
  clinique: "Clinique",
  shiseido: "Shiseido",
  ninaricci: "Nina Ricci",
  police: "Police",
  replay: "Replay",
  benetton: "Benetton",
  unitedcolorsofbenetton: "Benetton",
  trussardi: "Trussardi",
  salvatoreferragamo: "Salvatore Ferragamo",
  ferragamo: "Salvatore Ferragamo",
  michaelkors: "Michael Kors",
  coach: "Coach",
  abercrombiefitch: "Abercrombie & Fitch",
  zadigvoltaire: "Zadig & Voltaire",
  viktorrolf: "Viktor & Rolf",
  tommyhilfiger: "Tommy Hilfiger",
  ralphlauren: "Ralph Lauren",
  dsquared2: "Dsquared2",
  lanvin: "Lanvin",
  vancleefarpels: "Van Cleef & Arpels",
  cartier: "Cartier",
  creed: "Creed",
  montale: "Montale",
  mancera: "Mancera",
  byredo: "Byredo",
  maisonmargiela: "Maison Margiela",
  diptyque: "Diptyque",
  jomalone: "Jo Malone",
  acquadiparma: "Acqua di Parma",
  amouage: "Amouage",
  initio: "Initio",
  parfumsdemarly: "Parfums de Marly",
  courreges: "Courrèges",
  oscardelarenta: "Oscar de la Renta",
  britneyspears: "Britney Spears",
  arianagrande: "Ariana Grande",
  christinaaguilera: "Christina Aguilera",
  shakira: "Shakira",
  brunobanani: "Bruno Banani",
  davidbeckham: "David Beckham",
  benefit: "Benefit",
  toofaced: "Too Faced",
  urbandecay: "Urban Decay",
  hudabeauty: "Huda Beauty",
  fentybeauty: "Fenty Beauty",
  charlottetilbury: "Charlotte Tilbury",
  rarebeauty: "Rare Beauty",
  clarins: "Clarins",
  sisley: "Sisley",
  kikomilano: "KIKO Milano",
  pupa: "Pupa",
  pupamilano: "Pupa",
  deborah: "Deborah Milano",
  deborahmilano: "Deborah Milano",
  collistar: "Collistar",
  astor: "Astor",
  sallyhansen: "Sally Hansen",
  physiciansformula: "Physicians Formula",
  barrym: "Barry M",
  sleek: "Sleek",
  inglot: "Inglot",
  bobbibrown: "Bobbi Brown",
  nars: "NARS",
  lauramercier: "Laura Mercier",
  elf: "e.l.f.",
  kylie: "Kylie Cosmetics",
  philippplein: "Philipp Plein",
  pleinsport: "Philipp Plein",
  karlagerfeld: "Karl Lagerfeld",
  blumarine: "Blumarine",
  vivienwestwood: "Vivienne Westwood",
  boucheron: "Boucheron",
  hollister: "Hollister",
  mauboussin: "Mauboussin",
  zara: "Zara",
  jaguar: "Jaguar",
  mercedesbenz: "Mercedes-Benz",
  ferrari: "Ferrari",
  porsche: "Porsche Design",
  porschedesign: "Porsche Design",
  angelschlesser: "Angel Schlesser",
  adolfodominguez: "Adolfo Dominguez",
  custo: "Custo Barcelona",
  mango: "Mango",
  loewe: "Loewe",
  kenzoparfums: "Kenzo",
  moschinotoy: "Moschino",
  elizabethardenred: "Elizabeth Arden",
  laperla: "La Perla",
  // company names (after companyBrand()) and short forms
  lrp: "La Roche-Posay", lorealparisparis: "L'Oréal Paris", expanscience: "Mustela", expanscie: "Mustela", floresense: "Pranarôm",
  pranarom: "Pranarôm", isispharma: "Isispharma", benemedo: "Mediket", mediket: "Mediket", cumdente: "Apacare", зеда: "Alzeda",
  berlindo: "Sorion", doych: "Matsan Doych", matsandoych: "Matsan Doych", alphanovasante: "Alphanova", alphanova: "Alphanova",
  georganics: "Georganics", ladrome: "Ladrôme", cottonhightech: "Cotton High Tech", superdiet: "Super Diet", asam: "ASAM",
  drtheiss: "Dr. Theiss", gracecole: "Grace Cole", acm: "ACM", dentinox: "Dentinox", bioshield: "Bioshield", evitta: "Evitta",
  coswell: "Coswell", cosmondial: "Cosmondial", labello: "Labello", penaten: "Penaten", afrodita: "Afrodita", cotonella: "Cotonella",
  galafarm: "Galafarm", pariscorner: "Paris Corner", nataura: "Nat'Aura", atopiclair: "Atopiclair", alpecin: "Alpecin",
  bellcosmetics: "Bell", himalayadrag: "Himalaya", himalaydrug: "Himalaya", himalayadrugco: "Himalaya", himalayaherbals: "Himalaya",
  coswellfarma: "Coswell", johnsonsbaby: "Johnson's", johnsons: "Johnson's", himalayadragco: "Himalaya", himalaydrugco: "Himalaya",
  kentbrushes: "Kent", francescosmalto: "Francesco Smalto", now: "NOW", nowfoods: "NOW", nowsolutions: "NOW",
  axis: "Axis", magicstudio: "Magic Studio", nikos: "Nikos", village11factory: "Village 11 Factory", kenjitanaka: "Kenji Tanaka",
  sinoz: "Sinoz", lilianbarony: "Lilian Barony", vagisan: "Vagisan", bebelan: "Bebelan", dw: "Dirty Works", dirtyworks: "Dirty Works",
  luxuryreginaroses: "Regina Roses", garnierambresolaire: "Garnier", dentilitykids: "Dentility", loralparis: "L'Oréal Paris",
  waysilk: "Way Silk",
  velsamed: "Velsamed", khadlaj: "Khadlaj",
  hermesparis: "Hermès",
  bottegaveneta: "Bottega Veneta",
  tiffany: "Tiffany & Co.",
  missoni: "Missoni",
  roberto: "Roberto Cavalli",
  johnrichmond: "John Richmond",
  pepejeansparfums: "Pepe Jeans",
  guccibloom: "Gucci",
};

/** Extra spellings of a brand inside product names, used when the brand is taken off the name. */
const EXTRA_ALIASES: Record<string, string[]> = {
  "NYX Professional Makeup": ["NYX Professional Make Up", "NYX Professional Make-Up", "NYX Professional", "NYX"],
  Revolution: ["Makeup Revolution", "Make Up Revolution", "Revolution Beauty", "Revolution Skincare", "Revolution Haircare"],
  "L'Oréal Paris": ["L'Oreal Paris", "L`Oreal Paris", "L'Oréal", "L'Oreal", "Loreal Paris", "Loreal", "Лореал"],
  "Maybelline New York": ["Maybelline NY", "Maybelline New-York", "Maybelline"],
  "Eveline Cosmetics": ["Eveline"],
  "Vivienne Sabó": ["Vivienne Sabo", "Sabo"],
  "Delia Cosmetics": ["Delia"],
  "IDC Institute": ["IDC"],
  Rimmel: ["Rimmel London"],
  essence: ["Есенс"],
  Catrice: ["Катрис"],
  "GOSH Copenhagen": ["GOSH"],
  "La Roche-Posay": ["La Roche Posay", "LRP", "ЛРП", "Ла Рош-Позе"],
  Avène: ["Avene", "Авен", "Eau Thermale Avène", "Eau Thermale Avene"],
  Vichy: ["Виши", "Вичи"],
  Nuxe: ["Нукс"],
  Ducray: ["Дюкре"],
  Klorane: ["Клоран"],
  "A-Derma": ["А-Дерма", "AD"],
  Uriage: ["Уриаж"],
  Dove: ["Дав"],
  Nivea: ["Нивеа"],
  Bioderma: ["Биодерма"],
  Eucerin: ["Еуцерин", "Юсерин"],
  "Bel London": ["Bel"],
  "Golden Rose": ["GR"],
  "Yardley London": ["Yardley", "Ярдли"],
  "Head & Shoulders": ["Head&Shoulders", "Head and Shoulders"],
  "Wilkinson Sword": ["Wilkinson"],
  "Women'secret": ["Women Secret", "Women'Secret", "WS"],
  "Jacques Battini": ["Jacques Battini Swarovski"],
  "Dolce&Gabbana": ["Dolce & Gabbana", "D&G"],
  "Hugo Boss": ["Boss", "Hugo"],
  Lierac: ["Лиерак"],
  Mixa: ["Микса"],
  "Bulgarian Rose": ["Bulgarian Rose Karlovo", "Българска роза"],
  "Nature of Agiva": ["Agiva"],
  "Lip Smacker": ["LIPS"],
  "Mister Groomer": ["Mr. Groomer", "Mr Groomer"],
  "The English Soap Company": ["ESC"],
  "Max Factor": ["MF"],
  "Philips": ["Philips Sonicare"],
  "Oral-B": ["Oral B", "Орал-Б"],
  "Pierre Cardin": ["Pierre Cardin Paris"],
  Bourjois: ["Bourjois Paris"],
  Wibo: ["Wibo Cosmetics"],
  "St. Moriz": ["St.M", "St. Moritz", "St.Moritz"],
  Interprox: ["Интерпрокс"],
  TePe: ["Тепе"],
  Curaprox: ["Курапрокс"],
  Listerine: ["Листерин"],
  Lacalut: ["Лакалут"],
  Colgate: ["Колгейт"],
  Pierrot: ["Пиеро"],
  Rexona: ["Рексона"],
  "JOOP!": ["Joop"],
  "Yves Saint Laurent": ["YSL"],
  "Giorgio Armani": ["Armani", "Emporio Armani"],
  "Paco Rabanne": ["Rabanne"],
  "Jean Paul Gaultier": ["JPG"],
  Mustela: ["Мустела"],
  Pranarôm: ["Pranarom", "Пранаром"],
  Filorga: ["Филорга"],
  elmex: ["Елмекс"],
  Atopiclair: ["Атопиклер"],
  Alpecin: ["Алпецин"],
  "Johnson's": ["Джонсън"],
  Velsamed: ["Велсамед"],
  Khadlaj: ["by Khadlaj"],
  Vagisan: ["Вагизан"],
  Palmolive: ["Палмолив"],
  Apivita: ["Апивита"],
  Weleda: ["Веледа"],
  Elgydium: ["Елгидиум"],
  "Matsan Doych": ["Матсан Дойч"],
  Sebamed: ["Себамед"],
  Synchroline: ["Синхролайн"],
  "Alfaparf Milano": ["Alfaparf"],
  // Brands that only appear in names, never in the brand column
  Humanist: ["Humanist"], "Maison Alhambra": ["Alhambra"], "Aqua di Sorrento": ["Aqua di Sorrento"], Vussen: ["Vussen"],
  "Planeta Organica": ["Planeta Organica"], Coxir: ["Coxir"], Numee: ["Numee"], SkinSystem: ["SkinSystem"], Maternea: ["Maternea"],
  Asdaaf: ["Asdaaf"], Moremo: ["Moremo"], "Anne de Cassignac": ["Anne de Cassignac"], "Jean Barthet": ["Jean Barthet"],
  Viventy: ["Viventy"], Killys: ["Killys", "KillyS"], "Village 11 Factory": ["Village 11 Factory", "Village 11"],
  Diesel: ["Diesel"], "Attar Collection": ["Attar Collection"], "Shirley May": ["Shirley May"], W7: ["W7"], Dessata: ["Dessata"],
  "Makeup Obsession": ["Makeup Obsession"], "Crème 21": ["Crème 21", "Creme 21"], Medisun: ["Medisun"],
  // Spellings found in names
  Profusion: ["Profusion Cosmetics"], NOW: ["NOW Foods"], Roial: ["Ro.ial"], "Liu Jo": ["Liu.Jo"], STR8: ["Стр 8", "Стр8"],
  Batiste: ["Батист"], Elode: ["Елод"], Carroten: ["Каротен"], "Brave.New.Hair": ["Brave.New.Hair"],
};

/** Product lines the export uses as a brand: the brand they belong to is set, the line stays in the name. */
const LINE_ALIASES = new Set([
  "elseve", "casting", "excellence", "excellencecolor", "londacolor", "colorsensation", "colornaturals", "fructis", "skinnaturals",
  "ambresolaire", "hydraextreme", "colorsensational", "fitme", "koleston", "aquaphor", "cicaplast", "silkepil", "emporioarmani",
  "pleinsport", "vitis", "preference", "oneblade",
]);

const CANON_VALUES = new Set(Object.values(CANON));

/** True for the shop's own spelling of a brand ("essence", "L'Oréal Paris"). */
export function isCanonicalBrand(display: string): boolean {
  return CANON_VALUES.has(display);
}

/** Words after the brand in a brand spelling that belong to the brand, not to a product line ("Bourjois Paris"). */
const BRAND_WORDS = /^(?:paris|london|new york|ny|milano|copenhagen|seoul|tokyo|perfumes?|parfums?|foods|solutions|cosmetics?|cosmetic|beauty|make[- ]?up|skin ?care|hair ?care|naturkosmetik|professional|professionnel|laboratoires?|by|the|co\.?|company|international|bg|group|&)$/i;

/** "GILLETTE Venus" taken off the name → "Venus " (the product line), "NIVEA MEN" → "Men ", "Bourjois Paris" → "". */
function lineAfterBrand(matched: string, brand: string): string {
  const said = matched.replace(/[\s,.\-:–!]+$/u, "").split(/\s+/);
  const own = brand.split(/\s+/).length;
  if (said.length <= own || brandKey(said.slice(0, own).join(" ")) !== brandKey(brand)) {
    return /\bmen\b/i.test(matched) && !/\bmen\b/i.test(brand) ? "Men " : "";
  }
  const extra = said.slice(own).filter((w) => !BRAND_WORDS.test(w));
  return extra.length ? `${extra.map((w) => (w === w.toUpperCase() && w.length > 3 ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(" ")} ` : "";
}

/** Line names that look like brands ("Kiss Me More" by Flormar, "Perfect Color" by ARTDECO): never override the column. */
const LINE_WORDS = /^(?:kiss|royal|velvet|perfect|lip gloss|eye shadow)$/i;
/** Razors and blades: "Venus" on them is Gillette's line, otherwise it is the Italian cosmetics brand. */
const RAZOR = /самобръсначк|ножчета|бръснач|razor|blades?\b|система за бръснене|\bswirl\b|comfortglide|extra ?smooth/i;


/** Words that happen to be brand names too ("Natural", "Professional") are never read as a brand inside a name. */
const GENERIC_WORDS = /^(?:natural|naturals|professional|organic|classic|original|beauty|cosmetics|collection|essential|essentials|sensitive|premium|deluxe|intense|vitamin|repair|fresh|active|expert|perfect|nature|herbal|medical|clinic|derma|baby|kids|junior|travel|spray|cream|serum|lotion|shampoo|color|colour|style|studio|salon|therapy|care|secret|lady|woman|women|homme|man|men|sport|black|white|gold|silver|rose|roses|green|blue|pink|lavender|magic|crystal|diamond|velvet|aqua|marine|ocean|garden|flower|flowers|fruit|fruits|honey|milk|cocoa|coconut|vanilla|argan|keratin|collagen|hyaluron|retinol|aloe|olive|almond|shea|cotton|silk|pearl|gloss|matte|glow|shine|volume|lash|lashes|brow|brows|nail|nails|lips|eyes|face|body|hair|skin|soap|bath|shower|parfum|perfume|toilette|cologne|extrait|elixir|amour|bella|bello|belle|venus|aroma|lovely|event|clear)$/i;

/** Brands that are ordinary words too: taken off the start of the name only, never from the middle. */
const COMMON_WORD_BRANDS = new Set([
  "aroma", "nice", "bella", "lovely", "event", "everyday", "venus", "palette", "casting", "excellence", "jordan", "visage", "discreet",
  "lifestyle", "babe", "zdrave", "здраве", "bilka", "regal", "signal", "faro", "intesa", "fa", "bel london", "always", "gum", "abc",
  "iv", "dw", "kids", "marshmallow", "deba", "fairness", "florinda", "prestige", "cuba", "elode", "matrix", "eclat", "éclat",
]);

const LOREAL_ROWS = ["lorealbg", "lorealparis", "loreal", "loral", "lorealcosmetics", "garnier", "maybellinenewyork", "maybellinenewyorkmup", "mixa", "elseve"];
const NO_BRAND = ["", "na", "none", "nan", "0", "unknown", "noname"];
/** Unmistakable L'Oréal-group shorthand, trusted on rows without a brand as well. */
const LOREAL_SHORT = [...LOREAL_ROWS, ...NO_BRAND];

/**
 * Shorthand the distributors put in front of the name: [start of name, brand, what to write instead, brand column keys
 * the shorthand is trusted for]. Without a list it applies to rows without a brand and to rows of that brand.
 */
const PREFIXES: [RegExp, string, string, string[]?][] = [
  // L'Oréal Bulgaria (Garnier, L'Oréal Paris, Maybelline)
  [/^snat\b\.?\s*/i, "Garnier", "Skin Naturals ", LOREAL_ROWS],
  [/^(?:fructis|frucris)\b\s*/i, "Garnier", "Fructis ", LOREAL_ROWS],
  [/^color nat\b\.?\s*/i, "Garnier", "Color Naturals ", LOREAL_SHORT],
  [/^color sens\b\.?\s*/i, "Garnier", "Color Sensation ", LOREAL_ROWS],
  [/^olia\b\s*/i, "Garnier", "Olia ", LOREAL_ROWS],
  [/^bt\s+/i, "Garnier", "Botanic Therapy ", LOREAL_ROWS],
  [/^g\.\s?men\b\s*/i, "Garnier", "Men ", LOREAL_ROWS],
  [/^g\.\s?invisi\b\s*/i, "Garnier", "Mineral Invisible ", LOREAL_ROWS],
  [/^g\.\s?ac\.\s?contr(?:ol|\.)?\s*/i, "Garnier", "Action Control ", LOREAL_ROWS],
  [/^g\.\s?magnesium\b\s*/i, "Garnier", "Magnesium ", LOREAL_ROWS],
  [/^g\.\s?protect\b\s*/i, "Garnier", "Mineral Protection ", LOREAL_ROWS],
  [/^g\.\s?hyaluronic(?:\s+care)?\b\s*/i, "Garnier", "Hyaluronic Care ", LOREAL_ROWS],
  [/^g\.\s*/i, "Garnier", "", LOREAL_ROWS],
  [/^gar\b\.?\s*/i, "Garnier", "", LOREAL_ROWS],
  [/^a\.s\.\s*/i, "Garnier", "Ambre Solaire ", LOREAL_SHORT],
  [/^d\.\s?revit[aа]lift(?![\p{L}\p{N}])\s*/iu, "L'Oréal Paris", "Revitalift ", LOREAL_SHORT],
  [/^d\.\s?age\s+perfect\b\s*/i, "L'Oréal Paris", "Age Perfect ", LOREAL_SHORT],
  [/^d\.\s?age\s+(?=specialist)/i, "L'Oréal Paris", "Age ", LOREAL_SHORT],
  [/^d\.\s?age\b\s*/i, "L'Oréal Paris", "Age Perfect ", LOREAL_ROWS],
  [/^d\.\s?bright(?:\s+reveal)?\b\s*/i, "L'Oréal Paris", "Bright Reveal ", LOREAL_SHORT],
  [/^d\.\s?hyaluron\b\s*/i, "L'Oréal Paris", "Hyaluron ", LOREAL_SHORT],
  [/^d\.\s*/i, "L'Oréal Paris", "", LOREAL_ROWS],
  [/^m\.\s?exp\.\s*/i, "L'Oréal Paris", "Men Expert ", LOREAL_ROWS],
  [/^els\b\s*/i, "L'Oréal Paris", "Elseve ", LOREAL_ROWS],
  [/^preference\b\s*/i, "L'Oréal Paris", "Préférence ", [...LOREAL_SHORT, "preference"]],
  [/^excellence\s+(?=\d)/i, "L'Oréal Paris", "Excellence ", LOREAL_SHORT],
  [/^excellence\b\s*/i, "L'Oréal Paris", "Excellence ", LOREAL_ROWS],
  [/^color riche\b\s*/i, "L'Oréal Paris", "Color Riche ", LOREAL_ROWS],
  [/^telescopic\b\s*/i, "L'Oréal Paris", "Telescopic ", LOREAL_ROWS],
  [/^vol\.\s?million(?:\s+lashes)?\b\s*/i, "L'Oréal Paris", "Volume Million Lashes ", LOREAL_ROWS],
  [/^volumissime\b\s*/i, "L'Oréal Paris", "Volumissime ", LOREAL_ROWS],
  [/^paradise\b\s*/i, "L'Oréal Paris", "Paradise ", LOREAL_ROWS],
  [/^pro xxl\b\s*/i, "L'Oréal Paris", "Pro XXL ", LOREAL_ROWS],
  [/^air(?:\s+volume)?\b\s*/i, "L'Oréal Paris", "Air Volume ", LOREAL_ROWS],
  [/^fdt\s+(?=infaillible|true|accord|age|skin|perfect)/i, "L'Oréal Paris", "Фон дьо тен ", LOREAL_ROWS],
  [/^fdt\s+(?=fit|sstay|super|dream|affinitone|instant)/i, "Maybelline New York", "Фон дьо тен ", LOREAL_ROWS],
  [/^fdt\s+/i, "L'Oréal Paris", "Фон дьо тен ", LOREAL_ROWS],
  [/^f\.\s?affinitone\b\s*/i, "Maybelline New York", "Affinitone ", LOREAL_ROWS],
  [/^sstay\b\s*/i, "Maybelline New York", "SuperStay ", LOREAL_SHORT],
  [/^lash sens\.?\s*/i, "Maybelline New York", "Lash Sensational ", LOREAL_ROWS],
  [/^lash\b\s*/i, "Maybelline New York", "Lash ", LOREAL_ROWS],
  [/^lifter\b\s*/i, "Maybelline New York", "Lifter ", LOREAL_ROWS],
  [/^iar\b\s*/i, "Maybelline New York", "Instant Anti-Age ", LOREAL_ROWS],
  [/^colossal\b\s*/i, "Maybelline New York", "Colossal ", LOREAL_ROWS],
  [/^falsies\b\s*/i, "Maybelline New York", "Falsies ", LOREAL_ROWS],
  [/^vol\.\s?exp\.?\s*/i, "Maybelline New York", "Volum' Express ", LOREAL_ROWS],
  [/^hydra extreme\b\s*/i, "Maybelline New York", "Hydra Extreme ", LOREAL_ROWS],
  [/^mega\b\s*/i, "Maybelline New York", "Mega ", LOREAL_ROWS],
  [/^magic\b\s*/i, "L'Oréal Paris", "Magic ", LOREAL_ROWS],
  // Short forms of other brands
  [/^gr\s+/i, "Golden Rose", "", ["goldenrose", ...NO_BRAND]],
  [/^int\s+(?=perfect|sensitive|dry|f\.?i\.?t|ultra|complete|naturals|cucumber)/i, "Wilkinson Sword", "Intuition ", ["wilkinson", "wilkinsonsword", ...NO_BRAND]],
  [/^golden rose(?=\S)/i, "Golden Rose", ""],
  [/^(?:rm|ri|rh|rs|rp|rb|rf|rl|ro)\s+/i, "Revolution", "", ["revolution", "makeuprevolution", ...NO_BRAND]],
  [/^mr\s+(?=\p{Script=Cyrillic})/iu, "Revolution", "", ["revolution", "makeuprevolution", "makeupsets", ...NO_BRAND]],
  [/^is\s+/i, "It's Skin", "", ["itsskin", ...NO_BRAND]],
  [/^mny\s+/i, "Maybelline New York", "", LOREAL_ROWS],
  [/^eve\s+/i, "Eveline Cosmetics", "", ["eveline", "evelinecosmetics", ...NO_BRAND]],
  [/^wa\s+/i, "Way Silk", "", ["waysilk", ...NO_BRAND]],
  [/^(?:\d{4}\s+)?fzd\s+/i, "Frezyderm", "", [...LOREAL_ROWS, "frezyderm", ...NO_BRAND]],
  [/^mf\s+/i, "Max Factor", "", ["maxfactor", ...NO_BRAND]],
  [/^cd\s+(?=дезодорант|део|deo|душ|рол|стик|спрей)/iu, "CD", "", ["cd", ...NO_BRAND]],
  [/^ev\s?1{1,2}\s+/i, "Eveline Cosmetics", "", ["eveline", "evelinecosmetics", ...NO_BRAND]],
  [/^yr\s+/i, "Yves Rocher", "", ["yvesrocher", ...NO_BRAND]],
  [/^rr\s+/i, "Raphael Rosalee", "", ["raphaelrosalee", "raphaelrosaleecosmetics", ...NO_BRAND]],
  [/^lor\s+rvt\b\.?\s*/i, "L'Oréal Paris", "Revitalift ", [...LOREAL_ROWS, "lorealparisparis", ...NO_BRAND]],
  [/^lor\s+/i, "L'Oréal Paris", "", [...LOREAL_ROWS, "lorealparisparis", ...NO_BRAND]],
  [/^рекс?\.\s*/iu, "Rexona", "", ["rexona", ...NO_BRAND]],
  [/^rex\.\s*/i, "Rexona", "", ["rexona", ...NO_BRAND]],
  [/^hl\s+/i, "Hada Labo", "", ["hadalabo", "hadalabotokyo", ...NO_BRAND]],
  [/^relove by revolution\s*/i, "Revolution", "Relove "],
  [/^i heart revolution\s*/i, "Revolution", "I Heart Revolution "],
  [/^revolution pro\s*/i, "Revolution", "Pro "],
  [/^makeup revolution\s*/i, "Revolution", ""],
  [/^make up revolution\s*/i, "Revolution", ""],
  [/^revolution fragrance\s*/i, "Revolution", ""],
  [/^lr\s+/i, "La Rive", "", ["larive", ...NO_BRAND]],
  [/^dc\s+(?:dc\s+)?/i, "Dorall Collection", "", ["dorall", "dorallcollection", ...NO_BRAND]],
  [/^cg\s+/i, "Chic'n Glam", "", ["chicnglam", ...NO_BRAND]],
  [/^cos\s+/i, "Coscentra", "", ["coscentra", ...NO_BRAND]],
  [/^тит\.?\s*#?\s*/i, "Titania", ""],
  [/^ivea\b/i, "Nivea", ""],
  [/^d\s+(?=cameleo)/i, "Cameleo", "", ["delia", "deliacosmetics", "cameleo", ...NO_BRAND]],
  [/^d\s+/i, "Delia Cosmetics", "", ["delia", "deliacosmetics", ...NO_BRAND]],
  [/^dd\s+/i, "Dermedic", "", ["dermedic", ...NO_BRAND]],
  [/^bh\s+/i, "BH Cosmetics", "", ["bh", "bhcosmetics", ...NO_BRAND]],
  [/^iv\s*\*?\s*/i, "Inter-Vion", "", ["iv", "intervion", ...NO_BRAND]],
  [/^lips\s+(?=балсам)/i, "Lip Smacker", "", ["lipsmacker", ...NO_BRAND]],
  [/^max factor\b\s*/i, "Max Factor", ""],
  [/^hypoallergenic\b\s*/i, "Bell", "HYPOAllergenic "],
  [/^bell hypoallergenic\b\s*/i, "Bell", "HYPOAllergenic "],
  [/^дав(?![\p{L}\p{N}])\s*/iu, "Dove", ""],
  [/^нивеа(?![\p{L}\p{N}])\s*/iu, "Nivea", ""],
  [/^авен(?![\p{L}\p{N}])\s*/iu, "Avène", ""],
  [/^нукс(?![\p{L}\p{N}])\s*/iu, "Nuxe", ""],
  [/^дюкре(?![\p{L}\p{N}])\s*/iu, "Ducray", ""],
  [/^клоран(?![\p{L}\p{N}])\s*/iu, "Klorane", ""],
  [/^а-дерма(?![\p{L}\p{N}])\s*/iu, "A-Derma", ""],
  [/^уриаж(?![\p{L}\p{N}])\s*/iu, "Uriage", ""],
  [/^виши(?![\p{L}\p{N}])\s*/iu, "Vichy", ""],
  [/^вичи(?![\p{L}\p{N}])\s*/iu, "Vichy", ""],
  [/^курапрокс(?![\p{L}\p{N}])\s*/iu, "Curaprox", ""],
  [/^листерин(?![\p{L}\p{N}])\s*/iu, "Listerine", ""],
  [/^лрп(?![\p{L}\p{N}])\s*/iu, "La Roche-Posay", ""],
  [/^ла рош[- ]позе(?![\p{L}\p{N}])\s*/iu, "La Roche-Posay", ""],
  [/^биодерма(?![\p{L}\p{N}])\s*/iu, "Bioderma", ""],
  [/^еуцерин(?![\p{L}\p{N}])\s*/iu, "Eucerin", ""],
  [/^еусерин(?![\p{L}\p{N}])\s*/iu, "Eucerin", ""],
  [/^еус\.?(?![\p{L}\p{N}])\s*/iu, "Eucerin", "", ["eucerin", "beiersdorf", ...NO_BRAND]],
  [/^биот(?:ен)?(?![\p{L}\p{N}])\.?\s*/iu, "Bioten", "", ["bioten", ...NO_BRAND]],
  [/^миша(?![\p{L}\p{N}])\s*/iu, "Missha", ""],
  [/^курасепт(?![\p{L}\p{N}])\s*/iu, "Curasept", ""],
  [/^сераве(?![\p{L}\p{N}])\s*/iu, "CeraVe", ""],
  [/^естедерм(?![\p{L}\p{N}])\s*/iu, "Institut Esthederm", ""],
  [/^перлиер(?![\p{L}\p{N}])\s*/iu, "Perlier", ""],
  [/^риластил(?![\p{L}\p{N}])\s*/iu, "Rilastil", ""],
  [/^каннадерм(?![\p{L}\p{N}])\s*/iu, "Cannaderm", ""],
  [/^пантен(?![\p{L}\p{N}])\s*/iu, "Pantene", ""],
  [/^сорион(?=\s)\s*/iu, "Sorion", ""],
  [/^intervion\s+/i, "Inter-Vion", ""],
  [/^fw\s+/i, "Fruit Works", "", NO_BRAND],
  [/^юсерин(?![\p{L}\p{N}])\s*/iu, "Eucerin", ""],
  [/^себамед(?![\p{L}\p{N}])\s*/iu, "Sebamed", ""],
  [/^мустела(?![\p{L}\p{N}])\s*/iu, "Mustela", ""],
  [/^бочко(?![\p{L}\p{N}])\s*/iu, "Бочко", ""],
  [/^здраве(?![\p{L}\p{N}])\s*/iu, "Здраве", ""],
  [/^лакалут(?![\p{L}\p{N}])\s*/iu, "Lacalut", ""],
  [/^елмекс(?![\p{L}\p{N}])\s*/iu, "elmex", ""],
  [/^сенсодин(?![\p{L}\p{N}])\s*/iu, "Sensodyne", ""],
  [/^колгейт(?![\p{L}\p{N}])\s*/iu, "Colgate", ""],
  [/^аквафреш(?![\p{L}\p{N}])\s*/iu, "Aquafresh", ""],
  [/^пародонтакс(?![\p{L}\p{N}])\s*/iu, "Parodontax", ""],
  [/^тепе(?![\p{L}\p{N}])\s*/iu, "TePe", ""],
  [/^интерпрокс(?![\p{L}\p{N}])\s*/iu, "Interprox", ""],
  [/^паломита(?![\p{L}\p{N}])\s*/iu, "Palomita", ""],
  [/^ярдли(?![\p{L}\p{N}])\s*/iu, "Yardley London", ""],
  [/^рексона(?![\p{L}\p{N}])\s*/iu, "Rexona", ""],
  [/^палмолив(?![\p{L}\p{N}])\s*/iu, "Palmolive", ""],
  [/^топ тен(?![\p{L}\p{N}])\s*/iu, "Top Ten", ""],
  [/^ривана(?![\p{L}\p{N}])\s*/iu, "Rivana", ""],
  [/^арома(?![\p{L}\p{N}])\s*/iu, "Aroma", ""],
  [/^каро(?![\p{L}\p{N}])\s*/iu, "Aroma", "Каро ", ["aroma", ...NO_BRAND]],
  [/^фт(?![\p{L}\p{N}])\s*(?:\*\s*)?(?:\d+\s+)?(?:ск\s+)?/iu, "Fitocosmetics", "", ["fitokosmetik", "fitocosmetics", ...NO_BRAND]],
  [/^fito cosmetic\b\s*/i, "Fitocosmetics", ""],
  [/^swarovski\b\s*/i, "Jacques Battini", "Swarovski ", ["jacquesbattini", "larive", ...NO_BRAND]],
];

export type BrandResult = { brand: string; name: string };

const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['`’]?").replace(/\s+/g, "[\\s-]*");

/** Display form of a brand column value that is not in CANON: "GOLDEN LADY" → "Golden Lady", "OPI" stays. */
function smartCase(value: string): string {
  const v = fixMixedScript(decodeEntities(value)).replace(/\s+/g, " ").replace(/[®™*]/g, "").trim();
  if (!v) return "";
  const letters = v.replace(/[^\p{L}]/gu, "");
  if (letters && letters === letters.toUpperCase() && letters.length > 4) {
    return v.toLowerCase().replace(/(^|[\s\-&/.(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  return v;
}

export function displayBrand(column: string): string {
  const value = companyBrand(decodeEntities(column));
  const key = brandKey(value);
  if (NOT_BRANDS.has(key) || CATEGORY_LIKE.test(value.trim())) return "";
  return CANON[key] ?? smartCase(value);
}

export class Brands {
  /** Patterns that find a known brand at the start of a product name, grouped by the name's first letter. */
  private starters = new Map<string, { re: RegExp; brand: string }[]>();
  /** Every spelling of a brand seen in the export, longest first. */
  private aliases = new Map<string, string[]>();
  /** Distinctive brand names (5+ letters, not ordinary words), found anywhere in a name that has no brand. */
  private anywhere: RegExp | null = null;
  private anywhereBrand = new Map<string, string>();
  private stripCache = new Map<string, { start: RegExp[]; anywhere: RegExp | null }>();

  /** `columnCounts`: how many cosmetics rows use each brand column value. */
  constructor(columnCounts: Map<string, number>) {
    const add = (brand: string, alias: string) => {
      const a = alias.replace(/[®™*]/g, "").replace(/\s+/g, " ").trim();
      if (a.length < 2) return;
      const list = this.aliases.get(brand) ?? [];
      if (!list.some((x) => x.toLowerCase() === a.toLowerCase())) list.push(a);
      this.aliases.set(brand, list);
    };
    for (const [value, count] of columnCounts) {
      const display = displayBrand(value);
      if (!display || count < 2) continue;
      add(display, display);
      add(display, decodeEntities(value));
    }
    for (const display of new Set(Object.values(CANON))) add(display, display);
    for (const [brand, extra] of Object.entries(EXTRA_ALIASES)) for (const a of extra) add(brand, a);
    for (const list of this.aliases.values()) list.sort((a, b) => b.length - a.length);

    for (const [brand, list] of this.aliases) {
      for (const alias of list) {
        // Very short aliases ("GR", "AD", "WS") only count with the distributor prefixes, not as name starters.
        if (alias.length < 3 || /^\d+$/.test(alias)) continue;
        const first = alias[0].toLowerCase();
        const bucket = this.starters.get(first) ?? [];
        bucket.push({ re: new RegExp(`^${escape(alias)}(?![\\p{L}\\p{N}])[\\s,.\\-:!]*`, "iu"), brand });
        this.starters.set(first, bucket);
      }
    }
    for (const bucket of this.starters.values()) bucket.sort((a, b) => b.re.source.length - a.re.source.length);

    const distinctive: string[] = [];
    for (const [brand, list] of this.aliases) {
      if (COMMON_WORD_BRANDS.has(brand.toLowerCase())) continue;
      for (const alias of list) {
        const letters = alias.replace(/[^\p{L}]/gu, "");
        // Cyrillic spellings are written out on purpose ("ТЕПЕ", "Мустела"), so four letters are enough for them.
        const minLetters = /\p{Script=Cyrillic}/u.test(alias) ? 4 : 5;
        if (letters.length < minLetters || COMMON_WORD_BRANDS.has(alias.toLowerCase()) || GENERIC_WORDS.test(alias)) continue;
        distinctive.push(alias);
        this.anywhereBrand.set(alias.toLowerCase(), brand);
      }
    }
    distinctive.sort((a, b) => b.length - a.length);
    if (distinctive.length) this.anywhere = new RegExp(`(?<![\\p{L}\\p{N}])(${distinctive.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "iu");
  }

  /**
   * A distinctive brand name inside a name that has no brand ("Парфюм Verset Andrea" → Verset, "Четка за зъби ТЕПЕ
   * Селект" → TePe). Further than the third word, a one-word Latin brand after a preposition is part of the product's
   * own name ("Giardino di Amalfi"), not its brand.
   */
  private brandInside(name: string): string {
    const m = this.anywhere?.exec(name);
    if (!m) return "";
    const before = name.slice(0, m.index).trim().split(/\s+/).filter(Boolean);
    const oneWord = !/\s/.test(m[1].trim());
    const latin = !/\p{Script=Cyrillic}/u.test(m[1]);
    if (oneWord && latin && before.length > 2 && /^(?:di|de|du|del|della|des|of|the|la|le|les|a|à|al|from|for|with|en|el|y|und|von|за|от|на|с|в|и|&|and)$/i.test(before[before.length - 1])) {
      return "";
    }
    const hit = m[1].toLowerCase();
    for (const [alias, brand] of this.anywhereBrand) {
      if (alias === hit || new RegExp(`^${escape(alias)}$`, "iu").test(m[1])) return brand;
    }
    return "";
  }

  /** The known brand the name starts with, and the spelling used. */
  private nameBrand(name: string): { brand: string; alias: string; length: number } | null {
    const bucket = this.starters.get(name.charAt(0).toLowerCase()) ?? [];
    for (const s of bucket) {
      const m = s.re.exec(name);
      if (m) return { brand: s.brand, alias: m[0].replace(/[\s,.\-:!]+$/u, ""), length: m[0].length };
    }
    return null;
  }

  /** The brand of a row and its name with the brand (or the distributor's shorthand) taken off. */
  resolve(column: string, rawName: string): BrandResult {
    let name = fixMixedScript(decodeEntities(rawName)).replace(/\s+/g, " ").replace(/^[\s"'“„*#]+/, "").trim();
    const key = brandKey(column);
    let brand = displayBrand(column);

    let prefixed = false;
    for (const [re, b, replacement, only] of PREFIXES) {
      if (!re.test(name)) continue;
      const trusted = only ? only.includes(key) || brand === b || (NOT_BRANDS.has(key) && only.some((k) => NO_BRAND.includes(k))) : !brand || brand === b;
      if (!trusted) continue;
      brand = b;
      name = name.replace(re, replacement).trim();
      prefixed = true;
      break;
    }

    if (!prefixed) {
      const start = this.nameBrand(name);
      // The name starting with another brand wins over the column when the column's brand is nowhere in the name (the
      // export has NIVEA products with an "L'Oréal" brand and the like) — but not when that start is an ordinary word
      // or a product line ("Perfect Color Lipstick" by ARTDECO, "Kiss Me More" by Flormar), or the beginning of the
      // column's own name ("L'Oréal Steampod" by L'Oréal Professionnel).
      if (start && start.brand !== brand) {
        const columnLine = CANON_VALUES.has(brand) && brandKey(brand).startsWith(brandKey(start.alias));
        const weak = GENERIC_WORDS.test(start.alias) || LINE_WORDS.test(start.alias) || columnLine;
        if (!brand || (!weak && !this.mentions(name, brand))) brand = start.brand;
        else if (columnLine && name.length - start.length >= 3) name = name.slice(start.length);
      }
      if (!brand) brand = this.brandInside(name);
    }
    // Without a brand in the column, "Venus …" is Gillette's razor line; the Italian cosmetics come with their column.
    if (brand === "Venus" && (RAZOR.test(name) || !displayBrand(column))) brand = "Gillette";
    // IDC Institute distributes Martinelia's children's make-up and writes its own name in the column.
    if (brand === "Colgate" && /palmolive|палмолив/i.test(name)) brand = "Palmolive";
    // Inter-Vion's own brand Killys: "… Killys", or a 963… article number.
    if (brand === "Inter-Vion" && /killys|(?<![\p{N}])963\d{3}(?![\p{N}])/iu.test(name)) brand = "Killys";
    if (brand === "IDC Institute" && /martinelia/i.test(name)) {
      name = this.strip(name, "IDC Institute");
      brand = "Martinelia";
    }
    return { brand, name: brand ? this.strip(name, brand) : name };
  }

  private mentions(name: string, brand: string): boolean {
    const lower = name.toLowerCase();
    return (this.aliases.get(brand) ?? [brand]).some((a) => a.length >= 3 && lower.includes(a.toLowerCase()));
  }

  /**
   * Removes the brand from the start of the name, and later in the name only where it stands on its own — at the end
   * or before a comma, dash, bracket or number ("крем … NATURE OF AGIVA, 50 мл"). Inside a product's own name it stays
   * ("Eau de Givenchy", "Mon Guerlain").
   */
  strip(rawName: string, brand: string): string {
    const name = rawName.replace(/^[\s"'“„*#]+/u, "");
    let cached = this.stripCache.get(brand);
    if (!cached) {
      const list = this.aliases.get(brand) ?? [brand];
      const start = list.map((a) => new RegExp(`^${escape(a)}(?![\\p{L}\\p{N}])[\\s,.\\-:–!]*`, "iu"));
      const long = list.filter((a) => a.length >= 4 && !COMMON_WORD_BRANDS.has(a.toLowerCase()) && !COMMON_WORD_BRANDS.has(brand.toLowerCase()) && !LINE_ALIASES.has(brandKey(a)));
      const anywhere = long.length
        ? new RegExp(`(^|[\\s,(\\-–/])(?<![dDlL]['’]\\s?)(?:${long.map(escape).join("|")})(?![\\p{L}\\p{N}])(?=\\s*(?:$|[,;)\\-–(]|\\d))`, "giu")
        : null;
      cached = { start, anywhere };
      this.stripCache.set(brand, cached);
    }
    let out = name;
    for (const re of cached.start) {
      const m = re.exec(out);
      if (m) {
        // A line the export uses as a brand ("COLOR NATURALS 5.15 …") stays: it is part of the product's name.
        if (LINE_ALIASES.has(brandKey(m[0]))) break;
        const rest = out.slice(m[0].length);
        // The brand goes, the line named after it stays: "GILLETTE Venus 2" → "Venus 2", "CERRUTI 1881 …" → "1881 …",
        // "NIVEA MEN Deep" → "Men Deep". Words like "Paris" or "Cosmetics" are part of the brand and go too.
        if (rest.length >= 3) out = `${lineAfterBrand(m[0], brand)}${rest}`;
        break;
      }
    }
    if (cached.anywhere) {
      const rest = out.replace(cached.anywhere, "$1").replace(/\s{2,}/g, " ").trim();
      if (rest.length >= 3) out = rest;
    }
    return out;
  }
}
