// ═══════════════════════════════════════════════════════════════════════════
// ΤΑ ΚΕΙΜΕΝΑ ΤΟΥ CMS — ΕΠΙΣΤΡΩΣΗ πάνω από το λεξικό, όχι αντικατάσταση.
//
// `GET /site/content?site=hp` → 189 κλειδιά × 9 γλώσσες, δημοσιευμένα (5/8).
//
// 🪤 ΚΑΛΟΥΣΑ ΛΑΘΟΣ ΔΙΕΥΘΥΝΣΗ. Ρωτούσα το `/site/cms`, που είναι τα ΑΡΘΡΑ (faq,
//    ομάδα) — γύριζε `[]` επειδή δεν έχουμε άρθρα, και συμπέρανα «το CMS είναι
//    άδειο, δεν μπορώ να συνδέσω τίποτα». Ήταν γεμάτο όλη την ώρα.
//    📌 Δίδαγμα: «γυρίζει άδειο» ≠ «δεν υπάρχει». Πρώτα επαλήθευσε ΠΟΙΟ endpoint.
//
// ⚠️ ΤΙ ΚΑΝΕΙ ΚΑΙ ΤΙ ΔΕΝ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ
//    ΔΕΝ αντικαθιστά το `lib/i18n.ts`. Το site έχει **148 δικά του κλειδιά** που
//    χρησιμοποιούνται σε 1.332 σημεία, και από αυτά κρίνεται και ποιες γλώσσες
//    δηλώνονται στα hreflang (`PUBLISHED`). Αν γύριζαν όλα στο CMS, μια κενή
//    μετάφραση θα **ξε-δημοσίευε γλώσσα** σιωπηλά.
//    Εδώ γίνεται μόνο ΕΠΙΣΤΡΩΣΗ: όπου το CMS έχει τιμή, υπερισχύει· αλλιώς μένει
//    το λεξικό. Η πλήρης μεταφορά είναι ξεχωριστή απόφαση.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from './i18n';
import { brand } from '../brand/index';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

type Payload = {
  t?: Partial<Record<Lang, Record<string, string>>>;
  /** Θέσεις εικόνων: `hero.main`, `og.default`, `coll.sea|pool|land|top`.
      Σήμερα `{}` — γεμίζει μόνο του μόλις ανέβει η πρώτη εικόνα. */
  media?: Record<string, { url?: string; focal?: { x?: number; y?: number } }>;
};

let cache: { at: number; data: Payload } | null = null;
const TTL = 60_000;
let inflight: Promise<Payload> | null = null;

async function load(): Promise<Payload> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  if (inflight) return inflight;
  inflight = fetch(`${API}/site/content?site=${brand.key}`, { signal: AbortSignal.timeout(4000) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: Payload) => { cache = { at: Date.now(), data: d ?? {} }; return cache.data; })
    // Το CMS κάτω ΔΕΝ αδειάζει τη σελίδα: γυρνάμε ό,τι είχαμε, αλλιώς κενό —
    // και κάθε καλών έχει δική του εφεδρεία από το λεξικό.
    .catch(() => cache?.data ?? {})
    .finally(() => { inflight = null; });
  return inflight;
}

/** Η τιμή του CMS για ένα κλειδί, ή `null` αν δεν υπάρχει/είναι κενή. */
export async function cmsText(lang: Lang, key: string): Promise<string | null> {
  const d = await load();
  const v = d.t?.[lang]?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Εικόνα από θέση του CMS.
 * 🪤 ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΕΣ ΚΛΙΜΑΚΕΣ ΓΙΑ ΤΟ ΣΗΜΕΙΟ ΕΣΤΙΑΣΗΣ: το CMS δίνει 0–1, το
 *    site δουλεύει σε 0–100 (`lib/hero.ts`). Χωρίς μετατροπή, focal 0,42 θα
 *    γινόταν «0,42%» — δηλαδή το κάδρο θα κολλούσε στην αριστερή άκρη σε κάθε
 *    κινητό, και θα έμοιαζε με λάθος φωτογραφία αντί για λάθος αριθμό.
 */
export async function cmsImage(slot: string): Promise<{ url: string; focal: { x: number; y: number } } | null> {
  const d = await load();
  const m = d.media?.[slot];
  const url = typeof m?.url === 'string' ? m.url.trim() : '';
  if (!url) return null;
  const to100 = (v: unknown, fb: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fb;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);   // 0–1 → 0–100
  };
  return { url, focal: { x: to100(m?.focal?.x, 50), y: to100(m?.focal?.y, 50) } };
}
