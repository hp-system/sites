// ═══════════════════════════════════════════════════════════════════════════
// ΦΩΤΟΓΡΑΦΙΕΣ — οι εγκεκριμένοι κανόνες, σε κώδικα.
//
// ΤΟ ΣΗΜΑΝΤΙΚΟ: το site δεν αποθηκεύει ΚΑΜΙΑ εικόνα. Όλα ζουν ήδη στο R2 και
// σερβίρονται από το media.onsea.gr μέσω του edge. Εδώ χτίζουμε μόνο URL.
//
// ΤΟ «w» ΣΗΜΑΙΝΕΙ WATERMARK, ΟΧΙ WIDTH (επαληθεύτηκε 27/7):
//   χωρίς επίθεμα = καθαρό 1920 · _800 · _400 · _150   → ΚΑΘΑΡΕΣ
//   _1920w · _800w · _400w                              → ΜΕ ΥΔΑΤΟΓΡΑΦΗΜΑ
//
// ⚖️ Ο ΚΑΝΟΝΑΣ ΤΗΣ ΥΔΑΤΟΓΡΑΦΗΣΗΣ — ΔΙΟΡΘΩΘΗΚΕ 29/7 (George, ρητά):
//   Το κριτήριο ΔΕΝ είναι το μέγεθος. Είναι **τι δείχνει η φωτογραφία**.
//
//     ΑΚΙΝΗΤΟ  → υδατογράφημα ΠΑΝΤΟΥ, «ειδικά στις μεγάλες». Εκεί ακριβώς
//                αξίζει η κλοπή, εκεί χρειάζεται η προστασία.
//     ΤΟΠΙΟ    → καθαρή. Οι generic φωτογραφίες (hero αρχικής, τοπία) δεν
//                δείχνουν εμπόρευμα· το σήμα εκεί μόνο χαλάει την εικόνα.
//
//   🪤 Ως τις 29/7 ο κανόνας ήταν γραμμένος ΑΝΑΠΟΔΑ («καμία υδατογράφηση σε
//      μεγάλη φωτογραφία») και το ακίνητο της εβδομάδας — η μεγαλύτερη
//      φωτογραφία ακινήτου της σελίδας, 1920px — σερβιριζόταν ΚΑΘΑΡΟ.
// ═══════════════════════════════════════════════════════════════════════════
import type { Attrs } from './api';

export type Photo = {
  url: string;
  tag?: string | null;
  alt?: Record<string, string> | string | null;
  /** σημείο εστίασης 0-100· αν λείπει → κέντρο */
  focal?: { x: number; y: number } | null;
};

/** Ετικέτες που επιτρέπεται να γίνουν εξώφυλλο, κατά σειρά προτίμησης. */
const COVER_PRIORITY = [
  'view_sea', 'view_beach', 'exterior_aerial', 'land_aerial', 'view_panoramic',
  'view_sunset', 'exterior_pool', 'exterior_facade', 'exterior_terrace', 'exterior_garden',
] as const;

const COVER_OK = new Set<string>(COVER_PRIORITY);

export function photosOf(a: Attrs): Photo[] {
  const raw = a?.photos ?? a?.images ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: any) => (typeof x === 'string' ? { url: x } : { url: x?.url, tag: x?.tag, alt: x?.alt, focal: x?.focal }))
    .filter((p: Photo) => !!p.url);
}

/**
 * ΚΑΝΟΝΑΣ ΕΞΩΦΥΛΛΟΥ — χρειάζεται και τα δύο, μετρήθηκε γιατί:
 *  · στο ακίνητο 1739 η ετικέτα «view_sea» έδειχνε πρόσοψη (λάθος ετικέτα AI)
 *  · στο 7729 ο μεσίτης είχε βάλει σαλόνι πρώτο (λάθος ανθρώπινη επιλογή)
 * Άρα: πρώτα η επιλογή του μεσίτη, ΑΛΛΑ μόνο αν είναι εξωτερική/θέα.
 * Αλλιώς, η πρώτη κατά σειρά προτεραιότητας ετικέτας.
 */
