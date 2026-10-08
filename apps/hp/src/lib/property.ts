// ═══════════════════════════════════════════════════════════════════════════
// Η ΚΑΡΤΕΛΑ ΑΚΙΝΗΤΟΥ — βοηθοί και κείμενα (Πρόταση Β, εγκρίθηκε 30/7).
//
// 🛡️ Ο ΚΑΝΟΝΑΣ ΤΟΥ GATE ΙΣΧΥΕΙ ΚΑΙ ΕΔΩ, ΠΙΟ ΑΥΣΤΗΡΑ ΑΠΟ ΠΑΝΤΟΥ:
//    το API δίνει `lat`, `lng`, `address`, `area` — και ΚΑΝΕΝΑ από αυτά δεν
//    επιτρέπεται να φτάσει σε μη συνδεδεμένο. Ούτε στο HTML, ούτε στο JSON-LD,
//    ούτε σε σχόλιο. Η ακριβής θέση (lat/lng/address) είναι για το ΔΕΥΤΕΡΟ
//    επίπεδο (exclusive) όταν ενεργοποιηθεί — ούτε καν για απλά μέλη.
// ═══════════════════════════════════════════════════════════════════════════
import type { Attrs } from './api';
import type { Lang } from './i18n';

/** Περιγραφή στη γλώσσα της σελίδας. Υπάρχουν μόνο el/en/bg/de/sr → εφεδρεία en. */
export function descriptionOf(a: Attrs, lang: Lang): string {
  const d = (k: string) => String((a as Record<string, unknown>)[`description_${k}`] ?? '').trim();
  return d(lang) || d('en') || d('el');
}

/**
 * ΕΝΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΟ — σταθερό αναγνωριστικό + ετικέτα προς εμφάνιση.
 *
 * Ο George επέλεξε (5/8) το **σημασιολογικό slug δίπλα στην τιμή**: το EALIDA θα
 * δίνει `{ slug: 'fireplace', label: 'Τζάκι' }`. Έτσι οι διατυπώσεις μπορούν να
 * ξαναγραφούν ελεύθερα σε 9 γλώσσες χωρίς να αγγίξουν τίποτα εδώ.
 */
export type Feature = { slug?: string; label: string };

/**
 * Διαβάζει ΚΑΙ ΤΑ ΔΥΟ σχήματα, ώστε να μη χρειαστεί δεύτερο πέρασμα:
 *   · ΣΗΜΕΡΑ (παλιό hp-api): `features_el` = πίνακας ΣΚΕΤΟΥ ΚΕΙΜΕΝΟΥ
 *   · ΑΥΡΙΟ (EALIDA): `features` = πίνακας αντικειμένων με `slug`/`code` + `label`
 *
 * 🪤 ΤΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ΔΕΝ ΕΙΝΑΙ ΕΝΑ ΠΕΔΙΟ — ΕΙΝΑΙ ΠΕΝΤΕ. Στο EALIDA ζουν σε
 *    `extras` (78 επιλογές) · `views` (7) · `pools` (6) · `floor_materials` (9) ·
 *    `frames` (6). Αν το `features` έρθει ενοποιημένο, τα διαβάζουμε όλα από εκεί·
 *    αλλιώς προσθέτουμε πηγές ΕΔΩ, σε ένα σημείο, όχι στο component.
 */
export function featuresOf(a: Attrs, lang: Lang): Feature[] {
  const rec = a as Record<string, unknown>;

  // ── Νέο σχήμα: αντικείμενα με σταθερό αναγνωριστικό ──────────────────────
  const structured = rec.features;
  if (Array.isArray(structured) && structured.some((x) => x && typeof x === 'object')) {
    return (structured as Record<string, unknown>[])
      .map((f) => {
        const label = String(f.label ?? f.name ?? f.title ?? '').trim();
        const slug = String(f.slug ?? f.code ?? '').trim();
        return label || slug ? { slug: slug || undefined, label: label || slug } : null;
      })
      .filter(Boolean) as Feature[];
  }

  // ── Σημερινό σχήμα: σκέτο κείμενο, χωρίς αναγνωριστικό ───────────────────
  const g = (k: string) => {
    const v = rec[`features_${k}`];
    return Array.isArray(v) ? v.map(String).map((x) => x.trim()).filter(Boolean) : [];
  };
  const own = g(lang);
  const list = own.length ? own : (g('en').length ? g('en') : g('el'));
  return list.map((label) => ({ label }));
}

/**
 * Εικονίδιο ανά χαρακτηριστικό (ζήτημα George: «ένα σετ με εικονίδια»).
 * Αντιστοίχιση με ΛΕΞΕΙΣ-ΚΛΕΙΔΙΑ πάνω στο ελληνικό ή αγγλικό κείμενο· ό,τι δεν
 * αναγνωριστεί παίρνει το γενικό ✓. Τα paths είναι μονόγραμμα 24×24, stroke.
 */
