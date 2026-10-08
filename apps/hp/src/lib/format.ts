// Μορφοποίηση — μία φορά, σωστά, παντού.
import type { Lang } from './i18n';

// 🪤 ΚΑΘΕ ΝΕΑ ΓΛΩΣΣΑ ΘΕΛΕΙ ΓΡΑΜΜΗ ΕΔΩ. Χωρίς αυτήν το `LOCALE[lang]` είναι
//    `undefined` και το Intl πέφτει στο locale του SERVER (en-US) — δηλαδή
//    «€1,234,567» με κόμματα σε σελίδα που περιμένει τελείες. Έλειπε για
//    tr/he/ru μέχρι τις 29/7.
const LOCALE: Record<Lang, string> = {
  el: 'el-GR', en: 'en-GB', bg: 'bg-BG', sr: 'sr-RS', de: 'de-DE', ro: 'ro-RO',
  tr: 'tr-TR', he: 'he-IL', ru: 'ru-RU',
};

/** Τιμή. Λεπτό αδιάσπαστο διάστημα πριν το € ώστε να μη σπάει σε νέα γραμμή. */
export function money(n: number, lang: Lang = 'el'): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n).replace(/\s/g, ' ');
}

export function num(n: number, lang: Lang = 'el'): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** «1.000 τ.μ.» — τα τετραγωνικά είναι μονάδα, όχι νόμισμα. */
export function sqm(n: number, lang: Lang = 'el'): string {
  const unit = lang === 'en' ? 'm²' : lang === 'de' ? 'm²' : 'τ.μ.';
  return `${num(Math.round(n), lang)} ${lang === 'el' ? unit : 'm²'}`;
}

// ── ΕΝΑ ΛΕΞΙΛΟΓΙΟ ΓΙΑ ΤΗ ΘΑΛΑΣΣΑ ──────────────────────────────────────────
// 🪤 Το ίδιο πεδίο (`sea_access`, τιμές front/walking/nearby) λεγόταν με
//    ΤΕΣΣΕΡΑ ονόματα: η κάρτα έγραφε «Περπατητή απόσταση» και «Κοντά στη
//    θάλασσα», το φίλτρο «Με τα πόδια» και «Κοντά». Ο επισκέπτης δεν μπορούσε
//    να ξέρει ότι διαλέγει αυτό που μόλις διάβασε. Μία πηγή, εδώ.
export const SEA_KEYS = ['front', 'walking', 'nearby'] as const;

// 🪤 ΚΑΙ ΟΙ ΕΞΙ ΓΛΩΣΣΕΣ, ΟΧΙ ΔΥΟ. Όσο ο πίνακας είχε μόνο `el` και `en`, το
//    `?? e.en` έστελνε σιωπηλά ΑΓΓΛΙΚΑ στα bg/sr/de/ro: 17 εμφανίσεις ανά σελίδα
//    («Seafront», «Walking distance») μέσα σε βουλγαρικό κείμενο — και στην ίδια
//    οθόνη η συλλογή έγραφε «На първа линия». Δύο ονόματα για το ίδιο πράγμα.
const SEA: Record<string, Record<Lang, string>> = {
  front: {
    el: 'Μπροστά στη θάλασσα', en: 'Seafront', bg: 'Първа линия море',
    sr: 'Prvi red do mora', de: 'Erste Meereslinie', ro: 'Prima linie la mare',
    tr: 'Denize sıfır', he: 'קו ראשון לים', ru: 'Первая линия моря',
  },
  walking: {
    el: 'Θάλασσα με τα πόδια', en: 'Walk to the sea', bg: 'Пеша до морето',
    sr: 'Peške do mora', de: 'Zu Fuß ans Meer', ro: 'Pe jos până la mare',
    tr: 'Denize yürüme mesafesi', he: 'הליכה לים', ru: 'Пешком до моря',
  },
  nearby: {
    el: 'Κοντά στη θάλασσα', en: 'Near the sea', bg: 'Близо до морето',
    sr: 'Blizu mora', de: 'Nahe am Meer', ro: 'Aproape de mare',
    tr: 'Denize yakın', he: 'קרוב לים', ru: 'Близко к морю',
  },
};

