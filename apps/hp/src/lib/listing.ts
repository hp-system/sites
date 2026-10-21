// ═══════════════════════════════════════════════════════════════════════════
// Η ΣΕΛΙΔΑ ΛΙΣΤΑΣ — φίλτρα, ταξινόμηση, σελιδοποίηση, θεματικές σελίδες.
//
// 📊 ΧΤΙΣΤΗΚΕ ΠΑΝΩ ΣΕ ΔΕΔΟΜΕΝΑ, ΟΧΙ ΣΕ ΥΠΟΘΕΣΕΙΣ (29/7).
//    Διαβάστηκαν 32+ μέρες access logs του σημερινού site, χωρίς ρομπότ:
//
//    · Η σελίδα λίστας πήρε **379** επισκέψεις. Η `/en/halkidiki-villas/` **1.893**
//      — πέντε φορές περισσότερες. Από Google προς τη λίστα με φίλτρα: **μηδέν**.
//      ➡️ Η λίστα ΔΕΝ είναι σελίδα προσγείωσης· οι ΘΕΜΑΤΙΚΕΣ σελίδες είναι.
//
//    · Από 224 αιτήματα με φίλτρα, οι ΠΡΑΓΜΑΤΙΚΕΣ επιλογές ήταν:
//        είδος 143 · χαρακτηριστικά 50 · δήμος 33 · τύπος 28 · θάλασσα 22
//        τιμή 0 · υπνοδωμάτια 0 · μπάνια 0 · πισίνα 0
//      🪤 ΠΑΓΙΔΑ ΠΟΥ ΠΑΡΑΛΙΓΟ ΝΑ ΜΕ ΦΑΕΙ: η παλιά φόρμα στέλνει ΟΛΑ τα πεδία
//         ακόμα κι άδεια, οπότε το `pool=0` εμφανιζόταν 135 φορές και έμοιαζε με
//         χρήση. Οι μηδενικές τιμές ΔΕΝ είναι επιλογές.
//      ➡️ Ο George είχε δίκιο που έβγαλε την πισίνα: κανείς δεν την πάτησε ποτέ.
//
//    · Η ταξινόμηση έμεινε στην προεπιλογή **204/204 φορές**. Δεν αξίζει περίοπτη θέση.
// ═══════════════════════════════════════════════════════════════════════════
import type { SiteProperty, Attrs } from './api';
import { priceOf, priceVisible, pick, refOf } from './api';
import { muniKey } from './gate';
import { SLUG, type Lang } from './i18n';

// ── ΤΑ ΦΙΛΤΡΑ ΠΟΥ ΕΠΙΒΙΩΝΟΥΝ ───────────────────────────────────────────────
// Κρατήθηκαν όσα ΠΑΤΗΘΗΚΑΝ, συν την τιμή. Η τιμή έχει 0 χρήσεις αλλά είναι το
// πιο βασικό κριτήριο σε ακίνητα — το διαβάζω ως «δεν το βρίσκουν», όχι «δεν
// το θέλουν», και του δίνω θέση που φαίνεται.
export type Query = {
  category?: string;      // residency | land
  subcategory?: string;
  municipality?: string;
  sea?: string;           // front | walking | nearby
  luxury?: boolean;
  pool?: boolean;
  priceMin?: number;
  priceMax?: number;
  sqmMin?: number;
  sqmMax?: number;
  /** Ελάχιστα υπνοδωμάτια — «3+», όχι ακριβώς 3. Έτσι το εννοεί ο αγοραστής. */
  beds?: number;
  /** Κωδικός ακινήτου — όταν υπάρχει, υπερισχύει ΟΛΩΝ των άλλων κριτηρίων. */
  id?: string;
  sort?: Sort;
  page?: number;
  /** Πόσα ανά σελίδα — δες `PER_PAGE_OPTIONS`. */
  per?: number;
};

/**
 * ΟΙ ΕΞΙ ΤΥΠΟΙ ΤΑΞΙΝΟΜΗΣΗΣ — ΟΙ ΙΔΙΟΙ ΜΕ ΤΟ ΣΗΜΕΡΙΝΟ SITE (George, 30/7:
 * «δες όλους τους τύπους sort που έχω εγώ στη Halkidiki Properties, ακριβώς
 * τους ίδιους»). Διαβάστηκαν από το ζωντανό `halkidikiproperties.com`:
 *
 *     data-sort="1" Recommended        → rec
 *     data-sort="2" Price High-low     → price_desc
 *     data-sort="3" Price Low-high     → price_asc
 *     data-sort="4" Sq. meters High-low→ sqm_desc
 *     data-sort="5" Sq. meters Low-high→ sqm_asc
 *     data-sort="6" New listings       → new
 *
 * Είχαμε ΤΕΣΣΕΡΙΣ: έλειπαν τα «Προτεινόμενα» και το «Εμβαδόν: αύξουσα».
 *
 * ⚠️ ΤΑ ΟΝΟΜΑΤΑ ΕΙΝΑΙ ΔΙΚΑ ΜΑΣ. Το παλιό site δίνει μόνο αγγλικά: οι διευθύνσεις
 *    /el/ και /gr/ γυρίζουν 404, οπότε οι ελληνικές διατυπώσεις γράφτηκαν εδώ.
 */
export type Sort = 'rec' | 'price_desc' | 'price_asc' | 'sqm_desc' | 'sqm_asc' | 'new';
export const SORTS: Sort[] = ['rec', 'price_desc', 'price_asc', 'sqm_desc', 'sqm_asc', 'new'];
/** Ίδια προεπιλογή με το σημερινό site (`sort=1`). */
export const SORT_DEFAULT: Sort = 'rec';

/**
 * ΠΟΣΑ ΑΝΑ ΣΕΛΙΔΑ — επιλογή του επισκέπτη (George, 30/7).
 * 🪤 ΟΛΑ ΠΟΛΛΑΠΛΑΣΙΑ ΤΟΥ 3, γιατί το πλέγμα έχει 3 στήλες στο desktop και η
 *    τελευταία σειρά έμενε με ΕΝΑ ακίνητο μόνο του.
 *    Η πραγματική αιτία δεν ήταν το 24: ήταν ότι το ΚΟΥΤΙ ΕΓΓΡΑΦΗΣ πιάνει κι
 *    αυτό ένα κελί, άρα 24 κάρτες + 1 κουτί = 25 κελιά = 8 σειρές + 1 ορφανό.
 *    Δες `cardsPerPage()` παρακάτω — αφαιρεί μία κάρτα όταν μπαίνει το κουτί.
 */
export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
export const PER_PAGE = 24;

/**
 * Πόσες ΚΑΡΤΕΣ χωράνε, ώστε τα κελιά του πλέγματος να μένουν πολλαπλάσιο του 3.
 * Ο μη συνδεδεμένος βλέπει μία κάρτα λιγότερη — τη θέση της παίρνει η προτροπή
 * εγγραφής, που έτσι δεν χαλάει τη σειρά.
 */
export function cardsPerPage(per: number, withJoinTile: boolean): number {
  return withJoinTile ? per - 1 : per;
}

