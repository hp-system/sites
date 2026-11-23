// ═══════════════════════════════════════════════════════════════════════════
// ΠΟΙΟΣ ΕΙΝΑΙ Ο ΣΥΝΔΕΔΕΜΕΝΟΣ — και ΤΙ ΕΠΙΠΕΔΟ ΕΧΕΙ.
//
// 🔴 ΩΣ ΤΙΣ 6/8 ΤΟ SITE ΔΕΝ ΤΟ ΡΩΤΟΥΣΕ ΠΟΤΕ. Το `viewerOf()` έβλεπε απλώς ότι
//    υπάρχει cookie και έλεγε «μέλος». Αυτό αρκούσε όσο υπήρχε ΕΝΑ επίπεδο —
//    αλλά τώρα υπάρχουν τρία, και δύο από αυτά δεν φαίνονται στο cookie:
//
//      exclusive → ακριβές σημείο, κρυφές τιμές, ultra secret
//      agent     → **βλέπει όσα ο ΑΝΩΝΥΜΟΣ ΕΠΙΣΚΕΠΤΗΣ**, παρότι είναι συνδεδεμένος
//
//    Χωρίς αυτή την κλήση, ένας μεσίτης που τον έκλεισε ο George θα έβλεπε
//    κανονικά περιοχές και φωτογραφίες — δηλαδή το κλείσιμο θα ήταν διακοσμητικό.
//
// ⛔ ΤΟ ΕΠΙΠΕΔΟ ΔΕΝ ΒΓΑΙΝΕΙ ΠΟΤΕ ΑΠΟ ΤΟ ΕΙΣΙΤΗΡΙΟ. Το ωφέλιμο φορτίο του JWT είναι
//    απλό base64 — ο καθένας γράφει `{"level":"exclusive"}`. Έρχεται ΜΟΝΟ από το
//    `GET /site/member/me`, που κατέχει το μυστικό και διαβάζει τη ΒΑΣΗ.
//    Ακριβώς γι' αυτό η ανάκληση ισχύει αμέσως: δεν υπάρχει τίποτα αποθηκευμένο
//    στον πελάτη που να λέει «είμαι exclusive».
//
// ⏱️ ΓΙΑΤΙ 30 ΔΕΥΤΕΡΟΛΕΠΤΑ ΜΝΗΜΗ ΚΑΙ ΟΧΙ ΠΕΡΙΣΣΟΤΕΡΑ
//    Είναι το πρακτικό όριο του «ισχύει αμέσως». Ο George πατά «κόψ' τον» και το
//    site το τηρεί μέσα σε μισό λεπτό. Με πέντε λεπτά μνήμη, ένας μεσίτης που του
//    αφαιρέθηκε η πρόσβαση θα συνέχιζε να βλέπει τοποθεσίες — και κανείς δεν θα
//    καταλάβαινε γιατί. Το EALIDA επίτηδες ΔΕΝ έχει δική του μνήμη εδώ.
// ═══════════════════════════════════════════════════════════════════════════
import type { Level } from './gate';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

export type Member = {
  email: string;
  name: string;
  phone: string;
  favorites: string[];
  level: Level;
  blocked: boolean;
  /** The role chosen at sign-up (D-20261105-SS-1): buyer · seller · agent (competitor) · partner (agent association).
   *  Read from the CRM's `role` when it sends one; until then a buyer, and an `agent` level counts as an agent. */
  role: Role;
  /** My details (CRM #496, `member/me` → preferences). `null` = an older CRM without them: the page keeps the browser copy. */
  preferences: Preferences | null;
};

export type Preferences = { gender: 'female' | 'male' | 'none' | null; contactWays: string[]; frequency: 'now' | 'day' | 'week' | 'never' };
const WAYS = new Set(['email', 'call', 'whatsapp', 'viber', 'sms']);
function prefsOf(v: any): Preferences | null {
  if (!v || typeof v !== 'object') return null;
  const g = v.gender === 'female' || v.gender === 'male' || v.gender === 'none' ? v.gender : null;
  const ways = Array.isArray(v.contactWays) ? v.contactWays.map(String).filter((w: string) => WAYS.has(w)) : ['email', 'whatsapp'];
  const f = ['now', 'day', 'week', 'never'].includes(v.frequency) ? v.frequency : 'week';
  return { gender: g, contactWays: ways, frequency: f };
}