const ICON: Record<string, string> = {
  kitchen: 'M4 21V4h16v17M4 10h16M9 4v6M15 14h.01M9 14h.01',
  fireplace: 'M8 21c-2.2-1.8-3-3.6-3-5.5C5 12 8 9.5 12 3c4 6.5 7 9 7 12.5 0 1.9-.8 3.7-3 5.5M12 21c-1.2-1-1.8-2-1.8-3.2 0-2 1.8-3.4 1.8-5.8 0 2.4 1.8 3.8 1.8 5.8 0 1.2-.6 2.2-1.8 3.2Z',
  view: 'M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  garden: 'M12 21V9M12 9C12 5 9 3 5 3c0 4 3 6 7 6Zm0 4c0-4 3-6 7-6 0 4-3 6-7 6Z',
  fence: 'M4 21V8l2-3 2 3v13M10 21V8l2-3 2 3v13M16 21V8l2-3 2 3v13M4 12h16M4 17h16',
  stairs: 'M4 20h4v-4h4v-4h4V8h4V4',
  shower: 'M8 4a4 4 0 0 1 8 0v2M6 10h12M8 14v1M12 14v1M16 14v1M9 18v1M14 18v1',
  bbq: 'M5 10a7 7 0 0 0 14 0H5Zm3 7-1 4m9-4 1 4M12 17v4M9 3v2M12 2v3M15 3v2',
  airy: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5',
  olive: 'M12 21c-4 0-7-3-7-7 0-5 4-9 7-11 3 2 7 6 7 11 0 4-3 7-7 7Zm0-4v-6',
  device: 'M4 6h16v10H4zM8 20h8M12 16v4',
  check: 'M4 12.5 9.5 18 20 6',
};
/**
 * Αντιστοίχιση **σταθερού slug** → εικονίδιο. Αυτό είναι το μέλλον: το slug δεν
 * αλλάζει ποτέ, οπότε η διατύπωση μπορεί να ξαναγραφτεί χωρίς συνέπεια.
 * Ό,τι slug δεν είναι εδώ παίρνει το γενικό ✓ — δεν σπάει τίποτα.
 */
const ICON_BY_SLUG: Record<string, string> = {
  fireplace: ICON.fireplace, energy_fireplace: ICON.fireplace,
  built_in_kitchen: ICON.kitchen, kitchen: ICON.kitchen,
  garden: ICON.garden, olive_grove: ICON.olive,
  fenced: ICON.fence, internal_stairway: ICON.stairs,
  outside_shower: ICON.shower, bbq: ICON.bbq,
  airy: ICON.airy, electrical_devices: ICON.device,
  // `views` — η ΜΟΝΗ λίστα του EALIDA που έχει ήδη slug
  sea: ICON.view, mountain: ICON.view, open: ICON.view,
  pool: ICON.view, city: ICON.view, forest: ICON.garden,
};

/**
 * 🪤 ΤΟ ΤΑΙΡΙΑΣΜΑ ΜΕ ΚΕΙΜΕΝΟ ΕΙΝΑΙ ΕΦΕΔΡΕΙΑ, ΟΧΙ Ο ΚΑΝΟΝΑΣ — και ήδη σφάλλει:
 *   · το `/τζακι/` πιάνει ΔΥΟ διαφορετικές παροχές («Τζάκι» και «Ενεργειακό τζάκι»)
 *   · μία παροχή είναι γραμμένη «Μπαρμπεκιου» ΧΩΡΙΣ τόνο — regex με τόνο τη χάνει
 * Μένει μόνο για όσο το API δίνει σκέτο κείμενο. Με slug, τίποτα από αυτά δεν παίζει.
 */
/**
 * 🪤 ΟΙ ΤΟΝΟΙ ΕΚΑΝΑΝ ΤΟ ΤΑΙΡΙΑΣΜΑ ΝΑ ΑΣΤΟΧΕΙ ΣΙΩΠΗΛΑ.
 *    Έψαχνα `/κουζιν/` και η λέξη γράφεται «κουζ**ί**να» — δεν ταιριάζει ποτέ.
 *    Μετρήθηκε ζωντανά: η «Εντοιχισμένη Κουζίνα» έπαιρνε το ΓΕΝΙΚΟ ✓ ενώ υπάρχει
 *    εικονίδιο κουζίνας. Το ίδιο και «θέα» vs «θεα», «σκάλα» vs «σκαλα».
 *    Αφαιρούμε τόνους ΚΑΙ ΑΠΟ ΤΑ ΔΥΟ μέρη πριν συγκρίνουμε.
 */
const fold = (x: string) =>
  x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function featureIcon(f: Feature | string): string {
  const slug = typeof f === 'string' ? '' : (f.slug ?? '');
  if (slug && ICON_BY_SLUG[slug]) return ICON_BY_SLUG[slug];
  const label = typeof f === 'string' ? f : f.label;
  const s = fold(label);
  if (/κουζιν|kitchen/.test(s)) return ICON.kitchen;
  if (/τζακι|fireplace/.test(s)) return ICON.fireplace;
  if (/θεα|view/.test(s)) return ICON.view;
  if (/κηπο|garden|ελαιω|olive|grove/.test(s)) return /ελαιω|olive/.test(s) ? ICON.olive : ICON.garden;
  if (/περιφραγ|fence/.test(s)) return ICON.fence;
  if (/σκαλα|stair/.test(s)) return ICON.stairs;
  if (/ντους|shower/.test(s)) return ICON.shower;
  if (/μπαρμπεκ|bbq/.test(s)) return ICON.bbq;
  if (/διαμπερ|airy/.test(s)) return ICON.airy;
  if (/συσκευ|device|electric/.test(s)) return ICON.device;
  return ICON.check;
}

/** Ένας «χώρος» (όροφος) όπως έρχεται από το API. */
export type Space = {
  level: number; level_sqm?: number; rooms?: number; wc?: number;
  bathrooms?: number; living_rooms?: number; en_suits?: number;
};
export function spacesOf(a: Attrs): Space[] {
  const v = (a as Record<string, unknown>).spaces;
  if (!Array.isArray(v)) return [];
  return (v as Space[]).filter((s) => typeof s?.level === 'number')
    .sort((x, y) => y.level - x.level);   // πάνω όροφος πρώτος — έτσι διαβάζεται ένα σπίτι
}

export type Distance = { poi_el?: string; poi_en?: string; walk_km?: number; drive_km?: number };
export function distancesOf(a: Attrs): Distance[] {
  const v = (a as Record<string, unknown>).distances;
  if (!Array.isArray(v)) return [];
  // Κρατάμε όσα έχουν πραγματική τιμή· τα 0/0 του τροφοδότη είναι «δεν μετρήθηκε».
  return (v as Distance[]).filter((d) => (d.walk_km ?? 0) > 0 || (d.drive_km ?? 0) > 0).slice(0, 8);
}