/**
 * 🎯 ΟΙ ΘΕΜΑΤΙΚΕΣ ΣΕΛΙΔΕΣ — εδώ παίζεται το SEO.
 *
 * Κάθε μία έχει **δική της διεύθυνση με λέξεις**, δικό της κείμενο και δικό της
 * τίτλο. Ό,τι ΔΕΝ είναι εδώ μένει παράμετρος (`?price_min=…`) και **κρύβεται από
 * τη Google** — αλλιώς παράγουμε χιλιάδες σχεδόν-ίδιες σελίδες και τιμωρούμαστε.
 *
 * Ο κανόνας επιλογής: μπαίνει μόνο ό,τι (α) έχει όγκο αναζήτησης ΚΑΙ (β) έχει
 * αρκετά ακίνητα ώστε η σελίδα να μη δείχνει άδεια. Τα πλήθη μετρήθηκαν 29/7.
 */
export type Facet = {
  key: string;
  /** Το κομμάτι της διεύθυνσης, ανά γλώσσα. Λατινικά όπου το αλφάβητο σπάει το URL. */
  slug: Record<Lang, string>;
  /**
   * Το ΟΝΟΜΑ που διαβάζει ο επισκέπτης — στο δικό του αλφάβητο.
   * 🪤 ΓΙΑΤΙ ΕΔΩ ΚΑΙ ΟΧΙ ΣΤΟ `T` ΤΟΥ i18n: το `PUBLISHED` υπολογίζεται ως
   *    «κάθε γλώσσα που έχει ΟΛΑ τα κλειδιά του `T.el`». Ένα νέο κλειδί που θα
   *    έμπαινε πρώτα στα ελληνικά θα **ξε-δημοσίευε αυτόματα τις άλλες οκτώ
   *    γλώσσες** από τα hreflang, σιωπηλά. Εδώ ο τύπος `Record<Lang, string>`
   *    το κάνει σφάλμα μεταγλώττισης αντί για σφάλμα παραγωγής.
   */
  name: Record<Lang, string>;
  q: Query;
  /** Πόσα ακίνητα είχε στις 29/7 — για να ξέρουμε αν αδειάσει. */
  n: number;
};

export const FACETS: Facet[] = [
  // ── ΔΗΜΟΙ (247 · 147 · 64 · 58) — το πιο ισχυρό σήμα τοποθεσίας που έχουμε.
  //    Η ΠΕΡΙΟΧΗ μένει κλειδωμένη· ο δήμος είναι δημόσιος (lib/gate.ts).
  // 🪤 ΤΟ `municipality` ΕΙΝΑΙ ΤΟ **ΕΛΛΗΝΙΚΟ** ΚΛΕΙΔΙ, όχι λατινικό. Το `muniKey()`
  //    κανονικοποιεί τις έντεκα γραφές της βάσης σε ελληνική ονομαστική
  //    («Κασσάνδρας» → «Κασσάνδρα»), και ΜΕ ΑΥΤΟ συγκρίνουμε. Το λατινικό ζει
  //    μόνο στο `slug`, δηλαδή στη διεύθυνση που βλέπει ο επισκέπτης.
  { key: 'kassandra', n: 250, q: { municipality: 'Κασσάνδρα' },
    name: { el: 'Κασσάνδρα', en: 'Kassandra', bg: 'Касандра', sr: 'Kasandra', de: 'Kassandra', ro: 'Kassandra', tr: 'Kassandra', he: 'קסנדרה', ru: 'Кассандра' },
    slug: { el: 'κασσανδρα', en: 'kassandra', bg: 'kasandra', sr: 'kasandra', de: 'kassandra',
            ro: 'kassandra', tr: 'kassandra', he: 'kassandra', ru: 'kassandra' } },
  { key: 'sithonia', n: 149, q: { municipality: 'Σιθωνία' },
    name: { el: 'Σιθωνία', en: 'Sithonia', bg: 'Ситония', sr: 'Sitonija', de: 'Sithonia', ro: 'Sithonia', tr: 'Sithonia', he: 'סיתוניה', ru: 'Ситония' },
    slug: { el: 'σιθωνια', en: 'sithonia', bg: 'sitoniya', sr: 'sitonija', de: 'sithonia',
            ro: 'sithonia', tr: 'sithonia', he: 'sithonia', ru: 'sitoniya' } },
  { key: 'propontida', n: 65, q: { municipality: 'Νέα Προποντίδα' },
    name: { el: 'Νέα Προποντίδα', en: 'Nea Propontida', bg: 'Неа Пропонтида', sr: 'Nea Propontida', de: 'Nea Propontida', ro: 'Nea Propontida', tr: 'Nea Propontida', he: 'נאה פרופונטידה', ru: 'Неа Пропонтида' },
    slug: { el: 'νεα-προποντιδα', en: 'nea-propontida', bg: 'nea-propontida', sr: 'nea-propontida',
            de: 'nea-propontida', ro: 'nea-propontida', tr: 'nea-propontida', he: 'nea-propontida',
            ru: 'nea-propontida' } },
  { key: 'aristotelis', n: 59, q: { municipality: 'Αριστοτέλης' },
    name: { el: 'Αριστοτέλης', en: 'Aristotelis', bg: 'Аристотелис', sr: 'Aristotelis', de: 'Aristotelis', ro: 'Aristotelis', tr: 'Aristotelis', he: 'אריסטוטליס', ru: 'Аристотелис' },
    slug: { el: 'αριστοτελης', en: 'aristotelis', bg: 'aristotelis', sr: 'aristotelis',
            de: 'aristotelis', ro: 'aristotelis', tr: 'aristotelis', he: 'aristotelis',
            ru: 'aristotelis' } },

  // ── ΕΙΔΟΣ (309 · 207) — το φίλτρο #1 σε πραγματική χρήση (143 πατήματα).
  { key: 'homes', n: 309, q: { category: 'residency' },
    name: { el: 'Κατοικίες', en: 'Homes', bg: 'Жилища', sr: 'Kuće', de: 'Häuser', ro: 'Case', tr: 'Konutlar', he: 'בתים', ru: 'Жильё' },
    slug: { el: 'κατοικιες', en: 'homes-for-sale', bg: 'zhilishta', sr: 'kuce', de: 'haeuser',
            ro: 'case', tr: 'konut', he: 'batim', ru: 'zhilye' } },
  { key: 'land', n: 207, q: { category: 'land' },
    name: { el: 'Γη', en: 'Land', bg: 'Земя', sr: 'Zemljište', de: 'Grundstücke', ro: 'Terenuri', tr: 'Arsa', he: 'קרקע', ru: 'Земля' },
    slug: { el: 'γη', en: 'land-for-sale', bg: 'zemya', sr: 'zemljiste', de: 'grundstuecke',
            ro: 'terenuri', tr: 'arsa', he: 'karka', ru: 'zemlya' } },

  // ── ΤΥΠΟΣ — μονοκατοικίες (143+42) και μεζονέτες (98).
  { key: 'houses', n: 185, q: { subcategory: 'detached house' },
    name: { el: 'Μονοκατοικίες', en: 'Detached houses', bg: 'Къщи', sr: 'Samostalne kuće', de: 'Einfamilienhäuser', ro: 'Case individuale', tr: 'Müstakil evler', he: 'בתים פרטיים', ru: 'Дома' },
    slug: { el: 'μονοκατοικιες', en: 'detached-houses', bg: 'kashti', sr: 'samostalne-kuce',
            de: 'einfamilienhaeuser', ro: 'case-individuale', tr: 'mustakil-ev',
            he: 'batim-pratiyim', ru: 'doma' } },
  { key: 'maisonettes', n: 98, q: { subcategory: 'maisonette' },
    name: { el: 'Μεζονέτες', en: 'Maisonettes', bg: 'Мезонети', sr: 'Dupleksi', de: 'Maisonetten', ro: 'Duplexuri', tr: 'Dubleksler', he: 'דופלקסים', ru: 'Мезонеты' },
    slug: { el: 'μεζονετες', en: 'maisonettes', bg: 'mezoneti', sr: 'dupleksi', de: 'maisonetten',
            ro: 'duplexuri', tr: 'dubleks', he: 'dupleks', ru: 'mezonety' } },

  // ── ΜΠΡΟΣΤΑ ΣΤΗ ΘΑΛΑΣΣΑ (120) — το χαρακτηριστικό που κοστίζει +79% το τ.μ.
  { key: 'seafront', n: 120, q: { sea: 'front' },
    name: { el: 'Μπροστά στη θάλασσα', en: 'Seafront', bg: 'На първа линия', sr: 'Prva linija do mora', de: 'Direkt am Meer', ro: 'Pe malul mării', tr: 'Denize sıfır', he: 'קו ראשון לים', ru: 'Первая линия у моря' },
    slug: { el: 'μπροστα-στη-θαλασσα', en: 'seafront', bg: 'na-parva-linia', sr: 'prva-linija',
            de: 'am-meer', ro: 'pe-plaja', tr: 'denize-sifir', he: 'kav-rishon', ru: 'u-morya' } },

  // ── 🏆 ΠΟΛΥΤΕΛΕΙΑ (108, σήμανση `luxury:true` στη βάση).
  //    ΓΙΑΤΙ ΕΙΝΑΙ ΤΟ ΣΗΜΑΝΤΙΚΟΤΕΡΟ ΤΗΣ ΛΙΣΤΑΣ: τα logs έδειξαν ότι η σελίδα
  //    `/en/halkidiki-villas/` του σημερινού site πήρε **1.893** επισκέψεις έναντι
  //    **379** όλης της λίστας. Η λέξη «villa» φέρνει την κίνηση — και μέχρι σήμερα
  //    δεν είχαμε πού να την στείλουμε στο νέο site.
  { key: 'villas', n: 108, q: { luxury: true },
    name: { el: 'Βίλες', en: 'Villas', bg: 'Вили', sr: 'Vile', de: 'Villen', ro: 'Vile', tr: 'Villalar', he: 'וילות', ru: 'Виллы' },
    slug: { el: 'βιλες', en: 'villas-for-sale', bg: 'vili', sr: 'vile', de: 'villen',
            ro: 'vile', tr: 'villa', he: 'vilot', ru: 'villy' } },
];