export type Role = 'buyer' | 'seller' | 'agent' | 'partner';
export function roleOf(raw: unknown, level: Level): Role {
  const r = String(raw ?? '').toLowerCase();
  if (r === 'partner' || r === 'association') return 'partner';
  if (level === 'agent' || r === 'agent') return 'agent';
  if (r === 'seller' || r === 'both' || r === 'owner') return 'seller';
  return 'buyer';
}

const TTL = 30_000;
const MAX_ENTRIES = 500;                      // ένα ανά συνδεδεμένο θεατή· αρκετά
const cache = new Map<string, { at: number; m: Member | null }>();
const inflight = new Map<string, Promise<Member | null>>();

/** After a write (favourite added/removed) the next read must come from the CRM. */
export function forgetMember(token: string | undefined): void {
  if (token) cache.delete(token);
}

function remember(token: string, m: Member | null) {
  cache.set(token, { at: Date.now(), m });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * `null` σημαίνει «δεν είναι μέλος» — είτε δεν έχει εισιτήριο, είτε το εισιτήριο
 * δεν ισχύει πια (ανακλήθηκε, ανεστάλη, έληξε).
 *
 * 🪤 ΤΟ 401 ΔΕΝ ΕΙΝΑΙ ΣΦΑΛΜΑ, ΕΙΝΑΙ ΑΠΑΝΤΗΣΗ. Σημαίνει «αποσυνδέθηκε» και πρέπει
 *    να τον δείξουμε ως επισκέπτη. Αν το χειριζόμασταν σαν βλάβη και κρατούσαμε
 *    την παλιά απάντηση, η αναστολή λογαριασμού δεν θα ίσχυε ποτέ.
 * 🛡️ Αν πέσει το API (δίκτυο, timeout) κρατάμε ό,τι είχαμε: μια στιγμιαία διακοπή
 *    δεν πρέπει να πετάει έξω όλους τους συνδεδεμένους. Διαφορετικό από το 401.
 */
export async function memberOf(token: string | undefined): Promise<Member | null> {
  if (!token) return null;

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < TTL) return hit.m;

  const running = inflight.get(token);
  if (running) return running;

  const job = (async (): Promise<Member | null> => {
    try {
      const r = await fetch(`${API}/site/member/me`, {
        headers: { 'x-member-token': token, accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.status === 401 || r.status === 403) { remember(token, null); return null; }
      if (!r.ok) return hit?.m ?? null;                    // βλάβη → ό,τι είχαμε
      const b = await r.json();
      const lv = b?.level;
      const m: Member = {
        email: String(b?.email ?? ''),
        name: String(b?.name ?? ''),
        phone: String(b?.phone ?? ''),
        favorites: Array.isArray(b?.favorites) ? b.favorites.map(String) : [],
        // ΙΔΙΑ ΛΕΥΚΗ ΛΙΣΤΑ ΜΕ ΤΟ EALIDA: μόνο οι δύο ρητές λέξεις αλλάζουν κάτι.
        // Ό,τι άλλο (κενό, τυπογραφικό, παλιά τιμή) → `member`, ώστε καμία αστοχία
        // τιμής να μην κλειδώνει έξω τους 9.830 υπάρχοντες.
        level: lv === 'exclusive' ? 'exclusive' : lv === 'agent' ? 'agent' : 'member',
        blocked: b?.blocked === true,
        role: 'buyer',
        preferences: prefsOf(b?.preferences),
      };
      m.role = roleOf(b?.role, m.level);
      remember(token, m);
      return m;
    } catch {
      return hit?.m ?? null;
    } finally {
      inflight.delete(token);
    }
  })();

  inflight.set(token, job);
  return job;
}