export function coverOf(a: Attrs): Photo | null {
  const ph = photosOf(a);
  if (!ph.length) return null;
  const brokerChoice = ph[0];
  if (brokerChoice.tag && COVER_OK.has(brokerChoice.tag)) return brokerChoice;
  for (const t of COVER_PRIORITY) {
    const hit = ph.find((p) => p.tag === t);
    if (hit) return hit;
  }
  return brokerChoice;   // δεν υπάρχει τίποτα κατάλληλο — καλύτερα κάτι παρά τίποτα
}

/**
 * Η ΣΕΙΡΑ ΤΩΝ ΦΩΤΟΓΡΑΦΙΩΝ — εξώφυλλο πρώτο, μετά οι υπόλοιπες όπως ήρθαν.
 *
 * 🪤 ΓΙΑΤΙ ΖΕΙ ΕΔΩ ΚΑΙ ΟΧΙ ΜΕΣΑ ΣΤΗ ΣΕΛΙΔΑ. Η κλειδωμένη φωτογραφία ζητιέται με
 *    **αύξοντα αριθμό** (`/api/blur/7838/5.jpg`). Αν η σελίδα και ο διακομιστής
 *    ταξινομούσαν αλλιώς, το νούμερο 5 θα έδειχνε σε ΑΛΛΗ φωτογραφία — δηλαδή
 *    θα έβγαινε θολή εικόνα άσχετη με τη θέση της, και κανείς δεν θα το πρόσεχε
 *    γιατί όλες είναι θολές. Μία συνάρτηση, δύο καλούντες, καμία απόκλιση.
 */
export function orderedPhotos(a: Attrs): Photo[] {
  const ph = photosOf(a);
  const cover = coverOf(a);
  return cover ? [cover, ...ph.filter((p) => p.url !== cover.url)] : ph;
}

/**
 * ΠΟΣΕΣ ΦΩΤΟΓΡΑΦΙΕΣ ΕΙΝΑΙ ΑΝΟΙΧΤΕΣ ΣΤΟΝ ΜΗ ΕΓΓΕΓΡΑΜΜΕΝΟ.
 *
 * ⏭️ ΠΡΟΣΩΡΙΝΟ. Ο George αποφάσισε 6/8 ότι η επιλογή «ανοιχτή / κλειστή» θα
 *    γίνεται **ανά φωτογραφία, από εμάς, στο photo review του EALIDA»**. Το
 *    πεδίο δεν υπάρχει ακόμα (το φτιάχνει η συνεδρία «Φωτογραφίες» — δικό της
 *    το photo domain, ΔΕΝ το πειράζω εγώ).
 *    Μέχρι τότε ισχύει η προηγούμενη ρητή οδηγία του (30/7): «να τους δείχνουμε
 *    **τις τέσσερις** και πάντοτε να τους λες: έχεις επιπλέον φωτογραφίες, κάνε
 *    δωρεάν εγγραφή». Άρα σήμερα δεν αλλάζει τίποτα — απλώς δεν περιμένει.
 *
 * Όταν έρθει το πεδίο: αν η φωτογραφία φέρει `open: true/false`, αυτό υπερισχύει
 * και το `FREE_PHOTOS` μένει μόνο ως εφεδρεία για όσες δεν κρίθηκαν ακόμα.
 */
export const FREE_PHOTOS = 4;

export function isPhotoOpen(p: Photo, index: number): boolean {
  const flag = (p as Photo & { open?: unknown }).open;
  if (typeof flag === 'boolean') return flag;
  return index < FREE_PHOTOS;
}