/** Οι ΜΟΝΟΙ συνδυασμοί δύο θεμάτων που παίρνουν δική τους σελίδα. */
export const PAIRS: Array<[string, string]> = [
  ['kassandra', 'villas'], ['sithonia', 'villas'],
  ['kassandra', 'seafront'], ['sithonia', 'seafront'],
];

export function facetBySlug(lang: Lang, slug: string): Facet | undefined {
  const s = slug.toLowerCase();
  return FACETS.find((f) => f.slug[lang]?.toLowerCase() === s);
}

/** Η διεύθυνση μιας θεματικής σελίδας — ή της γυμνής λίστας αν δεν δοθεί θέμα. */
export function facetUrl(lang: Lang, ...keys: string[]): string {
  const base = lang === 'el' ? `/${SLUG.el.list}` : `/${lang}/${SLUG[lang].list}`;
  const parts = keys.map((k) => FACETS.find((f) => f.key === k)?.slug[lang]).filter(Boolean);
  return parts.length ? `${base}/${parts.join('/')}` : base;
}

/**
 * ΟΙ ΕΠΙΛΟΓΕΣ ΤΩΝ ΦΙΛΤΡΩΝ — μόνο ό,τι ΕΧΕΙ δεδομένα από πίσω.
 *
 * 🪤 Τα πλήθη μετρήθηκαν 29/7 στα 527 ακίνητα. Ό,τι δεν μπαίνει εδώ, μένει ρητά
 *    έξω: ένα φίλτρο που δίνει άδεια λίστα είναι **χειρότερο** από φίλτρο που δεν
 *    υπάρχει — ο επισκέπτης νομίζει ότι δεν έχουμε τίποτα.
 *    Έξω έμειναν: studio (3) · island (2) · office/hotel/penthouse (από 1).
 */
export const SUBTYPES = [
  { v: 'detached house', n: 185 },
  { v: 'maisonette', n: 98 },
  { v: 'apartment', n: 26 },
  { v: 'field', n: 169 },
  { v: 'plot', n: 38 },
] as const;

/** Οι τέσσερις πραγματικοί δήμοι, σε ΕΛΛΗΝΙΚΟ κλειδί — δες `muniKey()`. */
export const MUNIS = [
  { v: 'Κασσάνδρα', n: 250 },
  { v: 'Σιθωνία', n: 149 },
  { v: 'Νέα Προποντίδα', n: 65 },
  { v: 'Αριστοτέλης', n: 59 },
] as const;

/** Απόσταση από θάλασσα. Το «none» δεν μπαίνει: δίνει μηδέν αποτελέσματα. */
export const SEAS = [
  { v: 'front', n: 120 },
  { v: 'walking', n: 264 },
  { v: 'nearby', n: 131 },
] as const;

// ── ΤΟ ΦΙΛΤΡΑΡΙΣΜΑ ─────────────────────────────────────────────────────────

/**
 * 🪤 ΤΟ ΚΛΕΙΔΙ ΤΗΣ ΚΑΤΗΓΟΡΙΑΣ — και γιατί ΔΕΝ αρκεί το `a.category`.
 *
 * 309 ακίνητα λένε `residency`, 207 `land` — και **11 λένε `1`, `2` ή `3`**
 * (ακατέργαστα ids του τροφοδότη). 309 + 207 = 516, όχι 527.
 *
 * ΤΟ ΚΟΣΤΟΣ ΑΝ ΤΑ ΠΕΤΑΓΑΜΕ: μέσα στα έντεκα υπάρχει **«Βίλα με πισίνα ·
 * Βουρβουρού», 890.000 €**, ένα ρετιρέ 415.000 €, μεζονέτα 295.000 € και δύο
 * τεμάχια γης. Δηλαδή μια βίλα σχεδόν ενός εκατομμυρίου δεν θα εμφανιζόταν σε
 * **καμία** σελίδα κατηγορίας — ούτε στις «βίλες», που είναι η σελίδα με την
 * περισσότερη κίνηση όλου του site.
 *
 * Η χαρτογράφηση γίνεται από την **υποκατηγορία**, που στα έντεκα είναι
 * συμπληρωμένη (`penthouse`, `maisonette`, `apartment`, `studio`, `detached`,
 * `office`, `hotel`, `store`, `plot`…) ακόμη κι όταν η κατηγορία είναι σκουπίδι.
 */