/**
 * Σύντομη περιγραφή απόστασης από θάλασσα — κάρτα ΚΑΙ φίλτρο ΚΑΙ εκτίμηση.
 * Αν λείψει ποτέ γλώσσα, γυρίζει ΚΕΝΟ — ποτέ αγγλικά σε μη αγγλική σελίδα.
 * Καλύτερα να λείπει μια ετικέτα παρά να φωνάζει ότι το site δεν είναι δικό τους.
 */
export function seaLabel(v: string | undefined, lang: Lang = 'el'): string {
  return SEA[v ?? '']?.[lang] ?? '';
}

/** Τα δεδομένα της κάρτας, ενωμένα με μεσαία τελεία. Κενά πεδία πέφτουν έξω. */
export function factLine(parts: (string | number | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// ΚΟΨΙΜΟ ΚΕΙΜΕΝΟΥ ΣΕ ΑΝΘΡΩΠΙΝΟ ΟΡΙΟ.
//
// 🔴 ΤΙ ΑΝΤΙΚΑΘΙΣΤΑ: `desc.slice(0, 155)`. Το αποτέλεσμα φαινόταν ζωντανά στο
//    #8075: «…With its newly built co» — και **ΤΟ ΙΔΙΟ string έμπαινε στο JSON-LD**,
//    άρα η μισή λέξη ταξίδευε και στα αποτελέσματα της Google.
//
// Σειρά προτίμησης: τέλος πρότασης (καθαρό, χωρίς αποσιωπητικά) → όριο λέξης + «…».
// ═══════════════════════════════════════════════════════════════════════════

/** Τι μετράει ως τέλος πρότασης. Το «;» είναι το ΕΛΛΗΝΙΚΟ ερωτηματικό. */
const ENDERS = '.!?…;؟。！？';

/**
 * @param max   ανώτατο μήκος ΣΥΜΠΕΡΙΛΑΜΒΑΝΟΜΕΝΟΥ του «…»
 * @param floor πόσο πίσω δεχόμαστε να πάμε για όριο (0-1 του max). Χωρίς αυτό, ένα
 *              κείμενο «Βίλα. Και μετά 400 λέξεις…» θα έδινε περιγραφή πέντε χαρακτήρων.
 */
export function clamp(raw: string, max = 155, floor = 0.55): string {
  // Οι περιγραφές του API έχουν αλλαγές γραμμής και διπλά κενά — σε <meta> είναι
  // σκουπίδια που ΜΕΤΡΑΝΕ στο όριο.
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;

  const min = Math.floor(max * floor);

  // ── 1. ΟΡΙΟ ΠΡΟΤΑΣΗΣ ──────────────────────────────────────────────────────
  const win = s.slice(0, max);
  for (let i = win.length - 1; i >= min; i--) {
    const ch = win[i];
    if (!ENDERS.includes(ch)) continue;
    // 🪤 «120 τ.μ.» και «3.5» ΔΕΝ είναι τέλος πρότασης: απαιτούμε κενό μετά, και
    //    να μην προηγείται ψηφίο σε τελεία.
    if (i + 1 < win.length && win[i + 1] !== ' ') continue;
    if (ch === '.' && /\d/.test(win[i - 1] ?? '')) continue;
    return win.slice(0, i + 1).trim();
  }

  // ── 2. ΟΡΙΟ ΛΕΞΗΣ ─────────────────────────────────────────────────────────
  const room = s.slice(0, max - 1);                 // −1 θέση για το «…»
  const sp = room.lastIndexOf(' ');
  const body = (sp >= min ? room.slice(0, sp) : room)
    .replace(/[\s,;:·–—-]+$/u, '');                 // χωρίς κρεμασμένο κόμμα ή παύλα
  return `${body}…`;
}
