// ═══════════════════════════════════════════════════════════════════════════
// Η ΛΟΓΙΚΗ ΤΗΣ ΑΡΧΙΚΗΣ — όλα τα νούμερα βγαίνουν από τη βάση, κανένα χειρόγραφο.
// Το index.astro μένει λεπτό· εδώ ζει η παραγωγή.
// ═══════════════════════════════════════════════════════════════════════════
import type { SiteProperty, Attrs } from './api';
import { priceOf, priceVisible, pick } from './api';
import { coverOf, heroReady } from './photos';
import { municipalityOf, muniKey , isSecretFlag } from './gate';
import type { Lang } from './i18n';
import { heroShot } from './hero';

/** `name` = πώς γράφεται στη γλώσσα της σελίδας · `key` = τι ταξιδεύει στο URL. */
export type Place = { name: string; count: number; key?: string };
export type Benchmark = { area: string; median: number; n: number };

export type HomeData = {
  total: number;
  overMillion: number;
  seafront: number;
  photos: number;
  medianPrice: number;
  landCount: number;
  minPrice: number;
  maxPrice: number;
  featured: SiteProperty[];
  week: SiteProperty | null;
  locked: SiteProperty[];
  lockedCount: number;
  munis: Place[];
  restCount: number;   // ακίνητα εκτός των τεσσάρων δήμων
  areas: Place[];
  benchmarks: Benchmark[];
  comparables: number;
  seafrontPremium: number;
  heroPhoto: { url: string; tag?: string | null; alt?: unknown; focal?: { x: number; y: number } | null } | null;
  heroAlt: string;
};

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function tally(items: SiteProperty[], key: (a: Attrs) => string | undefined): Place[] {
  const m = new Map<string, number>();
  for (const p of items) {
    const k = key(p.attributes ?? {});
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function buildHome(items: SiteProperty[], lang: Lang): HomeData {
  const A = items.map((p) => p.attributes ?? {});
  const prices = A.filter((x) => priceVisible(x)).map(priceOf).filter((n) => n > 0);

  // ── Οι αποδείξεις: μετρημένες, όχι δηλωμένες ──────────────────────────
  const total = items.length;
  const overMillion = prices.filter((n) => n >= 1_000_000).length;
  const seafront = A.filter((a) => a.sea_access === 'front').length;
  const photos = A.reduce((n, a) => n + ((a.photos as unknown[])?.length ?? 0), 0);

  // ── Δείκτες €/τ.μ. ανά περιοχή — η βάση του εργαλείου εκτίμησης ────────
  const byArea = new Map<string, number[]>();
  for (const a of A) {
    if (a.category !== 'residency' || !priceVisible(a)) continue;
    const s = Number(a.sqm);
    const area = pick(a.area_i18n, lang) || a.area;
    if (!area || !Number.isFinite(s) || s < 10) continue;
    (byArea.get(area) ?? byArea.set(area, []).get(area)!).push(priceOf(a) / s);
  }
  // Στρογγυλοποίηση: το €/τ.μ. είναι δείκτης, όχι λογιστικό ποσό.
  // (Χωρίς αυτό εμφανιζόταν «4.666,667 €/τ.μ.» αντί για «4.667».)
  const benchmarks: Benchmark[] = [...byArea.entries()]
    .filter(([, v]) => v.length >= 5)
    .map(([area, v]) => ({ area, median: Math.round(median(v)), n: v.length }))
    .sort((a, b) => b.n - a.n);

  const comparables = A.filter((a) => priceVisible(a) && Number(a.sqm) > 10).length;

  // Πόσο ακριβότερη η πρώτη γραμμή — δημοσιεύσιμο εύρημα, όχι μάρκετινγκ.
  const perSqm = (f: (a: Attrs) => boolean) =>
    median(A.filter((a) => a.category === 'residency' && priceVisible(a) && Number(a.sqm) > 10 && f(a))
            .map((a) => priceOf(a) / Number(a.sqm)));
  const mFront = perSqm((a) => a.sea_access === 'front');
  const mWalk = perSqm((a) => a.sea_access === 'walking');
  const seafrontPremium = mWalk > 0 ? Math.round(((mFront - mWalk) / mWalk) * 100) : 0;

  // ── ΠΡΩΤΑ ΤΟ ΜΕΓΑΛΟ ΑΚΙΝΗΤΟ, ΜΕΤΑ ΤΑ ΕΞΙ ───────────────────────────────
  // 🪤 Η σειρά ΕΧΕΙ ΣΗΜΑΣΙΑ. Όσο τα δύο διαλέγονταν ανεξάρτητα, το ίδιο ακίνητο
  //    (ID 7010, 12.000.000 €) έβγαινε ΚΑΙ 5η κάρτα ΚΑΙ ολόκληρο το full-bleed
  //    αμέσως από κάτω — ίδια φωτογραφία, ίδια τιμή, μισή οθόνη απόσταση.
  const ready = items.filter((p) => priceVisible(p.attributes) && heroReady(p.attributes));

  // Το μεγάλο: το ακριβότερο που περνάει τη δικλείδα «έτοιμο για μεγάλη θέση».
  const week = [...ready].sort((a, b) => priceOf(b.attributes) - priceOf(a.attributes))[0] ?? null;

  // ── Τα έξι επιλεγμένα ──────────────────────────────────────────────────
  // ΠΟΙΚΙΛΙΑ ΔΗΜΟΥ, όχι περιοχής: η περιοχή είναι κλειδωμένη για τον επισκέπτη,
  // οπότε «ποικιλία» πάνω της ήταν αόρατη — έβγαιναν 5 στις 6 κάρτες «Κασσάνδρα».
  // ΚΑΙ ΕΥΡΟΣ ΤΙΜΗΣ: με κατώφλι 300.000 € και ταξινόμηση κατά τιμή, η σελίδα
  // ξεκινούσε από 470.000 € ενώ η ίδια δηλώνει διάμεση 500.000 € και ελάχιστη
  // 82.000 €. Ο επισκέπτης δεν έβλεπε τίποτα που να μπορεί ν' αγοράσει.
  const featured: SiteProperty[] = [];
  const seenMuni = new Map<string, number>();
  const MAX_PER_MUNI = 2;
  const takePool = ready
    .filter((p) => p.id !== week?.id)
    // ΟΧΙ γη στη βιτρίνα: ο George το είχε ήδη απορρίψει στην «ιδιωτική συλλογή»
    // («δεν μου αρέσει που έχει αγροτεμάχια»). Η γη έχει τη δική της συλλογή.
    .filter((p) => p.attributes?.category !== 'land')
    .sort((a, b) =>
      ((b.attributes.score ?? 0) - (a.attributes.score ?? 0)) ||
      (priceOf(b.attributes) - priceOf(a.attributes)));

  // Δύο κάρτες με ΙΔΙΑ τιμή, ίδιο είδος και ίδιο δήμο διαβάζονται ως λάθος
  // αντιγραφής, ακόμη κι όταν είναι δύο διαφορετικά ακίνητα του ίδιου συγκροτήματος.
  const seenTwin = new Set<string>();
  const twin = (p: SiteProperty) =>
    `${p.attributes?.subcategory}|${municipalityOf(p.attributes ?? {}, lang)}|${priceOf(p.attributes)}`;

  const take = (extra: (p: SiteProperty) => boolean, limit = 6) => {
    let n = 0;
    for (const p of takePool) {
      if (featured.length === 6 || n === limit || featured.includes(p) || !extra(p)) continue;
      const m = municipalityOf(p.attributes ?? {}, lang);
      if ((seenMuni.get(m) ?? 0) >= MAX_PER_MUNI) continue;
      if (seenTwin.has(twin(p))) continue;
      seenMuni.set(m, (seenMuni.get(m) ?? 0) + 1);
      seenTwin.add(twin(p));
      featured.push(p); n++;
    }
  };
  // Τρία περάσματα ώστε οι έξι κάρτες να καλύπτουν ΚΛΙΜΑΚΑ, όχι μια ζώνη τιμών.
  // 🪤 Το κατώτερο πέρασμα ΔΕΝ κοιτά τη διάμεσο αλλά το 25ο εκατοστημόριο: με τη
  //    διάμεσο (500.000 €) οι «προσιτές» κάρτες έβγαιναν 450-470.000 €, τη στιγμή
  //    που η ίδια η σελίδα διαφημίζει «από 82.000 €» και η βάση έχει 61 ακίνητα
  //    κάτω από 250.000. Ο επισκέπτης με προϋπολογισμό 200.000 έφευγε πιστεύοντας
  //    ότι δεν έχουμε τίποτα γι' αυτόν.
  const sorted = [...prices].sort((a, b) => a - b);
  const q25 = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : 0;
  const mid = median(prices);
  take((p) => priceOf(p.attributes) <= q25, 2);         // προσιτά — «μπορώ κι εγώ»
  take((p) => priceOf(p.attributes) >= mid * 3, 2);     // κορυφή — «τι έχετε πραγματικά»
  take(() => true);                                     // η μέση, με τον ίδιο κανόνα δήμου
  // Τελευταία σανίδα: αν το απόθεμα δεν φτάνει, γέμισε χωρίς όριο δήμου.
  for (const p of takePool) { if (featured.length === 6) break; if (!featured.includes(p)) featured.push(p); }
  // Εμφάνιση κατά τιμή, ώστε το μάτι να διαβάζει κλίμακα και όχι τυχαιότητα.
  featured.sort((a, b) => priceOf(a.attributes) - priceOf(b.attributes));

  // ── Η ιδιωτική συλλογή ─────────────────────────────────────────────────
  // Ό,τι είναι secret portfolio ή έχει κρυφή τιμή: το δείχνουμε ΧΩΡΙΣ φωτό και τιμή.
  // 🪤 ΟΧΙ `=== true`: η τιμή είναι κάποτε το κείμενο «on» (HTML checkbox) και το
  //    μπλοκ μετρούσε λιγότερα κρυφά απ' όσα υπάρχουν. Ένας κανόνας, στο `gate.ts`.
  const hidden = items.filter((p) => isSecretFlag(p.attributes?.secret_portfolio) || !priceVisible(p.attributes));
  const locked = [...hidden]
    .sort((a, b) => (Number(b.attributes?.sqm) || 0) - (Number(a.attributes?.sqm) || 0))
    .slice(0, 3);

  // ── Γεωγραφία ──────────────────────────────────────────────────────────
  // ── Οι δήμοι ────────────────────────────────────────────────────────────
  // 🪤 Η ΟΜΑΔΟΠΟΙΗΣΗ ΓΙΝΕΤΑΙ ΜΕ ΤΟ ΚΛΕΙΔΙ, Η ΕΜΦΑΝΙΣΗ ΜΕ ΤΗ ΜΕΤΑΦΡΑΣΗ.
  //   Όσο μετρούσαμε πάνω στο εμφανιζόμενο όνομα, η βουλγαρική σελίδα ξανάσπαγε
  //   τους δήμους: τα ακίνητα με μετάφραση («Касандра») έμπαιναν σε άλλον κάδο
  //   από εκείνα χωρίς — 247 αντί 250, ενώ τα ελληνικά έδειχναν σωστά.
  //   Ένα ακίνητο = ένα κλειδί = ένας κάδος, σε ΚΑΘΕ γλώσσα.
  // 🪤 ΤΟ ΑΘΡΟΙΣΜΑ ΠΡΕΠΕΙ ΝΑ ΒΓΑΙΝΕΙ. Οι τέσσερις δήμοι έδιναν 525 ενώ η σελίδα
  //    γράφει παντού 527: δύο ακίνητα (ένα «Πολύγυρος», ένα με κενό δήμο) δεν
  //    είχαν ΚΑΜΙΑ γραμμή να τα δείξει. Ο επισκέπτης που προσθέτει, μας πιάνει.
  //    Πέμπτη γραμμή «Αλλού στη Χαλκιδική» με το υπόλοιπο — εμφανίζεται μόνο αν
  //    υπάρχει υπόλοιπο, και είναι πατητή (χωρίς φίλτρο δήμου = όλα).
  const allMunis = tally(items, (a) => muniKey(a));
  const munis = allMunis
    .map((m) => {
      const src = items.find((p) => muniKey(p.attributes ?? {}) === m.name);
      return { key: m.name, count: m.count, name: municipalityOf(src?.attributes ?? {}, lang) || m.name };
    })
    .slice(0, 4);
  const rest = total - munis.reduce((s, m) => s + m.count, 0);
  const areas = tally(items, (a) => pick(a.area_i18n, lang) || a.area).slice(0, 8);

  // ── Η φωτογραφία του hero ──────────────────────────────────────────────
  // ΕΠΙΛΕΓΕΤΑΙ ΑΠΟ ΕΜΑΣ, δεν βρίσκεται αυτόματα — δες lib/hero.ts για το πώς
  // επιλέχθηκε και γιατί. Εφεδρεία μόνο αν αδειάσει ο πίνακας.
  const shot = heroShot();
  const scenic = items.find((p) => heroReady(p.attributes));
  const heroPhoto = shot
    ? { url: shot.url, tag: 'hero', alt: shot.alt, focal: shot.focal }
    : (scenic ? coverOf(scenic.attributes) : null);

  return {
    total, overMillion, seafront, photos,
    medianPrice: median(prices),
    landCount: A.filter((a) => a.category === 'land').length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    featured, week, locked, lockedCount: hidden.length,
    munis, restCount: rest, areas, benchmarks, comparables, seafrontPremium,
    heroPhoto,
    heroAlt: shot?.alt[lang] ?? shot?.alt.en ?? '',
  };
}