/**
 * ΕΝΕΡΓΕΙΑΚΗ ΚΛΑΣΗ — αποκωδικοποίηση στο σύνορο.
 *
 * 🪤 ΤΟ «10» ΔΕΝ ΕΙΝΑΙ ΝΟΥΜΕΡΟ, ΕΙΝΑΙ ΤΟ **H**. Ο τροφοδότης δίνει ΚΩΔΙΚΟ, και
 *    ο κατάλογος πεδίων του EALIDA έχει την αντιστοίχιση (13 τιμές).
 *
 * 🔴 ΚΑΙ Ο ΠΡΟΗΓΟΥΜΕΝΟΣ ΕΛΕΓΧΟΣ ΕΚΡΥΒΕ ΤΙΣ ΔΥΟ ΣΥΧΝΟΤΕΡΕΣ ΤΙΜΕΣ.
 *    Δεχόταν μόνο γράμμα (`/^[A-HΑ-Η]\+?$/`). Μετρήθηκε στα 527 ακίνητα:
 *        κωδικός 11 «Στη διαδικασία έκδοσης» → **178 ακίνητα**
 *        κωδικός 14 «Εξαιρείται»             →  **42 ακίνητα**
 *    Δηλαδή 220 ακίνητα είχαν έγκυρη, χρήσιμη πληροφορία — και την πετούσα,
 *    επειδή «δεν έμοιαζε με γράμμα». Σε νεόδμητα το «σε έκδοση» είναι κανονική
 *    απάντηση, όχι έλλειψη.
 *
 * ⚙️ Δέχεται ΚΑΙ τα δύο σχήματα: κωδικό (σημερινό hp-api) ή έτοιμη ετικέτα
 *    (όταν το site τραβήξει ακίνητα από το EALIDA) — χωρίς αλλαγή κώδικα.
 */
const ENERGY: Record<string, string> = {
  '1': 'A+++', '2': 'A++', '3': 'A+', '4': 'A', '13': 'B+', '5': 'B',
  '6': 'Γ', '7': 'Δ', '8': 'E', '9': 'Z', '10': 'H',
};
/** Οι δύο μη-γράμμα καταστάσεις — θέλουν μετάφραση, τα γράμματα όχι. */
const ENERGY_PENDING = '11';
const ENERGY_EXEMPT = '14';

export function energyOf(a: Attrs, lang?: Lang): string | null {
  const raw = String((a as Record<string, unknown>).energy_class ?? '').trim();
  if (!raw || raw === '0') return null;

  if (ENERGY[raw]) return ENERGY[raw];
  if (raw === ENERGY_PENDING) return lang ? pui(lang, 'energyPending') : null;
  if (raw === ENERGY_EXEMPT) return lang ? pui(lang, 'energyExempt') : null;

  // 🪤 ΤΟ ΠΑΛΙΟ ΣΥΣΤΗΜΑ ΓΡΑΦΕΙ ΚΑΙ ΕΛΕΥΘΕΡΟ ΚΕΙΜΕΝΟ — και λάθος: 2 ακίνητα λένε
  //    «In the process of insurance» αντί «issuance» (ασφάλιση αντί έκδοσης).
  //    Το αναγνωρίζουμε ρητά αντί να το τυπώσουμε ή να το πετάξουμε.
  if (/process of (insurance|issuance)|διαδικασ/i.test(raw)) {
    return lang ? pui(lang, 'energyPending') : null;
  }
  // Έτοιμη ετικέτα (A+, B, H…) — πέρασέ τη όπως είναι.
  const up = raw.toUpperCase();
  if (/^[A-HΑ-Η]\+{0,3}$/.test(up)) return up;
  return null;
}

/**
 * ΑΠΟΣΤΑΣΗ ΑΠΟ ΤΗ ΘΑΛΑΣΣΑ, σε λέξεις.
 *
 * 🪤 ΤΟ ΠΕΔΙΟ ΕΙΝΑΙ ΣΕ ΜΕΤΡΑ — μετρήθηκε σε 410 ακίνητα: 0 ως 24.500.
 *    Διάμεσες: «μπροστά» 14μ · «με τα πόδια» 400μ · «κοντά» 1.700μ.
 *    Αν το τυπώναμε ωμό θα έβγαινε «24500 μ.» — γι' αυτό γίνεται χιλιόμετρα
 *    πάνω από το 1.000. Ο ΑΡΙΘΜΟΣ λέει περισσότερα από τον χαρακτηρισμό:
 *    «μπροστά στη θάλασσα» το λένε όλοι· «14 μ.» δεν το αμφισβητεί κανείς.
 */
export function seaDistanceText(a: Attrs, lang: Lang, fmt: (n: number, l: Lang) => string): string | null {
  const v = Number((a as Record<string, unknown>).sea_distance ?? NaN);
  if (!Number.isFinite(v) || v < 0) return null;
  if (v < 1000) return `${fmt(Math.round(v), lang)} ${pui(lang, 'mU')}`;
  return `${fmt(Math.round(v / 100) / 10, lang)} ${pui(lang, 'kmU')}`;
}

export function oldPriceOf(a: Attrs): number | null {
  const v = Number((a as Record<string, unknown>).old_price ?? 0);
  const cur = Number((a as Record<string, unknown>).public_price ?? 0);
  return v > cur && cur > 0 ? v : null;   // μόνο πραγματική έκπτωση — όχι θόρυβος
}