const LAND_SUBS = new Set(['field', 'plot', 'parcel', 'land']);
const BIZ_SUBS = new Set(['office', 'store', 'hotel', 'business']);

export function catKey(a: Attrs): string {
  const c = String(a?.category ?? '').toLowerCase();
  if (c === 'residency' || c === 'land') return c;
  const s = String(a?.subcategory ?? '').toLowerCase().trim();
  if (!s) return '';
  if (LAND_SUBS.has(s)) return 'land';
  if (BIZ_SUBS.has(s)) return 'business';
  // Ό,τι έχει υποκατηγορία κατοικίας — ή απλώς δεν είναι γη/επαγγελματικό — είναι κατοικία.
  return 'residency';
}

function n(v: unknown): number {
  const x = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(x) ? x : 0;
}

/**
 * 🏊 ΠΙΣΙΝΑ — ΜΕΤΡΑΝΕ ΟΙ ΤΙΜΕΣ, ΟΧΙ ΤΟ ΜΗΚΟΣ ΤΟΥ ΠΙΝΑΚΑ.
 *
 * Το `pools` είναι πολλαπλής επιλογής με κωδικούς, και ο κωδικός **«2» σημαίνει
 * ΧΩΡΙΣ ΠΙΣΙΝΑ** — τον έχουν 203 ακίνητα. Το σημερινό `api/count.ts` ελέγχει
 * `pools.length > 0` και γι' αυτό απαντά **308 ενώ η αλήθεια είναι 103**:
 * μετράει ως «με πισίνα» και τα 203 «χωρίς».
 *   1 Απροσδιόριστο(3) · 2 Χωρίς(203) · 3 Εξωτερική ιδιωτική(70) · 4 Εξωτερική κοινόχρηστη(33)
 *   5/6 Εσωτερική → **μηδέν** σε ολόκληρο το χαρτοφυλάκιο.
 */
const POOL_YES = new Set(['3', '4', '5', '6']);
export function hasPool(a: Attrs): boolean {
  const v = a?.pools;
  return Array.isArray(v) && v.some((x) => POOL_YES.has(String(x)));
}

export function matches(p: SiteProperty, q: Query): boolean {
  const a: Attrs = p.attributes ?? {};

  // 🔑 Ο ΚΩΔΙΚΟΣ ΥΠΕΡΙΣΧΥΕΙ ΟΛΩΝ ΚΑΙ ΤΕΡΜΑΤΙΖΕΙ ΕΔΩ.
  //    Δεν είναι κριτήριο που στενεύει μια αναζήτηση — είναι διεύθυνση. Αν το
  //    συνδυάζαμε με τα υπόλοιπα φίλτρα, όποιος πληκτρολογούσε κωδικό ενώ είχε
  //    ενεργό φίλτρο («Κασσάνδρα») θα έπαιρνε ΚΕΝΗ λίστα για ακίνητο που
  //    υπάρχει — και θα συμπέραινε ότι δεν υπάρχει.
  if (q.id) return refOf(p) === q.id;

  if (q.category && catKey(a) !== q.category) return false;
  if (q.subcategory && !String(a.subcategory ?? '').toLowerCase().startsWith(q.subcategory)) return false;
  // 🪤 Ο ΔΗΜΟΣ ΦΙΛΤΡΑΡΕΤΑΙ **ΤΟΠΙΚΑ**, ΠΟΤΕ ΜΕΣΩ API. Η βάση κρατά «Κασσάνδρας»
  //    (γενική) και το API κάνει ακριβή σύγκριση κειμένου — αν του στέλναμε το
  //    κλειδί «Κασσάνδρα» (ονομαστική) που ταξιδεύει στα URL μας, η σελίδα του
  //    μεγαλύτερου δήμου θα σέρβιρε **3 ακίνητα αντί για 250**. Το `muniKey()`
  //    πτυχώνει και τις έντεκα γραφές.
  if (q.municipality && muniKey(a) !== q.municipality) return false;
  if (q.sea && a.sea_access !== q.sea) return false;
  // ⚠️ `luxury` είναι boolean στη βάση (108 ακίνητα). ΜΗΝ το μπερδέψεις με το
  //    `lux_prop`, που έχει και 2 `false` — δηλαδή δεν είναι το ίδιο πεδίο.
  //    ⛔ ΚΑΙ ΠΟΤΕ ΜΕΣΩ API: το EALIDA API **αγνοεί σιωπηλά** ό,τι δεν ξέρει, και
  //       δεν ξέρει `luxury` — ένα `?luxury=1` γυρίζει **και τα 527**, χωρίς σφάλμα.
  if (q.luxury && a.luxury !== true) return false;
  if (q.pool && !hasPool(a)) return false;

  // 💰 Η ΤΙΜΗ ΦΙΛΤΡΑΡΕΙ ΜΟΝΟ ΟΤΑΝ ΕΙΝΑΙ ΟΡΑΤΗ. Ακίνητο «κατόπιν συνεννόησης»
  //    δεν πρέπει να εξαφανίζεται επειδή ο επισκέπτης έβαλε ανώτατο όριο — δεν
  //    ξέρουμε αν το ξεπερνά, και το να το κρύψουμε είναι χαμένη ευκαιρία.
  if ((q.priceMin || q.priceMax) && priceVisible(a)) {
    const v = priceOf(a);
    if (q.priceMin && v < q.priceMin) return false;
    if (q.priceMax && v > q.priceMax) return false;
  }

  // 📐 ΤΑ ΤΕΤΡΑΓΩΝΙΚΑ ΕΙΝΑΙ ΔΥΟ ΑΣΥΜΒΑΤΟΙ ΚΟΣΜΟΙ ΣΕ ΕΝΑ ΠΕΔΙΟ.
  //    Κατοικίες 28–1.230 m² (διάμεσος 145) · γη 300–268.000 m² (διάμεσος 7.200).
  //    Γι' αυτό το εύρος δίνεται ΞΕΧΩΡΙΣΤΑ ανά κόσμο και δεν αναμειγνύεται: ένα
  //    κοινό «έως 300 m²» θα έπιανε 267 ακίνητα εκ των οποίων **ένα** μόνο γη.
  //    🪤 Και ακίνητο ΧΩΡΙΣ τετραγωνικά δεν περνά ως «0» — το `api/count.ts` έχει
  //       ακριβώς αυτό το σφάλμα (`Number(a.sqm ?? 0)`) και έτσι 11 ακίνητα χωρίς
  //       μέτρηση εμφανίζονται σε κάθε αναζήτηση «έως Χ τ.μ.».
  // 🛏️ ΥΠΝΟΔΩΜΑΤΙΑ ΩΣ «ΤΟΥΛΑΧΙΣΤΟΝ», ΟΧΙ ΑΚΡΙΒΩΣ. Ο αγοραστής που θέλει τρία
  //    δέχεται και τέσσερα· ένα φίλτρο ισότητας θα του έκρυβε τα μεγαλύτερα.
  //    Μετρήθηκε στο API: `bedrooms=4` δίνει 169 (>=4) ενώ ακριβώς 4 είναι 84 —
  //    δηλαδή το ίδιο το EALIDA το ερμηνεύει ήδη έτσι.
  //    Ακίνητο χωρίς καταγεγραμμένα υπνοδωμάτια (γη, οικόπεδα) ΔΕΝ περνά.
  if (q.beds) {
    const b = Number(a.bedrooms);
    if (!Number.isFinite(b) || b < q.beds) return false;
  }
  if (q.sqmMin || q.sqmMax) {
    const v = n(a.sqm);
    if (!v) return false;
    if (q.sqmMin && v < q.sqmMin) return false;
    if (q.sqmMax && v > q.sqmMax) return false;
  }
  return true;
}

