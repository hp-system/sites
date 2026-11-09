// ───────────────────────────────────────────────────────────────────────────
// Η γέφυρα δεδομένων: EALIDA API → site. Μόνο server-side.
// Το site ΔΕΝ αποθηκεύει τίποτα — ούτε εικόνες, ούτε αντίγραφα. Μόνο διαβάζει.
// ───────────────────────────────────────────────────────────────────────────
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
import { publicDbOn, publicSets, publicChangedAt } from './publicdb';

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

/**
 * Time limits for the property requests (outage 2026-11-08: the CRM API stopped answering and
 * every page that lists properties hung until Cloudflare cut it; company/content already had 4 s).
 * REQUEST_MS caps one request; FETCH_ALL_MS caps the whole paged pull (normally ~2 s for 9 pages).
 * On a timeout the request throws, and the callers already handle that: lists render without
 * properties (`apiDown`), the property page answers 503 + Retry-After (#88), a stale cache is kept.
 * After a timeout or network error the API counts as down for DOWN_MS: further calls fail at
 * once instead of each waiting REQUEST_MS again (one page calls the API several times in a row,
 * so without this a page took 20–36 s). An HTTP error (the API answered) does not trip it.
 * Rejected: one long limit (30 s) — the visitor still stares at a blank page and Cloudflare
 * may cut first; no limit — the 2026-11-08 hang.
 */
const REQUEST_MS = 8_000;
// 2026-11-09: the full pull takes ~48 s (CRM: 3.8 s per page of 60, Q-20261109-SS-1), so a 15 s cap
// meant the cache never filled and every page waited and failed (hp-v0.19.0, rolled back). The pull
// now runs only in the background (see «Κοινή μνήμη» below); this cap only stops a runaway one.
const FETCH_ALL_MS = 180_000;
const DOWN_MS = 30_000;
let downUntil = 0;

async function get<T>(path: string, memberToken?: string, country?: string): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (memberToken) headers['x-member-token'] = memberToken;
  if (country) headers['x-visitor-country'] = country;
  if (Date.now() < downUntil) throw new Error(`EALIDA API ${path} → skipped, API down (retry after ${new Date(downUntil).toISOString()})`);
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(REQUEST_MS) });
  } catch (e) {
    downUntil = Date.now() + DOWN_MS;
    console.error(`[hp-site] EALIDA API ${path} → ${(e as Error).name}: ${(e as Error).message}; skipping the API for ${DOWN_MS / 1000} s`);
    throw e;
  }
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
  const deadline = Date.now() + FETCH_ALL_MS;
  for (let page = 1; ; page++) {
    if (Date.now() > deadline) throw new Error(`EALIDA API /site/properties: pull exceeded ${FETCH_ALL_MS} ms at page ${page}`);
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
// 2026-11-09 (Sergei: «страница должна загружаться за 2 секунды»): a visitor never waits for the
// CRM pull. The anonymous sets are pulled at start and kept warm in the background; a stale set is
// always served at once and refreshed behind it; a cold set is waited for at most WAIT_MS, then the
// page renders without properties (the callers' `apiDown` path) while the pull goes on.
// Rejected: STALE_MAX (wait when older than 10 min) — with a 48 s pull that was the 29–48 s hang
// the 30-min monitor hit every time; a longer per-visit wait — no wait is short enough at 48 s.
const TTL = 300_000;         // fresher than this: no refresh
const REFRESH_MS = 240_000;  // the anonymous sets are refreshed this often, visitors or not
const WAIT_MS = 2_000;       // the longest a visitor waits for a set that is not in memory yet
const MAX_VIEWERS = 40;      // φράγμα μνήμης· ο ανώνυμος δεν εξώνεται ποτέ

type Entry = { at: number; items: SiteProperty[] };
const caches = new Map<string, Entry>();
const inflights = new Map<string, Promise<SiteProperty[]>>();
const coldFrom = new Map<string, number>();   // when the first visitor started waiting on a cold set

/** Κλειδί θεατή. Ο ανώνυμος είναι σταθερός· κάθε μέλος έχει δικό του.
 *  #18: the country is part of the key — the API answers a visitor from Greece with a shorter
 *  list, so one shared set would show Greek visitors the uncertified properties (or hide them
 *  from everyone else). Anonymous keys are at most one per country code, so they stay bounded. */
function viewerKey(memberToken?: string, country?: string): string {
  return (memberToken ? `m:${memberToken}` : 'anon') + (country ? `|${country}` : '');
}

/** The CRM applies one country rule: Greece (energy certificates, D-20261104-GT-2). Every other
 *  country gets the same set as no country (measured 2026-11-04: DE and none both 23 pages, GR 14;
 *  CHG-20261104-SS-2). So the site keeps two anonymous sets, not one per country: a visitor from a
 *  rare country no longer starts a cold 48 s pull of its own (the 30-min monitor did exactly that).
 *  ⚠ If the CRM ever adds a rule for another country, add it here. */
export function countryRule(country?: string): string | undefined {
  return country?.toUpperCase() === 'GR' ? 'GR' : undefined;
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
  const p = (!memberToken && publicDbOn ? fromPublicDb(country) : fetchAll(memberToken, country))
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
  warm();
  const c = countryRule(country);
  const key = viewerKey(memberToken, c);
  const hit = caches.get(key);
  if (hit) {
    if (Date.now() - hit.at >= TTL) void revalidate(memberToken, c).catch(() => {});  // από πίσω
    return hit.items;
  }
  const pull = revalidate(memberToken, c);
  pull.catch(() => {});                       // the pull goes on even if this visitor stops waiting
  // A member whose own set is not in memory yet sees the anonymous set meanwhile: it holds less,
  // never more (locked cards stay locked), so nothing leaks; the member set arrives behind it.
  const anon = memberToken ? caches.get(viewerKey(undefined, c)) : undefined;
  if (anon) return anon.items;
  // One page asks for the set several times in a row (home + filter sheet): the wait is shared
  // from the first ask, so a cold page costs WAIT_MS once, not once per block.
  if (!coldFrom.has(key)) { coldFrom.set(key, Date.now()); void pull.finally(() => coldFrom.delete(key)).catch(() => {}); }
  const left = Math.max(0, (coldFrom.get(key) ?? Date.now()) + WAIT_MS - Date.now());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, no) => {
    timer = setTimeout(() => no(new Error(`property set not in memory yet (waited ${WAIT_MS} ms; the pull goes on)`)), left);
  });
  try { return await Promise.race([pull, late]); } finally { clearTimeout(timer); }
}