/**
 * Η διεύθυνση της ΚΑΤΕΣΤΡΑΜΜΕΝΗΣ εκδοχής — δες `lib/blur.ts` για το γιατί.
 * Δεν περιέχει πουθενά τη διεύθυνση της πραγματικής φωτογραφίας.
 */
export function blurSrc(ref: string, index: number): string {
  return `/api/blur/${encodeURIComponent(ref)}/${index}.jpg`;
}

/**
 * «ΕΤΟΙΜΟ ΓΙΑ ΜΕΓΑΛΗ ΘΕΣΗ» — η δικλείδα.
 * Ακίνητο μπαίνει σε hero ή full-bleed ΜΟΝΟ αν έχει εξωτερική φωτό ή θέα.
 * Αλλιώς δεν προτείνεται καν — δεν ξαναβρίσκουμε μπάνιο σε ακίνητο 1.150.000 €.
 */
export function heroReady(a: Attrs): boolean {
  const c = coverOf(a);
  return !!(c?.tag && COVER_OK.has(c.tag));
}

/** Καθαρή εκδοχή — για μεγάλες φωτογραφίες (hero, ακίνητο της εβδομάδας). */
// 🪤 ΤΑ ΜΟΝΑ ΜΕΓΕΘΗ ΠΟΥ ΥΠΑΡΧΟΥΝ ΚΑΘΑΡΑ ΣΤΟ R2. Μετρήθηκε 27/7:
//    (σκέτο) 200 · _400 200 · _800 200 · _1200 404 · _1920 404
//    Το «w» στο τέλος σημαίνει ΥΔΑΤΟΓΡΑΦΗΜΕΝΟ, όχι πλάτος — δες marked().
const CLEAN_SIZES = [400, 800] as const;
export type CleanSize = (typeof CLEAN_SIZES)[number];

/**
 * Καθαρή εικόνα (χωρίς υδατογράφημα) — για hero και full-bleed.
 *
 * 🛡️ ΔΙΚΛΕΙΔΑ: αν ζητηθεί μέγεθος που ΔΕΝ υπάρχει, γυρίζει την πλήρη εικόνα
 *    αντί για URL που θα δώσει 404. Χωρίς αυτό, ένα `1200` σε `srcset` άφηνε
 *    ΚΕΝΟ το hero και το μεγάλο ακίνητο στο κινητό — ο browser ΔΕΝ επιστρέφει
 *    στο `src` όταν αποτύχει υποψήφιο του srcset.
 */
/**
 * WebP / AVIF through Cloudflare Image Transformations (SEO audit 2026-11-10: about 500 KB of JPEG on the home
 * page, LCP 4.4 s on mobile). Off unless the deployment sets PHOTO_FORMAT_AUTO=1, which is done only after
 * Transformations are enabled on the zone of media.onsea.gr (George's Cloudflare). The source stays the same
 * file (the watermarked `_800w` for a card), so the watermark and the size are unchanged; only the format
 * follows the browser's Accept header. The share image (og:image) never goes through it: crawlers want JPEG.
 */
const FORMAT_AUTO = typeof process !== 'undefined' && process.env?.PHOTO_FORMAT_AUTO === '1';
const CDN_HOST = /^(https:\/\/media\.onsea\.gr)\/(?!cdn-cgi\/)(.+)$/;
export function viaCdn(u: string): string {
  if (!FORMAT_AUTO || !u) return u;
  const m = u.match(CDN_HOST);
  return m ? `${m[1]}/cdn-cgi/image/format=auto,quality=82/${m[2]}` : u;
}

export function clean(url: string, size?: number): string {
  return viaCdn(cleanRaw(url, size));
}
function cleanRaw(url: string, size?: number): string {
  if (!url) return '';
  const ok = size && (CLEAN_SIZES as readonly number[]).includes(size);
  return encodeURI(ok ? url.replace(/\.(jpe?g|png)$/i, (m) => `_${size}${m}`) : url);
}