/**
 * ΤΑΞΙΝΟΜΗΣΗ. Προεπιλογή «νεότερα» — και μένει διακριτική, γιατί στα logs
 * κανείς δεν την άλλαξε ποτέ (204/204 στην προεπιλογή).
 *
 * 🪤 Τα ακίνητα ΧΩΡΙΣ ορατή τιμή πάνε ΠΑΝΤΑ στο τέλος όταν ταξινομούμε κατά
 *    τιμή — αλλιώς με `price_asc` θα έβγαιναν πρώτα τα ακριβότερα του καταλόγου
 *    (τιμή 0), δηλαδή ακριβώς ανάποδα από αυτό που ζήτησε ο επισκέπτης.
 */
export function sortItems(items: SiteProperty[], sort: Sort = SORT_DEFAULT): SiteProperty[] {
  const out = [...items];
  const price = (p: SiteProperty) => {
    const a = p.attributes ?? {};
    return priceVisible(a) ? priceOf(a) : null;
  };
  const cmpNullLast = (x: number | null, y: number | null, dir: number) => {
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * dir;
  };
  const fresh = (p: SiteProperty) => Date.parse(String(p.attributes?.source_updated_at ?? '')) || 0;
  // 🪤 ΤΟ ΜΗΔΕΝ ΕΜΒΑΔΟΝ ΠΑΕΙ ΤΕΛΕΥΤΑΙΟ ΚΑΙ ΣΤΙΣ ΔΥΟ ΚΑΤΕΥΘΥΝΣΕΙΣ. Με σκέτη
  //    αύξουσα, τα ακίνητα χωρίς καταχωρημένα τ.μ. (τιμή 0) θα έβγαιναν ΠΡΩΤΑ —
  //    δηλαδή «τα μικρότερα πρώτα» θα έδειχνε πρώτα όσα δεν ξέρουμε καν πόσα είναι.
  const sqm = (p: SiteProperty) => { const v = n(p.attributes?.sqm); return v > 0 ? v : null; };

  switch (sort) {
    case 'price_asc':  out.sort((p, q) => cmpNullLast(price(p), price(q), 1)); break;
    case 'price_desc': out.sort((p, q) => cmpNullLast(price(p), price(q), -1)); break;
    case 'sqm_desc':   out.sort((p, q) => cmpNullLast(sqm(p), sqm(q), -1)); break;
    case 'sqm_asc':    out.sort((p, q) => cmpNullLast(sqm(p), sqm(q), 1)); break;
    case 'new':        out.sort((p, q) => fresh(q) - fresh(p)); break;
    default: {
      /**
       * «ΠΡΟΤΕΙΝΟΜΕΝΑ» — η προεπιλογή.
       *
       * ⚠️ ΠΡΟΣΟΧΗ, ΑΥΤΟ ΤΟ ΟΡΙΣΑΜΕ ΕΜΕΙΣ. Το σημερινό site έχει «Recommended»
       *    ως προεπιλογή, αλλά ο κανόνας του ζει στον δικό του κώδικα και ΔΕΝ
       *    τον ξέρουμε. Ό,τι κι αν βάζαμε θα ήταν εικασία· προτιμήθηκε κανόνας
       *    που εξηγείται σε μία γραμμή αντί για βαθμολογία που δεν ελέγχεται:
       *
       *      πρώτα όσα έχουν ΟΡΑΤΗ ΤΙΜΗ, μετά τα πολυτελή, μετά τα πιο πρόσφατα.
       *
       *    Η ορατή τιμή είναι πρώτη επειδή ακίνητο «κατόπιν αιτήματος» στην
       *    κορυφή της πρώτης σελίδας δεν δίνει στον επισκέπτη τίποτα να κρίνει.
       * 📌 ΑΝ Ο GEORGE ΠΕΙ ΑΛΛΟ ΚΡΙΤΗΡΙΟ, αλλάζει ΜΟΝΟ αυτό το μπλοκ.
       */
      const score = (p: SiteProperty) => {
        const a = p.attributes ?? {};
        return (priceVisible(a) ? 2 : 0) + (a.luxury ? 1 : 0);
      };
      out.sort((p, q) => (score(q) - score(p)) || (fresh(q) - fresh(p)));
    }
  }
  return out;
}

export type Result = {
  items: SiteProperty[];
  total: number;
  page: number;
  pages: number;
};

/**
 * @param perPage Πόσες ΚΑΡΤΕΣ ανά σελίδα. Ο καλών το υπολογίζει με
 *   `cardsPerPage()`, ώστε μαζί με το κουτί εγγραφής να βγαίνει πολλαπλάσιο
 *   του 3 και να μη μένει ορφανό ακίνητο στην τελευταία σειρά.
 */
export function runQuery(all: SiteProperty[], q: Query, perPage = PER_PAGE): Result {
  const hit = all.filter((p) => matches(p, q));
  const sorted = sortItems(hit, q.sort ?? SORT_DEFAULT);
  const size = Math.max(1, perPage);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);
  return {
    items: sorted.slice((page - 1) * size, page * size),
    total: sorted.length,
    page,
    pages,
  };
}

// ── ΔΙΕΥΘΥΝΣΕΙΣ ────────────────────────────────────────────────────────────
/** Οι παράμετροι που ΕΠΙΤΡΕΠΕΤΑΙ να μπουν στο URL. Ό,τι άλλο αγνοείται. */
// 🛡️ ΤΟ `area` ΛΕΙΠΕΙ ΣΚΟΠΙΜΑ — και πρέπει να μείνει έξω για πάντα.
//    Το EALIDA API φιλτράρει κανονικά σε περιοχή, οπότε ένα `?area=Σάνη` θα
//    έλεγε σε μη συνδεδεμένο ποια ακίνητα είναι στη Σάνη χωρίς να δει τη λέξη
//    πουθενά — παρακάμπτοντας ολόκληρο το lib/gate.ts.
const PARAMS = ['price_min', 'price_max', 'sqm_min', 'sqm_max', 'beds',
                'type', 'muni', 'sea', 'pool', 'sort', 'page', 'per', 'id',
                // the names the search bar, filter sheet, collections and menu send (aliases below)
                'category', 'subcategory', 'municipality', 'sea_access', 'bedrooms'] as const;

/** Category keys a URL may ask for — the same values as `catKey()`. */
const CATEGORIES = ['residency', 'land', 'business'] as const;
/** Kinds a URL may ask for: the listing subtypes plus `hotel` (filter sheet). */
const KIND_KEYS = [...SUBTYPES.map((x) => x.v), 'hotel'].map((v) => ({ v }));