// ── ΤΑ ΚΕΙΜΕΝΑ ΤΗΣ ΚΑΡΤΕΛΑΣ — πλήρη και στις 9, αλλιώς δεν χτίζει (Record) ──
type PUI = {
  desc: string; feats: string; floors: string; location: string; distances: string;
  similar: string; reqTour: string; reqInfo: string; send: string; call: string;
  or: string; unlockH: string; unlockP: string; freeReg: string;
  morePhotos: string; photoOf: string;
  fName: string; fPhone: string; fEmail: string; interest: string; sent: string; answers: string;
  whenSuits: string; otherDay: string; videocall: string; tourContact: string;
  sqmL: string; bedsL: string; bathsL: string; seaL: string; energyL: string; perSqm: string;
  floorBase: string; floorGround: string; floorN: string;
  roomsL: string; livingL: string; wcL: string;
  favorite: string; shareL: string; copied: string; lockChip: string;
  /** Μονάδες. ⚠️ ΠΟΤΕ γραμμένες μέσα στο component — δες το σχόλιο στις αποστάσεις. */
  kmU: string; mU: string;
  /** Οι δύο μη-γράμμα ενεργειακές καταστάσεις — 220 από τα 527 ακίνητα. */
  energyPending: string; energyExempt: string;
};
export const PROP_UI: Record<Lang, PUI> = {
  el: { desc: 'Περιγραφή', feats: 'Χαρακτηριστικά', floors: 'Όροφοι', location: 'Τοποθεσία',
    distances: 'Αποστάσεις', similar: 'Παρόμοια ακίνητα', reqTour: 'Ζητήστε επίσκεψη',
    reqInfo: 'Ζητήστε πληροφορίες', send: 'Αποστολή', call: 'Κλήση', or: 'ή',
    unlockH: 'Ξεκλειδώστε την περιοχή', unlockP: 'Με δωρεάν λογαριασμό βλέπετε πού ακριβώς βρίσκεται το ακίνητο.',
    freeReg: 'Δωρεάν εγγραφή', morePhotos: 'Έχετε άλλες {n} φωτογραφίες', photoOf: '{a} / {b}',
    fName: 'Ονοματεπώνυμο', fPhone: 'Κινητό', fEmail: 'Email',
    interest: 'Ενδιαφέρομαι για το ακίνητο #{id}', sent: 'Το λάβαμε — θα σας απαντήσουμε σύντομα.',
    answers: 'Απαντάμε εντός 2 ωρών τις εργάσιμες.',
    whenSuits: 'Πότε σας βολεύει;', otherDay: 'Άλλη μέρα', videocall: 'Βιντεοκλήση',
    tourContact: 'Κινητό ή email',
    sqmL: 'Εμβαδόν', bedsL: 'Υπνοδωμάτια', bathsL: 'Μπάνια', seaL: 'Από θάλασσα',
    energyL: 'Ενεργειακή', perSqm: '/ τ.μ.',
    floorBase: 'Υπόγειο', floorGround: 'Ισόγειο', floorN: 'Όροφος {n}',
    roomsL: 'Δωμάτια', livingL: 'Καθιστικά', wcL: 'WC',
    favorite: 'Αγαπημένο', shareL: 'Κοινοποίηση', copied: 'Αντιγράφηκε',
    lockChip: 'ακριβής περιοχή με εγγραφή', kmU: 'χλμ', mU: 'μ.', energyPending: 'Σε έκδοση', energyExempt: 'Εξαιρείται' },
  en: { desc: 'Description', feats: 'Features', floors: 'Floors', location: 'Location',
    distances: 'Distances', similar: 'Similar properties', reqTour: 'Request a tour',
    reqInfo: 'Request info', send: 'Send', call: 'Call', or: 'or',
    unlockH: 'Unlock the area', unlockP: 'With a free account you can see exactly where the property is.',
    freeReg: 'Free registration', morePhotos: '{n} more photos', photoOf: '{a} / {b}',
    fName: 'Full name', fPhone: 'Mobile', fEmail: 'Email',
    interest: 'I am interested in property #{id}', sent: 'Received — we will get back to you shortly.',
    answers: 'We reply within 2 hours on business days.',
    whenSuits: 'When suits you?', otherDay: 'Another day', videocall: 'Video call',
    tourContact: 'Mobile or email',
    sqmL: 'Area', bedsL: 'Bedrooms', bathsL: 'Bathrooms', seaL: 'From the sea',
    energyL: 'Energy', perSqm: '/ m²',
    floorBase: 'Basement', floorGround: 'Ground floor', floorN: 'Floor {n}',
    roomsL: 'Rooms', livingL: 'Living rooms', wcL: 'WC',
    favorite: 'Favorite', shareL: 'Share', copied: 'Copied', lockChip: 'exact area with sign-up',
    kmU: 'km', mU: 'm', energyPending: 'Being issued', energyExempt: 'Exempt' },
  bg: { desc: 'Описание', feats: 'Характеристики', floors: 'Етажи', location: 'Локация',
    distances: 'Разстояния', similar: 'Подобни имоти', reqTour: 'Заявете оглед',
    reqInfo: 'Поискайте информация', send: 'Изпрати', call: 'Обаждане', or: 'или',
    unlockH: 'Отключете района', unlockP: 'С безплатен акаунт виждате къде точно се намира имотът.',
    freeReg: 'Безплатна регистрация', morePhotos: 'Още {n} снимки', photoOf: '{a} / {b}',
    fName: 'Име и фамилия', fPhone: 'Мобилен', fEmail: 'Имейл',
    interest: 'Интересувам се от имот #{id}', sent: 'Получено — ще се свържем скоро.',
    answers: 'Отговаряме до 2 часа в работни дни.',
    whenSuits: 'Кога ви е удобно?', otherDay: 'Друг ден', videocall: 'Видеообаждане',
    tourContact: 'Мобилен или имейл',
    sqmL: 'Площ', bedsL: 'Спални', bathsL: 'Бани', seaL: 'От морето',
    energyL: 'Енергиен клас', perSqm: '/ м²',
    floorBase: 'Сутерен', floorGround: 'Партер', floorN: 'Етаж {n}',
    roomsL: 'Стаи', livingL: 'Дневни', wcL: 'WC',
    favorite: 'Любим', shareL: 'Сподели', copied: 'Копирано', lockChip: 'точен район с регистрация',
    kmU: 'км', mU: 'м', energyPending: 'В процес на издаване', energyExempt: 'Освободен' },
  sr: { desc: 'Opis', feats: 'Karakteristike', floors: 'Spratovi', location: 'Lokacija',
    distances: 'Udaljenosti', similar: 'Slične nekretnine', reqTour: 'Zatražite obilazak',
    reqInfo: 'Zatražite informacije', send: 'Pošalji', call: 'Poziv', or: 'ili',
    unlockH: 'Otključajte područje', unlockP: 'Uz besplatan nalog vidite gde se tačno nalazi nekretnina.',
    freeReg: 'Besplatna registracija', morePhotos: 'Još {n} fotografija', photoOf: '{a} / {b}',
    fName: 'Ime i prezime', fPhone: 'Mobilni', fEmail: 'Email',
    interest: 'Zainteresovan sam za nekretninu #{id}', sent: 'Primljeno — javićemo se uskoro.',
    answers: 'Odgovaramo u roku od 2 sata radnim danima.',
    whenSuits: 'Kada vam odgovara?', otherDay: 'Drugi dan', videocall: 'Video poziv',
    tourContact: 'Mobilni ili email',
    sqmL: 'Površina', bedsL: 'Spavaće sobe', bathsL: 'Kupatila', seaL: 'Od mora',
    energyL: 'Energetski', perSqm: '/ m²',
    floorBase: 'Suteren', floorGround: 'Prizemlje', floorN: 'Sprat {n}',
    roomsL: 'Sobe', livingL: 'Dnevne sobe', wcL: 'WC',
    favorite: 'Omiljeno', shareL: 'Podeli', copied: 'Kopirano', lockChip: 'tačno područje uz registraciju',
    kmU: 'km', mU: 'm', energyPending: 'U izradi', energyExempt: 'Izuzeto' },
  de: { desc: 'Beschreibung', feats: 'Ausstattung', floors: 'Etagen', location: 'Lage',
    distances: 'Entfernungen', similar: 'Ähnliche Immobilien', reqTour: 'Besichtigung anfragen',
    reqInfo: 'Informationen anfragen', send: 'Senden', call: 'Anruf', or: 'oder',
    unlockH: 'Gegend freischalten', unlockP: 'Mit einem kostenlosen Konto sehen Sie genau, wo sich die Immobilie befindet.',
    freeReg: 'Kostenlose Registrierung', morePhotos: '{n} weitere Fotos', photoOf: '{a} / {b}',
    fName: 'Vor- und Nachname', fPhone: 'Mobil', fEmail: 'E-Mail',
    interest: 'Ich interessiere mich für Objekt #{id}', sent: 'Erhalten — wir melden uns in Kürze.',
    answers: 'Wir antworten werktags innerhalb von 2 Stunden.',
    whenSuits: 'Wann passt es Ihnen?', otherDay: 'Anderer Tag', videocall: 'Videoanruf',
    tourContact: 'Mobil oder E-Mail',
    sqmL: 'Fläche', bedsL: 'Schlafzimmer', bathsL: 'Bäder', seaL: 'Vom Meer',
    energyL: 'Energieklasse', perSqm: '/ m²',
    floorBase: 'Untergeschoss', floorGround: 'Erdgeschoss', floorN: 'Etage {n}',
    roomsL: 'Zimmer', livingL: 'Wohnzimmer', wcL: 'WC',
    favorite: 'Favorit', shareL: 'Teilen', copied: 'Kopiert', lockChip: 'genaue Gegend mit Anmeldung',
    kmU: 'km', mU: 'm', energyPending: 'In Ausstellung', energyExempt: 'Befreit' },
  ro: { desc: 'Descriere', feats: 'Caracteristici', floors: 'Etaje', location: 'Locație',
    distances: 'Distanțe', similar: 'Proprietăți similare', reqTour: 'Solicitați o vizită',
    reqInfo: 'Solicitați informații', send: 'Trimite', call: 'Apel', or: 'sau',
    unlockH: 'Deblocați zona', unlockP: 'Cu un cont gratuit vedeți exact unde se află proprietatea.',
    freeReg: 'Înregistrare gratuită', morePhotos: 'Încă {n} fotografii', photoOf: '{a} / {b}',
    fName: 'Nume complet', fPhone: 'Mobil', fEmail: 'Email',
    interest: 'Sunt interesat de proprietatea #{id}', sent: 'Primit — revenim în curând.',
    answers: 'Răspundem în 2 ore în zilele lucrătoare.',
    whenSuits: 'Când vă convine?', otherDay: 'Altă zi', videocall: 'Apel video',
    tourContact: 'Mobil sau email',
    sqmL: 'Suprafață', bedsL: 'Dormitoare', bathsL: 'Băi', seaL: 'De la mare',
    energyL: 'Clasă energetică', perSqm: '/ m²',
    floorBase: 'Subsol', floorGround: 'Parter', floorN: 'Etaj {n}',
    roomsL: 'Camere', livingL: 'Camere de zi', wcL: 'WC',
    favorite: 'Favorit', shareL: 'Distribuie', copied: 'Copiat', lockChip: 'zona exactă cu înregistrare',
    kmU: 'km', mU: 'm', energyPending: 'În curs de emitere', energyExempt: 'Exceptat' },
  tr: { desc: 'Açıklama', feats: 'Özellikler', floors: 'Katlar', location: 'Konum',
    distances: 'Mesafeler', similar: 'Benzer mülkler', reqTour: 'Ziyaret talep edin',
    reqInfo: 'Bilgi isteyin', send: 'Gönder', call: 'Ara', or: 'veya',
    unlockH: 'Bölgeyi açın', unlockP: 'Ücretsiz hesapla mülkün tam olarak nerede olduğunu görürsünüz.',
    freeReg: 'Ücretsiz kayıt', morePhotos: '{n} fotoğraf daha', photoOf: '{a} / {b}',
    fName: 'Ad soyad', fPhone: 'Cep', fEmail: 'E-posta',
    interest: '#{id} numaralı mülkle ilgileniyorum', sent: 'Alındı — kısa sürede döneceğiz.',
    answers: 'İş günlerinde 2 saat içinde yanıtlıyoruz.',
    whenSuits: 'Ne zaman uygun?', otherDay: 'Başka gün', videocall: 'Görüntülü arama',
    tourContact: 'Cep veya e-posta',
    sqmL: 'Alan', bedsL: 'Yatak odası', bathsL: 'Banyo', seaL: 'Denizden',
    energyL: 'Enerji sınıfı', perSqm: '/ m²',
    floorBase: 'Bodrum', floorGround: 'Zemin kat', floorN: 'Kat {n}',
    roomsL: 'Odalar', livingL: 'Oturma odası', wcL: 'WC',
    favorite: 'Favori', shareL: 'Paylaş', copied: 'Kopyalandı', lockChip: 'kayıtla tam bölge',
    kmU: 'km', mU: 'm', energyPending: 'Düzenleniyor', energyExempt: 'Muaf' },
  he: { desc: 'תיאור', feats: 'מאפיינים', floors: 'קומות', location: 'מיקום',
    distances: 'מרחקים', similar: 'נכסים דומים', reqTour: 'בקשו סיור',
    reqInfo: 'בקשו מידע', send: 'שליחה', call: 'שיחה', or: 'או',
    unlockH: 'פתחו את האזור', unlockP: 'עם חשבון חינם תראו היכן בדיוק נמצא הנכס.',
    freeReg: 'הרשמה חינם', morePhotos: 'עוד {n} תמונות', photoOf: '{a} / {b}',
    fName: 'שם מלא', fPhone: 'נייד', fEmail: 'אימייל',
    interest: 'אני מתעניין בנכס #{id}', sent: 'התקבל — נחזור אליכם בקרוב.',
    answers: 'אנו עונים תוך שעתיים בימי עסקים.',
    whenSuits: 'מתי נוח לכם?', otherDay: 'יום אחר', videocall: 'שיחת וידאו',
    tourContact: 'נייד או אימייל',
    sqmL: 'שטח', bedsL: 'חדרי שינה', bathsL: 'חדרי רחצה', seaL: 'מהים',
    energyL: 'דירוג אנרגטי', perSqm: '/ מ״ר',
    floorBase: 'מרתף', floorGround: 'קומת קרקע', floorN: 'קומה {n}',
    roomsL: 'חדרים', livingL: 'סלונים', wcL: 'שירותים',
    favorite: 'מועדף', shareL: 'שיתוף', copied: 'הועתק', lockChip: 'אזור מדויק בהרשמה',
    kmU: 'ק״מ', mU: 'מ׳', energyPending: 'בהנפקה', energyExempt: 'פטור' },
  ru: { desc: 'Описание', feats: 'Характеристики', floors: 'Этажи', location: 'Расположение',
    distances: 'Расстояния', similar: 'Похожие объекты', reqTour: 'Запросить просмотр',
    reqInfo: 'Запросить информацию', send: 'Отправить', call: 'Звонок', or: 'или',
    unlockH: 'Откройте район', unlockP: 'С бесплатным аккаунтом вы увидите, где именно находится объект.',
    freeReg: 'Бесплатная регистрация', morePhotos: 'Ещё {n} фото', photoOf: '{a} / {b}',
    fName: 'Имя и фамилия', fPhone: 'Мобильный', fEmail: 'Email',
    interest: 'Меня интересует объект #{id}', sent: 'Получено — мы скоро свяжемся с вами.',
    answers: 'Отвечаем в течение 2 часов в рабочие дни.',
    whenSuits: 'Когда вам удобно?', otherDay: 'Другой день', videocall: 'Видеозвонок',
    tourContact: 'Мобильный или email',
    sqmL: 'Площадь', bedsL: 'Спальни', bathsL: 'Ванные', seaL: 'От моря',
    energyL: 'Энергокласс', perSqm: '/ м²',
    floorBase: 'Подвал', floorGround: 'Первый этаж', floorN: 'Этаж {n}',
    roomsL: 'Комнаты', livingL: 'Гостиные', wcL: 'WC',
    favorite: 'Избранное', shareL: 'Поделиться', copied: 'Скопировано', lockChip: 'точный район после регистрации',
    kmU: 'км', mU: 'м', energyPending: 'Оформляется', energyExempt: 'Освобождён' },
};

