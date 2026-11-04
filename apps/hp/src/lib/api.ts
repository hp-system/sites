// ───────────────────────────────────────────────────────────────────────────
// Η γέφυρα δεδομένων: EALIDA API → site. Μόνο server-side.
// Το site ΔΕΝ αποθηκεύει τίποτα — ούτε εικόνες, ούτε αντίγραφα. Μόνο διαβάζει.
// ───────────────────────────────────────────────────────────────────────────
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

export type Attrs = Record<string, any>;

export type SiteProperty = {
  id: string;
  reference?: string | null;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  attributes: Attrs;
  /** true όταν είναι secret portfolio και ο επισκέπτης δεν είναι μέλος:
      το API γυρίζει μόνο τα ακίνδυνα πεδία και το site δείχνει το κλειδωμένο. */
  locked?: boolean;
};

type ListResponse = { total: number; page: number; limit: number; items: SiteProperty[] };

async function get<T>(path: string, memberToken?: string, country?: string): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (memberToken) headers['x-member-token'] = memberToken;
  if (country) headers['x-visitor-country'] = country;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`EALIDA API ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * The visitor's country, for the energy-certificate rule (D-20261104-GT-2, issue #18): visitors
 * from Greece do not see properties without a valid certificate in lists; the CRM API applies
 * the rule when the site forwards `x-visitor-country` (crm-v0.7.0).
 * Read ONLY from Cloudflare's `CF-IPCountry`, set by the edge on the server side — never from
 * a query, a cookie or anything else the browser controls. Unknown (no header, `XX`, Tor `T1`)
 * → undefined → the API shows everything, as for a visitor from elsewhere.
 * Do NOT pass it for the sitemap or feeds: search engines keep seeing every property.
 * Rejected: a GeoIP table in the site — a second source of truth next to the edge's.
 */
export function visitorCountry(request: Request): string | undefined {
  const c = (request.headers.get('cf-ipcountry') || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : undefined;
}

export const api = {
  properties: (q: Record<string, string | number | undefined> = {}, memberToken?: string, country?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v));
    const qs = p.toString();
    return get<ListResponse>(`/site/properties${qs ? '?' + qs : ''}`, memberToken, country);
  },
  property: (id: string, memberToken?: string, country?: string) =>
    get<SiteProperty>(`/site/property/${encodeURIComponent(id)}`, memberToken, country),
};

/** Το API δίνει 60 ανά σελίδα — μαζεύουμε όσα χρειάζονται για τα σύνολα της αρχικής. */
/**
 * ΔΟΚΙΜΑΣΤΙΚΟ Ή ΑΛΗΘΙΝΟ; — ΤΟ ΦΙΛΤΡΟ ΠΟΥ ΒΓΑΖΕΙ ΤΑ ΨΕΥΤΙΚΑ ΑΠΟ ΟΛΟ ΤΟ SITE.
 *
 * 🔴 ΤΙ ΕΒΡΙΣΚΕ Ο ΕΠΙΣΚΕΠΤΗΣ: οκτώ σχεδόν κενές σελίδες ακινήτου με φωτογραφίες από
 *    το **Unsplash** — «office · Πολύγυρος», «Ξενοδοχείο 18 δωματίων» — και **πραγματικές**
 *    σελίδες τις πρότειναν στα «Παρόμοια». Δηλαδή ο πελάτης που κοίταζε αληθινή βίλα
 *    οδηγούνταν σε δείγμα με φωτογραφία αποθέματος.
 *
 * 🔑 ΓΙΑΤΙ ΤΟ UNSPLASH ΚΑΙ ΟΧΙ ΤΟ ΠΡΟΘΕΜΑ «HP-». Μετρήθηκαν και τα δύο σε 525 δημόσια
 *    ακίνητα: **8 με unsplash, 8 με `HP-`, το ίδιο ακριβώς σύνολο**. Αλλά το `HP-` είναι
 *    απλώς «φτιάχτηκε μέσα στο EALIDA χωρίς κωδικό Onsea» — ένα ΑΛΗΘΙΝΟ ακίνητο που θα
 *    καταχωρηθεί αύριο από τη γραμματεία θα πάρει κι αυτό `HP-` και θα εξαφανιζόταν.
 *    Το unsplash δεν μπορεί να είναι αληθινό ποτέ: κανένα ακίνητο πελάτη δεν έχει
 *    φωτογραφία αποθέματος. ⇒ Το φίλτρο **αυτοδιορθώνεται**: μόλις μπουν πραγματικές
 *    φωτογραφίες, το ακίνητο εμφανίζεται μόνο του, χωρίς αλλαγή κώδικα.
 *
 * ⛔ ΜΗΝ το μετακινήσεις σε συστατικό. Εδώ πιάνει **μονομιάς** λίστα, αρχική, «παρόμοια»,
 *    αγαπημένα, σύγκριση, sitemap και την ίδια την καρτέλα (άγνωστος κωδικός → 404).
 */
const STOCK_PHOTO = /unsplash|pexels|pixabay|placeholder\.com|via\.placeholder/i;

export function isRealProperty(p: SiteProperty): boolean {
  return !STOCK_PHOTO.test(JSON.stringify(p.attributes ?? {}));
}

/**
 * Everything the viewer may see, until the API's own `total` (B-01, traps T-K01).
 * Until 2026-10 callers passed a ceiling (600, sitemap 1000) and the cache key ignored it, so
 * the first caller decided the set for everyone; past 600 properties the rest vanished from
 * list, counter and sitemap. Now there is one set per viewer. SAFETY_MAX only stops a runaway
 * loop (an API that never reaches `total`); hitting it is logged, never silent.
 * Rejected: raising the ceiling to the expected volume — the same silent cut, later.
 */
const PAGE_SIZE = 60;      // API maximum for /site/properties
const SAFETY_MAX = 5_000;
let ceilingWarned = false;

async function fetchAll(memberToken?: string, country?: string): Promise<SiteProperty[]> {
  const out: SiteProperty[] = [];
  for (let page = 1; ; page++) {
    const r = await api.properties({ limit: PAGE_SIZE, page }, memberToken, country);
    out.push(...r.items);
    if (out.length >= r.total || r.items.length === 0) break;
    if (out.length >= SAFETY_MAX) {
      if (!ceilingWarned) console.warn(`[hp-site] allProperties stopped at SAFETY_MAX=${SAFETY_MAX} of total=${r.total}`);
      ceilingWarned = true;
      break;
    }
  }
  // B-26: a property without a public id (empty `reference`, no `onsea_id`) has no URL — it was
  // counted, missing from the list and declared in the sitemap as `/<lang>/property/` (404 × 9).
  return out.filter((p) => isRealProperty(p) && REF_RE.test(refOf(p)));
}

// ── ΚΟΙΝΗ ΜΝΗΜΗ ───────────────────────────────────────────────────────────
// Το πλήρες τράβηγμα είναι 9 σελίδες × 60 = ~2 δευτερόλεπτα. Το μοιράζονται
// η αρχική ΚΑΙ ο ζωντανός μετρητής των φίλτρων.
//
// ΤΡΕΙΣ ΚΑΤΑΣΤΑΣΕΙΣ, όχι δύο — και ο λόγος μετρήθηκε 27/7:
//  · φρέσκο (<60΄΄)   → επιστρέφεται αμέσως
//  · μπαγιάτικο       → επιστρέφεται ΑΜΕΣΩΣ και ανανεώνεται από πίσω.
//      Χωρίς αυτό: αν ο επισκέπτης άφηνε τη σελίδα ανοιχτή ένα λεπτό, το πρώτο
//      πάτημα φίλτρου κολλούσε 2΄΄ δείχνοντας ΠΑΛΙΟ αριθμό — χειρότερο από
//      καθόλου μετρητή, γιατί ο αριθμός φαινόταν σωστός ενώ δεν ήταν.
//  · πολύ παλιό (>10΄) ή ανύπαρκτο → περιμένουμε κανονικά.
// Ένα αίτημα εν πτήσει το πολύ — οι ταυτόχρονες κλήσεις μοιράζονται το ίδιο.
// 🔐 ΜΙΑ ΜΝΗΜΗ ΑΝΑ ΘΕΑΤΗ — ΟΧΙ ΜΙΑ ΓΙΑ ΟΛΟΥΣ (29/7).
//
// 🪤 Η ΠΑΓΙΔΑ ΠΟΥ ΑΠΟΦΕΥΓΕΤΑΙ ΕΔΩ. Ως τις 29/7 υπήρχε **ένα κοινό `cache`** και η
//    `fetchAll` δεν έστελνε ποτέ το `member_token` — άρα το μέλος έπαιρνε το
//    ανώνυμο σύνολο και η ιδιωτική συλλογή **δεν ξεκλείδωνε ποτέ**.
//    Η προφανής διόρθωση («πέρνα το token στη γραμμή 46») παράγει όμως τη
//    **ΑΝΤΙΣΤΡΟΦΗ, ΧΕΙΡΟΤΕΡΗ διαρροή**: ο πρώτος συνδεδεμένος γεμίζει τη μνήμη με
//    527 + ιδιωτικά, και κάθε **ανώνυμος** επισκέπτης μέσα στα 10 λεπτά παίρνει
//    την ίδια μνήμη — δηλαδή βλέπει την ιδιωτική συλλογή. Ακριβώς το αντίθετο
//    από αυτό που κάνει το `gate.ts`.
//
// ⚠️ ΚΑΙ ΔΕΥΤΕΡΟ ΕΠΙΠΕΔΟ: ούτε **ένα κοινό «member» cache** αρκεί. Δεν ξέρουμε
//    ότι όλα τα μέλη βλέπουν το ίδιο σύνολο· αν αύριο το API δώσει προσωπική
//    συλλογή ανά μέλος, ένα κοινό cache θα τη διέρρεε **μεταξύ μελών**.
//    Γι' αυτό το κλειδί είναι **το ίδιο το token**, με φράγμα στο πλήθος.
const TTL = 60_000;        // μέχρι εδώ: φρέσκο
const STALE_MAX = 600_000; // πάνω από εδώ: δεν σερβίρουμε παλιό, περιμένουμε
const MAX_VIEWERS = 40;    // φράγμα μνήμης· ο ανώνυμος δεν εξώνεται ποτέ

type Entry = { at: number; items: SiteProperty[] };
const caches = new Map<string, Entry>();
const inflights = new Map<string, Promise<SiteProperty[]>>();

/** Κλειδί θεατή. Ο ανώνυμος είναι σταθερός· κάθε μέλος έχει δικό του.
 *  #18: the country is part of the key — the API answers a visitor from Greece with a shorter
 *  list, so one shared set would show Greek visitors the uncertified properties (or hide them
 *  from everyone else). Anonymous keys are at most one per country code, so they stay bounded. */
function viewerKey(memberToken?: string, country?: string): string {
  return (memberToken ? `m:${memberToken}` : 'anon') + (country ? `|${country}` : '');
}

/** Κρατά τη μνήμη φραγμένη — πετά την παλαιότερη εγγραφή ΜΕΛΟΥΣ, ποτέ ανώνυμη. */
function trim(): void {
  if (caches.size <= MAX_VIEWERS) return;
  let oldest: string | null = null;
  let oldestAt = Infinity;
  for (const [k, v] of caches) {
    if (k.startsWith('anon')) continue;
    if (v.at < oldestAt) { oldestAt = v.at; oldest = k; }
  }
  if (oldest) caches.delete(oldest);
}

function revalidate(memberToken?: string, country?: string): Promise<SiteProperty[]> {
  const key = viewerKey(memberToken, country);
  const running = inflights.get(key);
  if (running) return running;                  // ένα αίτημα εν πτήσει ΑΝΑ ΘΕΑΤΗ
  const p = fetchAll(memberToken, country)
    .then((items) => { caches.set(key, { at: Date.now(), items }); trim(); return items; })
    .catch((e) => {
      // Αν πέσει το API και έχουμε παλιά δεδομένα ΤΟΥ ΙΔΙΟΥ θεατή, μένουμε όρθιοι.
      const old = caches.get(key);
      if (old) return old.items;
      throw e;
    })
    .finally(() => { inflights.delete(key); });
  inflights.set(key, p);
  return p;
}

/** `country`: pass `visitorCountry(request)` for every visitor-facing LIST (list, home, area,
 *  collection, similar, counter). Leave it out for the property page lookup and ID search (they
 *  open by link or code for everyone), and for the sitemap and feeds. */
export async function allProperties(memberToken?: string, country?: string): Promise<SiteProperty[]> {
  const key = viewerKey(memberToken, country);
  const hit = caches.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < TTL) return hit.items;
  if (hit && age < STALE_MAX) {
    void revalidate(memberToken, country).catch(() => {});  // από πίσω· ο καλών δεν περιμένει
    return hit.items;
  }
  return revalidate(memberToken, country);
}

/** Shape of a public property id in a URL or form: `8075`, `HP-8564` (router and /api/inquiry, B-03). */
export const REF_RE = /^[A-Za-z]{0,3}-?\d{1,6}$/;

/** Δημόσιο αναγνωριστικό — ΤΟ ΙΔΙΟ id με το παλιό site, ώστε να μη σπάσει κανένα URL. */
export function refOf(p: SiteProperty): string {
  return String(p.attributes?.onsea_id ?? p.reference ?? p.id.slice(0, 6));
}

/** Τιμή ως αριθμός — η βάση άλλοτε δίνει string, άλλοτε number. */
export function priceOf(a: Attrs): number {
  const v = a?.public_price;
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Είναι ορατή η τιμή; 34 από τα 527 ακίνητα έχουν κρυφή τιμή.
 *  Ο Exclusive βλέπει και τις κρυφές (George 21/10/2026, q16) — μόνο όπου περνάμε `exclusive`. */
export function priceVisible(a: Attrs, exclusive = false): boolean {
  return (exclusive || a?.price_public_visible !== false) && priceOf(a) > 0;
}

/**
 * Πεδίο i18n: το API δίνει είτε string είτε αντικείμενο.
 *
 * 🔴 ΤΟ API ΕΧΕΙ ΜΟΝΟ ΠΕΝΤΕ ΓΛΩΣΣΕΣ: {el, en, de, sr, bg}. Για ro/tr/he/ru
 * ΔΕΝ υπάρχει τιμή και η εφεδρεία εκτελείται ΠΑΝΤΑ.
 *
 * 🪤 Η ΠΑΛΙΑ ΣΕΙΡΑ ΗΤΑΝ `v[lang] ?? v.el ?? v.en` — δηλαδή **ελληνικά πριν από
 *    αγγλικά**. Αποτέλεσμα: ο ρουμάνος, ο τούρκος, ο ισραηλινός και ο ρώσος
 *    επισκέπτης έβλεπαν **«Μονοκατοικία — Kassandra»** στον τίτλο κάθε κάρτας.
 *    Μετρήθηκαν **54 κόμβοι με ελληνικό αλφάβητο ανά σελίδα** σε καθεμία από τις
 *    τέσσερις — και ο τίτλος της κάρτας είναι το πιο διαβασμένο κείμενο της αρχικής.
 *
 * ✅ Η σειρά ακολουθεί πλέον τη ΓΡΑΦΗ, όπως ήδη κάνει το `municipalityOf` στο
 *    lib/gate.ts: κυριλλικές γλώσσες πέφτουν στο βουλγαρικό, οι υπόλοιπες στο
 *    αγγλικό λατινικό. Ποτέ ελληνικά σε μη ελληνική σελίδα.
 *    ⚠️ Για τα ρωσικά ΔΕΝ κάνει «αγγλικά»: θα έδινε «Detached house — Касандра»,
 *    λατινικά κολλημένα σε κυριλλικά μέσα στον ίδιο τίτλο.
 */
const CYRILLIC = new Set(['bg', 'ru']);

export function pick(v: any, lang: string): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);

  const own = v[lang];
  if (typeof own === 'string' && own) return own;

  if (lang === 'el') return String(v.el ?? v.en ?? '');
  const chain = CYRILLIC.has(lang) ? [v.bg, v.en, v.el] : [v.en, v.bg, v.el];
  for (const c of chain) if (typeof c === 'string' && c) return c;

  return String(Object.values(v).find((x) => typeof x === 'string' && x) ?? '');
}