export function queryFromParams(sp: URLSearchParams): Partial<Query> {
  const num = (k: string) => {
    const v = Number(sp.get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const s = sp.get('sort') as Sort | null;
  // Οι τιμές ελέγχονται ΑΠΕΝΑΝΤΙ ΣΤΟΥΣ ΚΑΤΑΛΟΓΟΥΣ — ό,τι δεν αναγνωρίζεται
  // αγνοείται σιωπηλά αντί να παράγει άδεια λίστα από τυχαία παράμετρο.
  const one = (k: string, list: readonly { v: string }[]): string | undefined => {
    const v = sp.get(k) ?? '';
    return list.some((x) => x.v === v) ? v : undefined;
  };
  // The site's own forms and links send the long names (`category`, `subcategory`,
  // `municipality`, `sea_access`, `bedrooms`); the short ones are what `paramsOf()`
  // writes. Both are accepted, short name first — before this every form search
  // returned the whole catalogue while /api/count showed a filtered number.
  return {
    priceMin: num('price_min'), priceMax: num('price_max'),
    sqmMin: num('sqm_min'), sqmMax: num('sqm_max'), beds: num('beds') ?? num('bedrooms'),
    category: one('category', CATEGORIES.map((v) => ({ v }))),
    subcategory: one('type', KIND_KEYS) ?? one('subcategory', KIND_KEYS),
    municipality: one('muni', MUNIS) ?? one('municipality', MUNIS),
    sea: one('sea', SEAS) ?? one('sea_access', SEAS),
    pool: sp.get('pool') === '1' || undefined,
    sort: s && SORTS.includes(s) ? s : undefined,
    page: num('page'),
    // Μόνο από τον κατάλογο — ό,τι άλλο αγνοείται, ώστε ένα `?per=100000` να μη
    // ζητήσει από τον διακομιστή να αποδώσει ολόκληρο τον κατάλογο σε μία σελίδα.
    per: (PER_PAGE_OPTIONS as readonly number[]).includes(Number(sp.get('per')))
      ? Number(sp.get('per')) : undefined,
    // 🔑 Ο κωδικός είναι ΔΙΕΥΘΥΝΣΗ, όχι φίλτρο: κρατάμε μόνο ψηφία (ως 6), ώστε
    //    ούτε κείμενο ούτε μοτίβο να μπορεί να μπει από εδώ.
    id: (sp.get('id') ?? '').replace(/\D+/g, '').slice(0, 6) || undefined,
  };
}

export function paramsOf(q: Query): string {
  const sp = new URLSearchParams();
  if (q.priceMin) sp.set('price_min', String(q.priceMin));
  if (q.priceMax) sp.set('price_max', String(q.priceMax));
  if (q.sqmMin) sp.set('sqm_min', String(q.sqmMin));
  if (q.sqmMax) sp.set('sqm_max', String(q.sqmMax));
  if (q.beds) sp.set('beds', String(q.beds));
  if (q.category) sp.set('category', q.category);
  if (q.subcategory) sp.set('type', q.subcategory);
  if (q.municipality) sp.set('muni', q.municipality);
  if (q.sea) sp.set('sea', q.sea);
  if (q.pool) sp.set('pool', '1');
  if (q.id) sp.set('id', q.id);
  if (q.sort && q.sort !== SORT_DEFAULT) sp.set('sort', q.sort);
  if (q.per && q.per !== PER_PAGE) sp.set('per', String(q.per));
  if (q.page && q.page > 1) sp.set('page', String(q.page));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * 🔍 ΜΠΑΙΝΕΙ ΣΤΗ GOOGLE Ή ΟΧΙ;
 *
 * ΝΑΙ μόνο για: γυμνή λίστα · ένα θέμα · οι εγκεκριμένοι συνδυασμοί δύο θεμάτων.
 * ΟΧΙ για: οτιδήποτε με παραμέτρους (τιμή, ταξινόμηση) και για σελίδα >1.
 *
 * Χωρίς αυτόν τον κανόνα, κάθε συνδυασμός φίλτρων θα γινόταν ξεχωριστή σελίδα:
 * 10 θέματα × τιμές × ταξινομήσεις × σελίδες = **χιλιάδες σχεδόν-ίδιες σελίδες**,
 * που η Google τις αντιμετωπίζει ως χαμηλής ποιότητας — και τιμωρεί ΟΛΟ το site,
 * όχι μόνο αυτές.
 */
export function indexable(facets: string[], sp: URLSearchParams): boolean {
  for (const k of PARAMS) if (sp.get(k)) return false;
  if (facets.length === 0 || facets.length === 1) return true;
  if (facets.length === 2) {
    return PAIRS.some(([a, b]) =>
      (a === facets[0] && b === facets[1]) || (a === facets[1] && b === facets[0]));
  }
  return false;
}

// ── ΤΑ ΚΕΙΜΕΝΑ ΤΗΣ ΛΙΣΤΑΣ ──────────────────────────────────────────────────
// 🪤 Ζουν ΕΔΩ και όχι στο `T` του i18n, για τον ίδιο λόγο με τα ονόματα των
//    θεμάτων: το `PUBLISHED` απαιτεί ΚΑΘΕ γλώσσα να έχει ΟΛΑ τα κλειδιά του
//    `T.el`. Ένα κλειδί που θα έμπαινε πρώτα στα ελληνικά θα ξε-δημοσίευε τις
//    άλλες οκτώ από τα hreflang, σιωπηλά. Ο τύπος `Record<Lang, …>` κάνει την
//    παράλειψη σφάλμα μεταγλώττισης.
type UI = {
  all: string;            // τίτλος γυμνής λίστας
  found: string;          // «Βρέθηκαν {n}»
  filters: string;
  clear: string;
  none: string;           // κανένα αποτέλεσμα
  noneHint: string;
  sort: string;
  /** Οι ΕΞΙ τύποι — ίδιοι με το σημερινό site. Δες `SORTS`. */
  sortRec: string; sortNew: string;
  sortPriceAsc: string; sortPriceDesc: string;
  sortSqmAsc: string; sortSqmDesc: string;
  perPage: string; idLabel: string; idPh: string; idGo: string; idNone: string;
  joinH: string; joinP: string; joinCta: string;
  prev: string; next: string; pageOf: string;
  priceFrom: string; priceTo: string; areaFrom: string; areaTo: string;
  apply: string;
  beds: string; type: string; muni: string; seaLabel: string; any: string;
  saveSearch: string; joinLock: string; joinB1: string; joinB2: string; joinB3: string;
};

export const LIST_UI: Record<Lang, UI> = {
  el: { all: 'Ακίνητα προς πώληση στη Χαλκιδική', found: 'Βρέθηκαν {n}', filters: 'Φίλτρα',
    clear: 'Καθαρισμός', none: 'Κανένα ακίνητο με αυτά τα κριτήρια',
    noneHint: 'Δοκίμασε να αφαιρέσεις ένα φίλτρο.', sort: 'Ταξινόμηση',
    sortNew: 'Πρόσφατα', sortPriceAsc: 'Τιμή: αύξουσα',
    sortPriceDesc: 'Τιμή: φθίνουσα', sortSqmDesc: 'Μεγαλύτερα πρώτα', sortSqmAsc: 'Μικρότερα πρώτα', sortRec: 'Προτεινόμενα',
    perPage: 'Ανά σελίδα', idLabel: 'Αναζήτηση με κωδικό', idPh: 'Κωδικός', idGo: 'Εύρεση', idNone: 'Δεν βρέθηκε ακίνητο με αυτόν τον κωδικό',
    joinH: 'Τρία πράγματα που δεν φαίνονται από εδώ',
    joinP: 'Με δωρεάν λογαριασμό βλέπεις την ακριβή περιοχή κάθε ακινήτου, όλες τις φωτογραφίες, και κρατάς τα αγαπημένα σου.',
    joinCta: 'Σύνδεση ή εγγραφή', prev: 'Προηγούμενη', next: 'Επόμενη', pageOf: 'Σελίδα {a} από {b}',
    priceFrom: 'Τιμή από', priceTo: 'Τιμή έως', areaFrom: 'Εμβαδόν από', areaTo: 'Εμβαδόν έως',
    apply: 'Εφαρμογή',
    beds: 'Υπνοδωμάτια', type: 'Τύπος', muni: 'Δήμος', seaLabel: 'Θάλασσα', any: 'Όλα', saveSearch: 'Αποθήκευση', joinLock: 'Κλειδωμένο', joinB1: 'Η ακριβής περιοχή κάθε ακινήτου', joinB2: 'Ολόκληρο το άλμπουμ, σε πλήρη ανάλυση', joinB3: 'Ειδοποίηση μόλις μπει κάτι που ταιριάζει' },
  en: { all: 'Property for sale in Halkidiki, Greece', found: '{n} found', filters: 'Filters',
    clear: 'Clear', none: 'No properties match these criteria',
    noneHint: 'Try removing one filter.', sort: 'Sort',
    sortNew: 'Recent', sortPriceAsc: 'Price: low to high',
    sortPriceDesc: 'Price: high to low', sortSqmDesc: 'Largest first', sortSqmAsc: 'Smallest first', sortRec: 'Recommended',
    perPage: 'Per page', idLabel: 'Search by ID', idPh: 'Property ID', idGo: 'Find', idNone: 'No property with that ID',
    joinH: 'Three things this page does not show',
    joinP: 'A free account shows the exact area of every property, all photographs, and keeps your favourites.',
    joinCta: 'Sign in or register', prev: 'Previous', next: 'Next', pageOf: 'Page {a} of {b}',
    priceFrom: 'Price from', priceTo: 'Price to', areaFrom: 'Area from', areaTo: 'Area to',
    apply: 'Apply',
    beds: 'Bedrooms', type: 'Type', muni: 'Municipality', seaLabel: 'Sea', any: 'All', saveSearch: 'Save', joinLock: 'Locked', joinB1: 'The exact area of every property', joinB2: 'The full album, at full resolution', joinB3: 'An alert the moment something fits' },
  de: { all: 'Immobilien in Chalkidiki, Griechenland', found: '{n} gefunden', filters: 'Filter',
    clear: 'Zurücksetzen', none: 'Keine Immobilien mit diesen Kriterien',
    noneHint: 'Entfernen Sie einen Filter.', sort: 'Sortieren',
    sortNew: 'Neueste', sortPriceAsc: 'Preis: aufsteigend',
    sortPriceDesc: 'Preis: absteigend', sortSqmDesc: 'Größte zuerst', sortSqmAsc: 'Kleinste zuerst', sortRec: 'Empfohlen',
    perPage: 'Pro Seite', idLabel: 'Suche nach ID', idPh: 'Objekt-ID', idGo: 'Suchen', idNone: 'Kein Objekt mit dieser ID',
    joinH: 'Drei Dinge, die diese Seite nicht zeigt',
    joinP: 'Mit einem kostenlosen Konto sehen Sie die genaue Lage jeder Immobilie, alle Fotos, und speichern Ihre Favoriten.',
    joinCta: 'Anmelden oder registrieren', prev: 'Zurück', next: 'Weiter', pageOf: 'Seite {a} von {b}',
    priceFrom: 'Preis ab', priceTo: 'Preis bis', areaFrom: 'Fläche ab', areaTo: 'Fläche bis',
    apply: 'Übernehmen',
    beds: 'Schlafzimmer', type: 'Typ', muni: 'Gemeinde', seaLabel: 'Meer', any: 'Alle', saveSearch: 'Speichern', joinLock: 'Gesperrt', joinB1: 'Die genaue Lage jeder Immobilie', joinB2: 'Das komplette Album, in voller Auflösung', joinB3: 'Benachrichtigung, sobald etwas passt' },
  bg: { all: 'Имоти за продажба в Халкидики, Гърция', found: 'Намерени {n}', filters: 'Филтри',
    clear: 'Изчисти', none: 'Няма имоти с тези критерии',
    noneHint: 'Опитайте да премахнете един филтър.', sort: 'Подреждане',
    sortNew: 'Скорошни', sortPriceAsc: 'Цена: възходящо',
    sortPriceDesc: 'Цена: низходящо', sortSqmDesc: 'Най-големи първо', sortSqmAsc: 'Най-малки първо', sortRec: 'Препоръчани',
    perPage: 'На страница', idLabel: 'Търсене по код', idPh: 'Код на имота', idGo: 'Намери', idNone: 'Няма имот с този код',
    joinH: 'Три неща, които тази страница не показва',
    joinP: 'С безплатен профил виждате точния район на всеки имот, всички снимки и запазвате любимите си.',
    joinCta: 'Вход или регистрация', prev: 'Назад', next: 'Напред', pageOf: 'Страница {a} от {b}',
    priceFrom: 'Цена от', priceTo: 'Цена до', areaFrom: 'Площ от', areaTo: 'Площ до',
    apply: 'Приложи',
    beds: 'Спални', type: 'Тип', muni: 'Община', seaLabel: 'Море', any: 'Всички', saveSearch: 'Запази', joinLock: 'Заключено', joinB1: 'Точният район на всеки имот', joinB2: 'Целият албум, в пълна резолюция', joinB3: 'Известие щом се появи подходящо' },
  sr: { all: 'Nekretnine na prodaju na Halkidikiju, Grčka', found: 'Pronađeno {n}', filters: 'Filteri',
    clear: 'Obriši', none: 'Nema nekretnina sa ovim kriterijumima',
    noneHint: 'Pokušajte da uklonite jedan filter.', sort: 'Sortiranje',
    sortNew: 'Nedavno', sortPriceAsc: 'Cena: rastuće',
    sortPriceDesc: 'Cena: opadajuće', sortSqmDesc: 'Najveće prvo', sortSqmAsc: 'Najmanje prvo', sortRec: 'Preporučeno',
    perPage: 'Po stranici', idLabel: 'Pretraga po šifri', idPh: 'Šifra nekretnine', idGo: 'Nađi', idNone: 'Nema nekretnine sa tom šifrom',
    joinH: 'Tri stvari koje ova stranica ne pokazuje',
    joinP: 'Sa besplatnim nalogom vidite tačnu lokaciju svake nekretnine, sve fotografije i čuvate omiljene.',
    joinCta: 'Prijava ili registracija', prev: 'Prethodna', next: 'Sledeća', pageOf: 'Strana {a} od {b}',
    priceFrom: 'Cena od', priceTo: 'Cena do', areaFrom: 'Površina od', areaTo: 'Površina do',
    apply: 'Primeni',
    beds: 'Spavaće sobe', type: 'Tip', muni: 'Opština', seaLabel: 'More', any: 'Sve', saveSearch: 'Sačuvaj', joinLock: 'Zaključano', joinB1: 'Tačna lokacija svake nekretnine', joinB2: 'Ceo album, u punoj rezoluciji', joinB3: 'Obaveštenje čim se pojavi odgovarajuće' },
  ro: { all: 'Proprietăți de vânzare în Halkidiki, Grecia', found: '{n} găsite', filters: 'Filtre',
    clear: 'Șterge', none: 'Nicio proprietate cu aceste criterii',
    noneHint: 'Încercați să eliminați un filtru.', sort: 'Sortare',
    sortNew: 'Recente', sortPriceAsc: 'Preț: crescător',
    sortPriceDesc: 'Preț: descrescător', sortSqmDesc: 'Cele mai mari întâi', sortSqmAsc: 'Cele mai mici întâi', sortRec: 'Recomandate',
    perPage: 'Pe pagină', idLabel: 'Căutare după cod', idPh: 'Cod proprietate', idGo: 'Caută', idNone: 'Nicio proprietate cu acest cod',
    joinH: 'Trei lucruri pe care pagina nu le arată',
    joinP: 'Un cont gratuit vă arată zona exactă a fiecărei proprietăți, toate fotografiile și vă păstrează favoritele.',
    joinCta: 'Autentificare sau înregistrare', prev: 'Anterioară', next: 'Următoarea',
    pageOf: 'Pagina {a} din {b}', priceFrom: 'Preț de la', priceTo: 'Preț până la',
    areaFrom: 'Suprafață de la', areaTo: 'Suprafață până la', apply: 'Aplică',
    beds: 'Dormitoare', type: 'Tip', muni: 'Comună', seaLabel: 'Mare', any: 'Toate', saveSearch: 'Salvează', joinLock: 'Blocat', joinB1: 'Zona exactă a fiecărei proprietăți', joinB2: 'Albumul complet, la rezoluție maximă', joinB3: 'Alertă imediat ce apare ceva potrivit' },
  tr: { all: 'Halkidiki, Yunanistan’da satılık gayrimenkul', found: '{n} sonuç', filters: 'Filtreler',
    clear: 'Temizle', none: 'Bu kriterlere uygun gayrimenkul yok',
    noneHint: 'Bir filtreyi kaldırmayı deneyin.', sort: 'Sırala',
    sortNew: 'Yeni', sortPriceAsc: 'Fiyat: artan',
    sortPriceDesc: 'Fiyat: azalan', sortSqmDesc: 'Önce en büyük', sortSqmAsc: 'Önce en küçük', sortRec: 'Önerilen',
    perPage: 'Sayfa başına', idLabel: 'Koda göre arama', idPh: 'Mülk kodu', idGo: 'Bul', idNone: 'Bu koda sahip mülk yok',
    joinH: 'Bu sayfanın göstermediği üç şey',
    joinP: 'Ücretsiz hesapla her gayrimenkulün tam bölgesini, tüm fotoğrafları görür ve favorilerinizi saklarsınız.',
    joinCta: 'Giriş veya kayıt', prev: 'Önceki', next: 'Sonraki', pageOf: 'Sayfa {a} / {b}',
    priceFrom: 'Fiyat en az', priceTo: 'Fiyat en fazla', areaFrom: 'Alan en az',
    areaTo: 'Alan en fazla', apply: 'Uygula',
    beds: 'Yatak odası', type: 'Tür', muni: 'Belediye', seaLabel: 'Deniz', any: 'Tümü', saveSearch: 'Kaydet', joinLock: 'Kilitli', joinB1: 'Her gayrimenkulün tam bölgesi', joinB2: 'Albümün tamamı, tam çözünürlükte', joinB3: 'Uygun bir şey çıkar çıkmaz bildirim' },
  he: { all: 'נדל״ן למכירה בחלקידיקי, יוון', found: 'נמצאו {n}', filters: 'סינון',
    clear: 'ניקוי', none: 'אין נכסים בקריטריונים אלה',
    noneHint: 'נסו להסיר מסנן אחד.', sort: 'מיון',
    sortNew: 'עדכני', sortPriceAsc: 'מחיר: מהנמוך לגבוה',
    sortPriceDesc: 'מחיר: מהגבוה לנמוך', sortSqmDesc: 'הגדולים תחילה', sortSqmAsc: 'הקטנים תחילה', sortRec: 'מומלצים',
    perPage: 'לעמוד', idLabel: 'חיפוש לפי קוד', idPh: 'קוד נכס', idGo: 'חפש', idNone: 'לא נמצא נכס עם קוד זה',
    joinH: 'שלושה דברים שהדף הזה לא מראה',
    joinP: 'חשבון חינם מציג את המיקום המדויק של כל נכס, את כל התמונות, ושומר את המועדפים שלכם.',
    joinCta: 'כניסה או הרשמה', prev: 'הקודם', next: 'הבא', pageOf: 'עמוד {a} מתוך {b}',
    priceFrom: 'מחיר מ־', priceTo: 'מחיר עד', areaFrom: 'שטח מ־', areaTo: 'שטח עד',
    apply: 'החל',
    beds: 'חדרי שינה', type: 'סוג', muni: 'רשות', seaLabel: 'ים', any: 'הכול', saveSearch: 'שמירה', joinLock: 'נעול', joinB1: 'המיקום המדויק של כל נכס', joinB2: 'האלבום המלא, ברזולוציה מלאה', joinB3: 'התראה ברגע שמתפרסם משהו מתאים' },
  ru: { all: 'Недвижимость на Халкидики, Греция', found: 'Найдено: {n}', filters: 'Фильтры',
    clear: 'Сбросить', none: 'Нет объектов по этим критериям',
    noneHint: 'Попробуйте убрать один фильтр.', sort: 'Сортировка',
    sortNew: 'Недавние', sortPriceAsc: 'Цена: по возрастанию',
    sortPriceDesc: 'Цена: по убыванию', sortSqmDesc: 'Сначала большие', sortSqmAsc: 'Сначала меньшие', sortRec: 'Рекомендуемые',
    perPage: 'На странице', idLabel: 'Поиск по коду', idPh: 'Код объекта', idGo: 'Найти', idNone: 'Объект с таким кодом не найден',
    joinH: 'Три вещи, которых эта страница не показывает',
    joinP: 'Бесплатный аккаунт открывает точный район каждого объекта, все фотографии и сохраняет избранное.',
    joinCta: 'Вход или регистрация', prev: 'Назад', next: 'Вперёд', pageOf: 'Страница {a} из {b}',
    priceFrom: 'Цена от', priceTo: 'Цена до', areaFrom: 'Площадь от', areaTo: 'Площадь до',
    apply: 'Применить',
    beds: 'Спальни', type: 'Тип', muni: 'Муниципалитет', seaLabel: 'Море', any: 'Все', saveSearch: 'Сохранить', joinLock: 'Закрыто', joinB1: 'Точный район каждого объекта', joinB2: 'Весь альбом целиком, в полном разрешении', joinB3: 'Уведомление, как только появится подходящее' },
};

/** Το κείμενο με αντικατάσταση {n}/{a}/{b}. */
export function ui(lang: Lang, key: keyof UI, vars: Record<string, string | number> = {}): string {
  let s = LIST_UI[lang]?.[key] ?? LIST_UI.el[key];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