/** srcset για μεγάλη ΚΑΘΑΡΗ εικόνα — μόνο μεγέθη που υπάρχουν. */
export function cleanSrcSet(url: string): string {
  if (!url) return '';
  return `${clean(url, 400)} 400w, ${clean(url, 800)} 800w, ${clean(url)} 1920w`;
}

/**
 * Το ΙΔΙΟ srcset ΧΩΡΙΣ το 1920 — για μικρές οθόνες.
 *
 * 🪤 Με `sizes="100vw"` και υποψήφιο 1920w, ένα κινητό **DPR3** (κάθε iPhone Pro)
 *    υπολογίζει 390 × 3 = 1170 και διαλέγει το **1920w: 669 KB**. Μετρήθηκε
 *    LCP **4.405 ms σε Slow 4G** — κόκκινο Core Web Vital, από μία εικόνα.
 *    Το 800w σε οθόνη 390 CSS px είναι ήδη 2× η φυσική πυκνότητα· η διαφορά
 *    δεν φαίνεται, το μισό δευτερόλεπτο φαίνεται.
 * ℹ️ Και μια αλήθεια για το «1920»: το AI output είναι **1536px** και το 1920
 *    παράγεται με upscale — δηλαδή είναι μεγαλύτερο αρχείο ΧΩΡΙΣ περισσότερη
 *    πληροφορία. Εκκρεμεί απόφαση για τα μεγέθη του αγωγού.
 */
export function cleanSrcSetSmall(url: string): string {
  if (!url) return '';
  return `${clean(url, 400)} 400w, ${clean(url, 800)} 800w`;
}

/** Υδατογραφημένη εκδοχή — για κάρτες και πλακίδια. */
export function marked(url: string, size: 400 | 800 | 1920 = 800): string {
  return viaCdn(markedRaw(url, size));
}
function markedRaw(url: string, size: 400 | 800 | 1920 = 800): string {
  if (!url) return '';
  return encodeURI(url.replace(/\.(jpe?g|png)$/i, (m) => `_${size}w${m}`));
}

/** srcset για κάρτα: δύο πλάτη, υδατογραφημένα. */
export function cardSrcSet(url: string): string {
  return `${marked(url, 400)} 400w, ${marked(url, 800)} 800w`;
}

/**
 * ΜΕΓΑΛΗ ΦΩΤΟΓΡΑΦΙΑ ΑΚΙΝΗΤΟΥ — υδατογραφημένη, και στα τρία πλάτη.
 * Το `_1920w` επαληθεύτηκε 29/7 ότι υπάρχει στο R2 (200, 554 KB).
 */
export function markedSrcSet(url: string): string {
  if (!url) return '';
  return `${marked(url, 400)} 400w, ${marked(url, 800)} 800w, ${marked(url, 1920)} 1920w`;
}

/**
 * Το ίδιο ΧΩΡΙΣ το 1920 — για μικρές οθόνες. Ίδιος λόγος με το
 * `cleanSrcSetSmall`: με `sizes="100vw"` ένα DPR3 κινητό ζητά 1170px και
 * κατεβάζει το πλήρες αρχείο μισού megabyte για οθόνη 390 CSS px.
 */
export function markedSrcSetSmall(url: string): string {
  if (!url) return '';
  return `${marked(url, 400)} 400w, ${marked(url, 800)} 800w`;
}

