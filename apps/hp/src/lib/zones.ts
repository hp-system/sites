// ═══════════════════════════════════════════════════════════════════════════
// ΟΙ ΖΩΝΕΣ — ο χάρτης της Χαλκιδικής, φτιαγμένος από το ΙΔΙΟ ΜΑΣ χαρτοφυλάκιο.
//
// Δεν σχεδιάζουμε ακτογραμμή. Δεν χρειάζεται: 526 από τα 527 ακίνητα έχουν
// συντεταγμένες, και η κατανομή τους ΕΙΝΑΙ το σχήμα της Χαλκιδικής.
// Ό,τι βλέπει ο επισκέπτης είναι αληθινό απόθεμα, όχι διακόσμηση.
//
// ΑΣΦΑΛΕΙΑ ΤΗΣ ΓΕΩΓΡΑΦΙΑΣ:
//  · Στέλνουμε ΚΕΝΤΡΟΒΑΡΟ ΠΕΡΙΟΧΗΣ, ποτέ συντεταγμένες ακινήτου.
//  · Ζώνη με λιγότερα από 3 ακίνητα ΔΕΝ εμφανίζεται: με 1-2 ακίνητα το
//    κεντροβαρές πλησιάζει επικίνδυνα την πραγματική θέση.
//  · Το όνομα φεύγει ΜΟΝΟ σε μέλη· στους υπόλοιπους πάει κωδικός «Ζ-07».
// ═══════════════════════════════════════════════════════════════════════════
import type { SiteProperty, Attrs } from './api';
import { priceOf, priceVisible, pick } from './api';
import { municipalityOf, muniKey } from './gate';
import type { Lang } from './i18n';

export type Zone = {
  code: string;        // Ζ-01 — αυτό βλέπει ο ανώνυμος
  name: string;        // το πραγματικό όνομα — ΜΟΝΟ για μέλη
  muni: string;
  mkey: string;        // ελληνική ονομαστική — αυτό ταξιδεύει στα URL
  n: number;
  front: number;       // πόσα στην πρώτη γραμμή
  median: number;      // διάμεση τιμή ζώνης (0 αν <5 ακίνητα)
  x: number;           // 0-1000 στον χάρτη
  y: number;           // 0-676
  r: number;           // ακτίνα κηλίδας
};

export type ZoneMap = {
  zones: Zone[];
  munis: { name: string; n: number; x: number; y: number; key: string }[];
  hiddenSmall: number;   // πόσες ζώνες κρύψαμε επειδή ήταν πολύ μικρές
  totalAreas: number;
};

// Πλαίσιο της Χαλκιδικής. Σταθερό, ώστε ο χάρτης να μη «χοροπηδά» όταν
// αλλάζει το απόθεμα.
const LAT0 = 39.88, LAT1 = 40.46;
const LNG0 = 22.95, LNG1 = 24.05;
export const MAP_W = 1000, MAP_H = 676;