export function pui(lang: Lang, k: keyof PUI, vars?: Record<string, string | number>): string {
  let s = (PROP_UI[lang] ?? PROP_UI.el)[k];
  for (const [key, v] of Object.entries(vars ?? {})) s = s.replaceAll(`{${key}}`, String(v));
  return s;
}

/** Όνομα ορόφου: 0 = υπόγειο, 1 = ισόγειο, 2+ = «Όροφος n-1». */
export function floorName(lang: Lang, level: number): string {
  if (level <= 0) return pui(lang, 'floorBase');
  if (level === 1) return pui(lang, 'floorGround');
  return pui(lang, 'floorN', { n: level - 1 });
}

/**
 * ΤΥΠΟΣ schema.org ΑΝΑ ΥΠΟΚΑΤΗΓΟΡΙΑ.
 *
 * 🔴 ΓΙΑΤΙ ΔΥΟ ΤΥΠΟΙ ΚΑΙ ΟΧΙ ΕΝΑΣ. Δηλώναμε `Residence`, που είναι `Place`: **δεν
 *    δέχεται ούτε `offers`** (θέλει `Product`) **ούτε `floorSize`/`numberOfRooms`**
 *    (θέλουν `Accommodation`). Δηλαδή στέλναμε τιμή, εμβαδόν και υπνοδωμάτια σε τύπο
 *    που δεν τα καταλαβαίνει, και η Google τα **αγνοούσε και τα τρία** — δηλαδή
 *    καμία τιμή δεν έφτανε ποτέ στα αποτελέσματα. Το JSON-LD επιτρέπει ΠΟΛΛΑΠΛΟ
 *    τύπο· τον χρησιμοποιούμε.
 *
 * 🪤 Η ΓΗ ΔΕΝ ΕΙΝΑΙ ΚΑΤΑΛΥΜΑ. Ένα χωράφι δεν έχει δάπεδο ούτε υπνοδωμάτια — μένει
 *    σκέτο `Product` και το εμβαδόν πάει σε `additionalProperty`. **209 από τα 517**
 *    ακίνητά μας είναι γη· δεν είναι ακραία περίπτωση, είναι το 40%.
 */