/**
 * ΕΙΚΟΝΑ ΚΟΙΝΟΠΟΙΗΣΗΣ (og:image / twitter:image) — Η ΜΟΝΗ ΣΩΣΤΗ ΠΗΓΗ.
 *
 * 🪤 ΓΙΑΤΙ ΥΠΑΡΧΕΙ ΞΕΧΩΡΙΣΤΗ ΣΥΝΑΡΤΗΣΗ. Στις 29/7 μπήκε ο έλεγχος «τοπίο ή ακίνητο»
 *    στο `Hero.astro` — αλλά το **δίδυμό του**, το `og:image` δύο αρχεία δίπλα, έμεινε
 *    σκέτο `clean()`. Δηλαδή η σελίδα θα σέρβιρε σωστά υδατογραφημένο hero, ενώ κάθε
 *    κοινοποίηση του συνδέσμου σε WhatsApp/Viber/Facebook θα μοίραζε το **καθαρό
 *    πρωτότυπο 1920** του ίδιου ακινήτου. Ο έλεγχος σε δύο σημεία ξεχνιέται· εδώ
 *    ζει μία φορά και τον καλούν όλοι.
 *
 * 📏 ΚΑΙ ΤΟ ΜΕΓΕΘΟΣ ΕΧΕΙ ΣΗΜΑΣΙΑ: το og:image έδειχνε στο πλήρες αρχείο — **684 KB**.
 *    WhatsApp/Viber/Telegram κόβουν την προεπισκόπηση γύρω στα 300 KB, άρα ο σύνδεσμος
 *    που μοιράζει ο George εμφανιζόταν πιθανότατα **χωρίς καμία εικόνα**. Το ίδιο καρέ
 *    σε `_800` είναι 156 KB και περνάει παντού.
 */
export const SHARE_W = 800;
export const SHARE_H = 533;

export function shareImage(p: Photo | null): string | undefined {
  if (!p?.url) return undefined;
  return p.tag === 'hero' ? cleanRaw(p.url, SHARE_W) : markedRaw(p.url, SHARE_W);   // always JPEG for crawlers
}

/**
 * ΣΗΜΕΙΟ ΕΣΤΙΑΣΗΣ — λύνει το «θέλει δεύτερο αρχείο σε άλλη κοπή» ΧΩΡΙΣ δεύτερο αρχείο.
 * Δύο αριθμοί στη βάση ανά φωτογραφία· η σελίδα κεντράρει με object-position.
 * Ένα JPEG, σωστό κάδρο σε κάθε οθόνη.
 */
export function focalStyle(p: Photo | null): string {
  const f = p?.focal;
  if (!f || typeof f.x !== 'number' || typeof f.y !== 'number') return '';
  return `--focal:${f.x}% ${f.y}%`;
}

/**
 * alt από τα δικά μας κείμενα — δώρο για την αναζήτηση εικόνων, και η
 * πλουσιότερη επιφάνεια λέξεων-κλειδιών που έχει η σελίδα.
 *
 * 🪤 ΙΔΙΑ ΠΑΓΙΔΑ ΜΕ ΤΟ `pick()`: η σειρά ήταν `alt[lang] || alt.el || alt.en`,
 *    δηλαδή **ελληνικά πριν από αγγλικά**. Επειδή το API δίνει alt μόνο για
 *    {el,en,de,sr,bg}, ο ρουμάνος/τούρκος/ισραηλινός/ρώσος επισκέπτης έπαιρνε
 *    **11 από τα 12 alt στα ελληνικά** — και μαζί τους όλες τις λέξεις-κλειδιά
 *    σε αλφάβητο που ούτε αυτός ούτε η Google της αγοράς του διαβάζει.
 * ✅ Η σειρά ακολουθεί τη ΓΡΑΦΗ, ίδια λογική με `pick()` και `municipalityOf`.
 */
const ALT_CYRILLIC = new Set(['bg', 'ru']);

export function altOf(p: Photo | null, lang: string, fallback: string): string {
  if (!p?.alt) return fallback;
  if (typeof p.alt === 'string') return p.alt;
  const own = p.alt[lang];
  if (own) return own;
  if (lang === 'el') return p.alt.el || p.alt.en || fallback;
  const chain = ALT_CYRILLIC.has(lang) ? [p.alt.bg, p.alt.en, p.alt.el] : [p.alt.en, p.alt.bg, p.alt.el];
  for (const c of chain) if (c) return c;
  return fallback;
}