function project(lat: number, lng: number): { x: number; y: number } {
  // Ισοαπέχουσα με διόρθωση πλάτους — αρκεί για 60 χλμ. και δεν φέρνει βιβλιοθήκη.
  const x = ((lng - LNG0) / (LNG1 - LNG0)) * MAP_W;
  const y = MAP_H - ((lat - LAT0) / (LAT1 - LAT0)) * MAP_H;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

const MIN_PER_ZONE = 3;     // κάτω από αυτό, η ζώνη δεν εμφανίζεται καθόλου
const MIN_FOR_MEDIAN = 5;   // κάτω από αυτό, δεν δείχνουμε διάμεση τιμή

export function buildZones(items: SiteProperty[], lang: Lang): ZoneMap {
  type Acc = { lat: number[]; lng: number[]; front: number; prices: number[]; muni: string; mkey: string };
  const by = new Map<string, Acc>();

  for (const p of items) {
    const a: Attrs = p.attributes ?? {};
    const area = pick(a.area_i18n, lang) || String(a.area ?? '');
    const lat = Number(a.lat), lng = Number(a.lng);
    if (!area || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < LAT0 || lat > LAT1 || lng < LNG0 || lng > LNG1) continue;  // εκτός πλαισίου
    let acc = by.get(area);
    if (!acc) { acc = { lat: [], lng: [], front: 0, prices: [], muni: municipalityOf(a, lang), mkey: muniKey(a) }; by.set(area, acc); }
    acc.lat.push(lat); acc.lng.push(lng);
    if (a.sea_access === 'front') acc.front++;
    if (priceVisible(a)) acc.prices.push(priceOf(a));
  }

  const totalAreas = by.size;
  const big = [...by.entries()].filter(([, v]) => v.lat.length >= MIN_PER_ZONE);
  const hiddenSmall = totalAreas - big.length;

  // ═════════════════════════════════════════════════════════════════════════
  // 🔒 ΤΟ ΠΛΕΓΜΑ — Η ΔΙΚΛΕΙΔΑ ΠΟΥ ΚΡΑΤΑ ΚΛΕΙΔΩΜΕΝΗ ΤΗ ΓΕΩΓΡΑΦΙΑ.
  //
  // ΤΟ ΛΑΘΟΣ ΠΟΥ ΔΙΟΡΘΩΝΕΤΑΙ ΕΔΩ (βρέθηκε στον έλεγχο 27/7, επαληθεύτηκε):
  //   Ο χάρτης έβγαζε ΜΙΑ κηλίδα ΑΝΑ ΠΕΡΙΟΧΗ, στο ακριβές κεντροβαρές της.
  //   Η προβολή είναι γραμμική και γραμμένη εδώ δίπλα· οι τέσσερις ετικέτες
  //   δήμων δίνουν τα σημεία αναφοράς. Άρα οποιοσδήποτε ανώνυμος επισκέπτης
  //   αντέστρεφε τα cx/cy και έβρισκε τις 47 κλειδωμένες περιοχές με ακρίβεια
  //   ~100 μέτρων — μαζί με το πλήθος και το ποιες έχουν πρώτη γραμμή.
  //   Δηλαδή το μπλοκ που υπάρχει για να ΚΡΥΒΕΙ τη γεωγραφία, την παρέδιδε.
  //
  // Η ΛΥΣΗ: οι κηλίδες δεν κάθονται πια πάνω σε περιοχές. Ο χάρτης χωρίζεται σε
  //   σταθερό πλέγμα ~5,6 χλμ. και κάθε κελί γίνεται ΜΙΑ κηλίδα, στο ΚΕΝΤΡΟ ΤΟΥ
  //   ΚΕΛΙΟΥ — όχι στο κεντροβαρές των ακινήτων του. Ό,τι κι αν αντιστρέψει
  //   κανείς, βρίσκει το πλέγμα, όχι τα δεδομένα μας.
  //
  // Ο χάρτης λέει ακόμα την αλήθεια — «εδώ έχουμε απόθεμα, τόσο» — αλλά σε
  // ανάλυση χερσονήσου, όχι χωριού.
  // ═════════════════════════════════════════════════════════════════════════
  const CELL = 60;   // μονάδες viewBox ≈ 5,6 χλμ.
  type Cell = { n: number; front: number; cx: number; cy: number };
  const grid = new Map<string, Cell>();
  for (const [, v] of big) {
    const lat = v.lat.reduce((s, x) => s + x, 0) / v.lat.length;
    const lng = v.lng.reduce((s, x) => s + x, 0) / v.lng.length;
    const { x, y } = project(lat, lng);
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    const k = `${gx}:${gy}`;
    let c = grid.get(k);
    // ΚΕΝΤΡΟ ΚΕΛΙΟΥ — καμία πληροφορία από τις πραγματικές θέσεις.
    if (!c) { c = { n: 0, front: 0, cx: gx * CELL + CELL / 2, cy: gy * CELL + CELL / 2 }; grid.set(k, c); }
    c.n += v.lat.length;
    c.front += v.front;
  }

  const cells = [...grid.values()].sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...cells.map((c) => c.n));
  const zones: Zone[] = cells.map((c, i) => ({
    code: `Ζ-${String(i + 1).padStart(2, '0')}`,
    name: '', muni: '', mkey: '',
    n: c.n, front: c.front, median: 0,
    x: c.cx, y: c.cy,
    // Ποτέ μικρότερη από το μισό κελί, ώστε οι κηλίδες να επικαλύπτονται και να
    // μη διαβάζονται ως διακριτά σημεία.
    r: Math.round((CELL * 0.55 + 26 * Math.sqrt(c.n / maxN)) * 10) / 10,
  }));

  // Ετικέτες δήμων. Ο ΔΗΜΟΣ είναι δημόσιος — αλλά η θέση της ετικέτας κουμπώνει
  // κι αυτή στο πλέγμα, ώστε να μη δίνει σημείο αναφοράς ακριβείας για αντιστροφή.
  const mAcc = new Map<string, { x: number[]; y: number[]; n: number; key: string; name: string }>();
  for (const [, v] of big) {
    const lat = v.lat.reduce((s, x) => s + x, 0) / v.lat.length;
    const lng = v.lng.reduce((s, x) => s + x, 0) / v.lng.length;
    const { x, y } = project(lat, lng);
    let m = mAcc.get(v.mkey);
    if (!m) { m = { x: [], y: [], n: 0, key: v.mkey, name: v.muni }; mAcc.set(v.mkey, m); }
    m.x.push(x); m.y.push(y); m.n += v.lat.length;
  }
  const snap = (q: number) => Math.round(q / CELL) * CELL;
  const munis = [...mAcc.entries()]
    .filter(([n]) => n)
    .map(([, v]) => ({
      name: v.name, n: v.n, key: v.key,
      x: snap(v.x.reduce((s, q) => s + q, 0) / v.x.length),
      y: snap(v.y.reduce((s, q) => s + q, 0) / v.y.length),
    }))
    .sort((a, b) => b.n - a.n);

  return { zones, munis, hiddenSmall, totalAreas };
}