export function schemaTypesOf(a: Attrs): string[] {
  const s = String((a as Record<string, unknown>).subcategory ?? '').toLowerCase();
  if (/land|field|plot|parcel|agricultur/.test(s)) return ['Product'];
  if (/apartment|penthouse|studio|flat/.test(s)) return ['Product', 'Apartment'];
  if (/detached|villa|house|maisonette|duplex|bungalow/.test(s)) return ['Product', 'SingleFamilyResidence'];
  return ['Product', 'Accommodation'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Η ΓΗ — 207 ΑΚΙΝΗΤΑ, ΤΟ 40% ΤΟΥ ΚΑΤΑΛΟΓΟΥ, ΚΑΙ Η ΚΑΡΤΕΛΑ ΔΕΝ ΕΔΕΙΧΝΕ ΤΙΠΟΤΑ.
//
// 🔴 ΤΙ ΕΒΛΕΠΕ Ο ΠΕΛΑΤΗΣ ΣΕ ΕΝΑ ΧΩΡΑΦΙ: μόνο τα τετραγωνικά. Ούτε αν είναι
//    οικοδομήσιμο, ούτε αν έχει ρεύμα ή νερό, ούτε τι δρόμο έχει. Δηλαδή ακριβώς
//    τα τέσσερα πράγματα που ρωτάει **πρώτα** όποιος αγοράζει γη.
//
// 🪤 ΤΑ ΟΝΟΜΑΤΑ ΤΩΝ ΠΕΔΙΩΝ ΕΙΝΑΙ ΠΑΓΙΔΑ. Υπάρχουν ΔΙΠΛΟΤΥΠΑ που **διαφωνούν**:
//      `land_electricity` vs `electricity` → 3 λάθη στα 12 σε διασταύρωση με την
//        παλιά βάση. **Σωστό είναι το `electricity`.** Ίδιο για `land_water`.
//      `land_buildable` ΔΕΝ σημαίνει «οικοδομήσιμο» — ταυτίζεται με το `has_building`.
//      `land_usage` ΔΕΝ είναι «χρήση γης»: είναι **εμβαδόν πολυγώνου χάρτη**
//        (μετρήθηκε με shoelace στο #1176 → 16.700 m² ≈ 16.737). Αν το τύπωνες
//        ως «Χρήση γης: 10120.37» θα ήταν ακαταλαβίστικο.
//    ⛔ ΜΗΝ χρησιμοποιήσεις κανένα από τα τέσσερα.
//
// 🌍 ΟΙ ΚΩΔΙΚΟΙ ΕΧΟΥΝ ΜΕΤΑΦΡΑΣΗ ΜΟΝΟ ΣΕ 5 ΓΛΩΣΣΕΣ (el en bg de sr) — από την πηγή.
//    Οι υπόλοιπες τέσσερις πέφτουν στα αγγλικά· καλύτερα αγγλικά παρά κενό.
// ═══════════════════════════════════════════════════════════════════════════

type L5 = { el: string; en: string; bg?: string; de?: string; sr?: string };
const pickL = (t: L5, lang: string): string =>
  (t as Record<string, string | undefined>)[lang] ?? t.en;

/** Οικοδομήσιμο — η πρώτη ερώτηση κάθε αγοραστή γης. */
const BUILDABLE: Record<string, L5> = {
  '1': { el: 'Άρτιο οικοδομήσιμο', en: 'Buildable', bg: 'Сграден', de: 'Baubar', sr: 'Može se graditi' },
  '2': { el: 'Άρτιο και οικοδομήσιμο κατά κανόνα', en: 'Buildable under standard regulations',
         bg: 'Изгражда се съгласно стандартните разпоредби', de: 'Nach Standardvorschriften baubar',
         sr: 'Može se graditi prema standardnim propisima' },
  '3': { el: 'Άρτιο και οικοδομήσιμο κατά παρέκκλιση', en: 'Buildable under special regulations',
         bg: 'Съгласно специални разпоредби', de: 'Baubar unter besonderen Vorschriften',
         sr: 'Prema posebnim propisima' },
  '4': { el: 'Μη οικοδομήσιμο', en: 'Not buildable', bg: 'Не може да се строи',
         de: 'Nicht baubar', sr: 'Nije moguće graditi' },
};

const PLAN: Record<string, L5> = {
  '1': { el: 'Εντός σχεδίου', en: 'Within the plan', bg: 'В рамките на плана',
         de: 'Innerhalb des Plans', sr: 'Unutar plana' },
  '2': { el: 'Εκτός σχεδίου, εντός ζώνης', en: 'Out of plan, within the zone',
         bg: 'Извън градоустройствен план в зоната', de: 'Außerhalb des Stadtplans innerhalb der Zone',
         sr: 'Vangradski plan unutar zone' },
  '3': { el: 'Εκτός σχεδίου', en: 'Out of plan', bg: 'Извън плана',
         de: 'Aus dem Plan', sr: 'Izvan plana' },
};

const ROAD: Record<string, L5> = {
  asphalt: { el: 'Άσφαλτος', en: 'Asphalt road', bg: 'Асфалт', de: 'Asphaltstraße', sr: 'Asfalt' },
  dirt: { el: 'Χωματόδρομος', en: 'Dirt road', bg: 'Черен път', de: 'Feldweg', sr: 'Zemljani put' },
  // 🪤 ΠΡΟΣΟΧΗ ΣΤΗ ΔΙΑΤΥΠΩΣΗ. Στην παλιά βάση αυτό ήταν «Μόνο με σκάφος» — για
  //    παραθαλάσσιο τεμάχιο είναι **προνόμιο**, όχι ελάττωμα. Το «Χωρίς πρόσβαση»
  //    διαβάζεται ανάποδα. Λέμε τι ΕΙΝΑΙ, χωρίς κρίση.
  none: { el: 'Χωρίς δρόμο', en: 'No road access', bg: 'Без път', de: 'Kein Straßenzugang', sr: 'Bez puta' },
};

const ORIENT: Record<string, L5> = {
  '1': { el: 'Βόρειος', en: 'North' }, '2': { el: 'Δυτικός', en: 'West' },
  '3': { el: 'Νότιος', en: 'South' }, '4': { el: 'Ανατολικός', en: 'East' },
  '5': { el: 'Βορειοανατολικός', en: 'Northeast' }, '6': { el: 'Βορειοδυτικός', en: 'Northwest' },
  '7': { el: 'Νοτιοανατολικός', en: 'Southeast' }, '8': { el: 'Νοτιοδυτικός', en: 'Southwest' },
  '9': { el: 'Πανοραμικός', en: 'Panoramic' },
};

const YES: L5 = { el: 'Ναι', en: 'Yes', bg: 'Да', de: 'Ja', sr: 'Da' };
const NO: L5 = { el: 'Όχι', en: 'No', bg: 'Не', de: 'Nein', sr: 'Ne' };

const LBL = {
  buildable: { el: 'Οικοδομήσιμο', en: 'Buildable', bg: 'Сграден', de: 'Bebaubar', sr: 'Gradnja' },
  plan: { el: 'Ένταξη σε σχέδιο', en: 'Town plan', bg: 'Градоустройствен план', de: 'Bebauungsplan', sr: 'Urbanistički plan' },
  road: { el: 'Πρόσβαση δρόμου', en: 'Road access', bg: 'Достъп до път', de: 'Straßenzugang', sr: 'Pristup putu' },
  power: { el: 'Ηλεκτρικό ρεύμα', en: 'Electricity', bg: 'Електричество', de: 'Strom', sr: 'Struja' },
  water: { el: 'Παροχή νερού', en: 'Water supply', bg: 'Водоснабдяване', de: 'Wasseranschluss', sr: 'Vodovod' },
  drill: { el: 'Γεώτρηση', en: 'Borehole', bg: 'Сондаж', de: 'Bohrloch', sr: 'Bunar' },
  build: { el: 'Συντελεστής δόμησης', en: 'Building coefficient', bg: 'Коефициент на застрояване', de: 'Baukoeffizient', sr: 'Koeficijent izgradnje' },
  cover: { el: 'Συντελεστής κάλυψης', en: 'Coverage coefficient', bg: 'Коефициент на покритие', de: 'Überbauungsziffer', sr: 'Koeficijent pokrivenosti' },
  orient: { el: 'Προσανατολισμός', en: 'Orientation', bg: 'Ориентация', de: 'Ausrichtung', sr: 'Orijentacija' },
} satisfies Record<string, L5>;

/** Είναι γη; Η υποκατηγορία είναι ο αξιόπιστος δείκτης (field/plot/island). */
export function isLand(a: Attrs): boolean {
  const c = String((a as Record<string, unknown>).category ?? '').toLowerCase();
  const s = String((a as Record<string, unknown>).subcategory ?? '').toLowerCase();
  return c === 'land' || /^(field|plot|island|parcel)$/.test(s);
}

/** Τα στοιχεία που ενδιαφέρουν όποιον αγοράζει γη — με τη σειρά του παλιού site. */
export function landFactsOf(a: Attrs, lang: string): { label: string; value: string }[] {
  const g = (k: string) => (a as Record<string, unknown>)[k];
  const out: { label: string; value: string }[] = [];
  const put = (l: L5, v?: string) => { if (v) out.push({ label: pickL(l, lang), value: v }); };

  put(LBL.buildable, BUILDABLE[String(g('buildable_type') ?? '')] && pickL(BUILDABLE[String(g('buildable_type'))], lang));
  put(LBL.plan, PLAN[String(g('plan_type') ?? '')] && pickL(PLAN[String(g('plan_type'))], lang));
  put(LBL.road, ROAD[String(g('road_access') ?? '')] && pickL(ROAD[String(g('road_access'))], lang));
  // Ρεύμα και νερό: λέμε ΚΑΙ το «όχι». Η απουσία γραμμής διαβάζεται ως «δεν ξέρουμε»,
  // ενώ εδώ ξέρουμε — και για χωράφι είναι καθοριστικό.
  if (g('electricity') !== undefined) put(LBL.power, pickL(g('electricity') ? YES : NO, lang));
  if (g('water') !== undefined) put(LBL.water, pickL(g('water') ? YES : NO, lang));
  if (g('drilling')) put(LBL.drill, pickL(YES, lang));
  const br = Number(g('building_rate') ?? 0);
  if (br > 0) put(LBL.build, String(br).replace('.', lang === 'el' ? ',' : '.'));
  const cr = Number(g('coverage_rate') ?? 0);
  if (cr > 0) put(LBL.cover, String(cr).replace('.', lang === 'el' ? ',' : '.'));
  put(LBL.orient, ORIENT[String(g('orientation') ?? '')] && pickL(ORIENT[String(g('orientation'))], lang));
  return out;
}