/** The guest sets from the public DB (sites#174): one query fills both anonymous keys (~0.5 s for
 *  the whole set, against ~48 s through the CRM API). On any DB error the CRM API path takes over,
 *  so the site never depends on the public DB alone. */
let publicAt: string | null = null;
async function fromPublicDb(country?: string): Promise<SiteProperty[]> {
  try {
    const keep = (xs: SiteProperty[]) => xs.filter((p) => isRealProperty(p) && REF_RE.test(refOf(p)));
    const { all, gr, changedAt } = await publicSets<SiteProperty>();
    if (!all.length) throw new Error('public DB has no properties yet');
    const now = Date.now();
    const a = keep(all), g = keep(gr);
    caches.set(viewerKey(undefined, undefined), { at: now, items: a });
    caches.set(viewerKey(undefined, 'GR'), { at: now, items: g });
    publicAt = changedAt;
    return country === 'GR' ? g : a;
  } catch (e) {
    console.error(`[hp-site] public DB read failed, using the CRM API: ${(e as Error).message}`);
    return fetchAll(undefined, country);
  }
}

/** True when this member's own set is in memory. While it is not, `allProperties` hands the member
 *  the anonymous set, which lacks the member-tier fields (approximate point, exclusive data), so
 *  the property page asks the CRM for that one property with the member's token instead (~2 s). */
export function hasViewerSet(memberToken: string): boolean {
  return caches.has(viewerKey(memberToken, undefined));
}

/** Pulls both anonymous sets once at start and then every REFRESH_MS, one after the other (two
 *  parallel 48 s pulls double the CRM load). Started by the first call; the timer never keeps the
 *  process alive. Rejected: warming per country — see `countryRule`. */
let warmed = false;
function warm(): void {
  if (warmed) return;
  warmed = true;
  const cycle = async () => {
    for (const c of [undefined, 'GR']) await revalidate(undefined, c).catch(() => {});
  };
  void cycle();
  if (publicDbOn) {
    // Public DB: ask every 30 s whether the sender changed anything; reload both sets only then.
    setInterval(() => {
      void publicChangedAt().then((at) => {
        if (at !== publicAt) return revalidate(undefined, undefined);
        for (const c of [undefined, 'GR']) { const e = caches.get(viewerKey(undefined, c)); if (e) e.at = Date.now(); }
      }).catch((e) => console.error(`[hp-site] public DB check failed: ${(e as Error).message}`));
    }, 30_000).unref?.();
    setInterval(() => { void cycle(); }, REFRESH_MS * 5).unref?.();   // a full reload now and then anyway
  } else {
    setInterval(() => { void cycle(); }, REFRESH_MS).unref?.();
  }
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
