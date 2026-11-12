// ═══════════════════════════════════════════════════════════════════════════
// ΟΙ ΣΕΛΙΔΕΣ ΠΕΡΙΕΧΟΜΕΝΟΥ — ΤΟ ΜΕΝΟΥ ΠΟΥ ΗΤΑΝ ΝΕΚΡΟ.
//
// 🔴 ΤΟ ΚΕΝΟ: μετρήθηκαν **124 εσωτερικές διευθύνσεις με 404** — 13 σελίδες × 9 γλώσσες.
//    Το κύριο μενού είχε **4 από 5** νεκρές επιλογές· στο κινητό **4 από 4**. Κάθε σελίδα
//    του site κουβαλούσε 16-22 συνδέσμους που δεν πήγαιναν πουθενά.
//
// 📄 ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ΔΕΝ ΕΠΙΝΟΕΙΤΑΙ. Έρχεται από το **σημερινό** halkidikiproperties.com —
//    γραμμένο από την εταιρεία, εγκεκριμένο, σε πολλές γλώσσες. Δεν γράφω εγώ τι λέει
//    η εταιρεία του George.
//
// 🌍 ΕΦΕΔΡΕΙΑ ΓΛΩΣΣΑΣ: αν λείπει η μετάφραση, πέφτουμε στα **αγγλικά**, όχι στα ελληνικά.
//    Ο Γερμανός που δεν έχει γερμανικό κείμενο διαβάζει αγγλικά· ελληνικά δεν διαβάζει.
//
// ⛔ ΜΗΝ βάλεις εδώ σελίδα χωρίς πραγματικό κείμενο. Μια σελίδα «Σύντομα κοντά σας»
//    είναι χειρότερη από 404: ο επισκέπτης έχασε τον χρόνο του ΚΑΙ δεν έμαθε τίποτα.
// ═══════════════════════════════════════════════════════════════════════════
import { prefix, SLUG, type Lang } from './i18n';

export type Block =
  | { kind: 'text'; h?: string; p: string[] }
  | { kind: 'list'; h?: string; items: { t: string; d?: string }[] }
  | { kind: 'facts'; h?: string; items: { t: string; d: string }[] };

export type PageContent = {
  title: string;          // <title> — ό,τι βλέπει η καρτέλα του browser
  h1: string;
  lead?: string;          // η πρώτη παράγραφος, μεγαλύτερη
  blocks: Block[];
  /** Κλείσιμο με κάλεσμα: τηλέφωνο, λίστα ακινήτων, ή εγγραφή. */
  cta?: { label: string; to: 'list' | 'phone' | 'login' | 'sell' };
};

/** Τα κλειδιά είναι ΚΑΙ οι διευθύνσεις — ένα προς ένα με ό,τι συνδέουν τα components. */
export const PAGE_KEYS = [
  'about', 'contact', 'halkidiki', 'partners', 'projects', 'sell', 'services',
  'services/buyers', 'services/developers', 'services/investors', 'services/owners',
  'team',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/**
 * 🪤 ΤΟ `projects` ΕΧΕΙ **ΜΕΤΑΦΡΑΣΜΕΝΟ** SLUG (`/εργα`, `/проекти`, `/projeler`…) ενώ τα
 *    υπόλοιπα όχι. Έτσι το έφτιαξε το `SLUG` του `i18n.ts` και έτσι το συνδέει το
 *    `projectsUrl()`. Δεχόμαστε **και τα δύο** και στέλνουμε μόνιμη ανακατεύθυνση στο
 *    μεταφρασμένο — αλλιώς η ίδια σελίδα ζει σε δύο διευθύνσεις και η μία μένει σπασμένη.
 */
export const TRANSLATED_SLUG: PageKey[] = ['projects'];

type Dict = Partial<Record<Lang, PageContent>>;

// ── ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ────────────────────────────────────────────────────────
// Ζει σε ΞΕΧΩΡΙΣΤΟ αρχείο (`pages-content.ts`) γιατί είναι ~100 KB κειμένου της
// εταιρείας. Εδώ μένει μόνο η λογική — έτσι μια διόρθωση κειμένου δεν αγγίζει
// κώδικα, και το git diff διαβάζεται.
//
// Ό,τι δεν έχει κείμενο ΔΕΝ εμφανίζεται: το `pageContent()` γυρίζει `null`, ο
// δρομολογητής δίνει κανονικό 404 με τη φιλική σελίδα, και τα μενού κρύβουν τον
// σύνδεσμο (`pageExists`). Ποτέ κενή σελίδα με τίτλο, ποτέ νεκρός σύνδεσμος.
import { CONTENT } from './pages-content';

/** Το περιεχόμενο της σελίδας στη γλώσσα του επισκέπτη, ή `null` αν δεν υπάρχει. */
export function pageContent(key: PageKey, lang: Lang): PageContent | null {
  const d = CONTENT[key];
  if (!d) return null;
  return d[lang] ?? d.en ?? d.el ?? null;
}

/** Υπάρχει η σελίδα σε ΚΑΠΟΙΑ γλώσσα; Κρίνει αν μπαίνει σε μενού και sitemap. */
export function pageExists(key: PageKey): boolean {
  const d = CONTENT[key];
  return !!d && Object.keys(d).length > 0;
}

/**
 * English URLs that moved to the old site's addresses (info pages, src/content/pages/en).
 * The English version of these keys IS the info page: canonical, hreflang, fallback
 * canonical and sitemap all point here, never at the 301 (`/en/about` → `/en/about-us`).
 */
export const EN_URL: Partial<Record<PageKey, string>> = {
  about: '/en/about-us',
  partners: '/en/our-partners',
  'services/buyers': '/en/services/buyer-services',
  'services/owners': '/en/services/seller-services',
  'services/investors': '/en/services/investor-services',
  'services/developers': '/en/services/construction-services',
  projects: '/en/construction',
};

/** #262 (D-20261112-SS-1): Greek has its info pages at George's Greek URLs; the old routes 301 there. */
export const EL_URL: Partial<Record<PageKey, string>> = {
  about: '/about-us',
  contact: '/επικοινωνια',
  partners: '/συνεργατες',
  sell: '/πωληση',
  services: '/υπηρεσιες',
  'services/buyers': '/υπηρεσιες/υπηρεσιες-αγοραστων',
  'services/owners': '/υπηρεσιες/για-πωλητες',
  'services/investors': '/υπηρεσιες/υπηρεσιες-για-επενδυτες',
  'services/developers': '/υπηρεσιες/υπηρεσιες-κατασκευαστες',
  projects: '/κατασκευες',
};

/** URL of a content page in a language — one rule for the router, the page head and the sitemap (B-16). */
export function contentUrl(key: PageKey, l: Lang): string {
  if (l === 'en' && EN_URL[key]) return EN_URL[key]!;
  if (l === 'el' && EL_URL[key]) return EL_URL[key]!;
  return `${prefix(l)}/${key === 'projects' ? SLUG[l].projects : key}`;
}

/** Ποιες γλώσσες έχουν ΔΙΚΟ ΤΟΥΣ κείμενο — για τα hreflang, χωρίς ψέματα. */
export function pageLangs(key: PageKey): Lang[] {
  const d = CONTENT[key];
  return d ? (Object.keys(d) as Lang[]) : [];
}


