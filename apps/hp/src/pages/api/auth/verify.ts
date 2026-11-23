// ═══════════════════════════════════════════════════════════════════════════
// ΒΗΜΑ 2 — «να τα έξι ψηφία»
//
// Το EALIDA επιστρέφει εισιτήριο· εδώ γίνεται cookie ΤΟΥ ΔΙΚΟΥ ΜΑΣ τομέα.
//
// 🔒 ΓΙΑΤΙ ΤΟ ΓΡΑΦΟΥΜΕ ΕΜΕΙΣ ΚΑΙ ΔΕΝ ΠΡΟΩΘΟΥΜΕ ΤΟ `Set-Cookie` ΤΟΥ API
//    Το API ζει σε άλλο όνομα (`api:3020`, μέσα στο δίκτυο). Ένα `Set-Cookie` από
//    εκεί δεν ισχύει για το `hp.rewize.app` — ο φυλλομετρητής θα το αγνοούσε
//    σιωπηλά και ο χρήστης θα έμπαινε… και θα ξαναέβγαινε αμέσως.
//
// 🪤 ΤΟ COOKIE ΠΡΕΠΕΙ ΝΑ ΕΙΝΑΙ HttpOnly. Στο παλιό site το γράφει JavaScript του
//    φυλλομετρητή (`ealida-adapter.js:306`) — δηλαδή ένα XSS κλέβει εισιτήριο 30
//    ημερών. Εδώ δεν το αγγίζει καμία JavaScript: το γράφει ο διακομιστής και το
//    διαβάζει ο διακομιστής (`viewerOf()` → `Astro.cookies`).
//
// ⚠️ ΤΑ ΜΗΝΥΜΑΤΑ ΛΑΘΟΥΣ ΕΡΧΟΝΤΑΙ ΕΤΟΙΜΑ ΣΤΑ ΕΛΛΗΝΙΚΑ ΑΠΟ ΤΟ EALIDA
//    («Λάθος κωδικός. Απομένουν 2 προσπάθειες.», «Ο κωδικός δεν ισχύει πια.»,
//     «Ο λογαριασμός έχει ανασταλεί.») — τα δείχνουμε ΑΥΤΟΥΣΙΑ. Είναι ο μόνος
//    τρόπος να καταλάβει ο άνθρωπος τι έγινε· μια δική μας γενίκευση θα το έκρυβε.
// ═══════════════════════════════════════════════════════════════════════════
import { crmError } from '../../../lib/crmerror';
import type { APIRoute } from 'astro';
import { forwardIp } from '../../../lib/clientip';
import { isHttps, originHeader } from '../../../lib/origin';

/** Δες `request.ts` — λίστα αποκλεισμού: άγνωστη προέλευση ΑΝΟΙΓΕΙ, κενή κλείνει. */
/**
 * 🔴 Η ΠΡΟΕΛΕΥΣΗ ΠΟΥ ΣΤΕΛΝΟΥΜΕ ΣΤΟ EALIDA — ΔΥΟ ΛΑΘΗ ΣΕ ΜΙΑ ΩΡΑ, 6/8.
 *
 * ΛΑΘΟΣ 1: `new URL(request.url).origin`. Πίσω από Cloudflare δίνει τον ΕΣΩΤΕΡΙΚΟ
 *   host (`http://localhost:4331`) — όχι το `hp.rewize.app`.
 * ΛΑΘΟΣ 2: εφεδρική τιμή `https://unknown.invalid`, με τη σκέψη «άγνωστο = κλειστό».
 *   **ΕΙΝΑΙ ΑΚΡΙΒΩΣ ΑΝΑΠΟΔΑ.** Μετρήθηκε ζωντανά στο API:
 *       Origin: https://hp.rewize.app   → signup_closed   ✅
 *       Origin: https://unknown.invalid → ΑΝΟΙΧΤΟ          ❌
 *       (καμία κεφαλίδα Origin)         → signup_closed   ✅
 *   Το φρένο είναι **λίστα αποκλεισμού**: κλειδώνει ΜΟΝΟ όσες προελεύσεις είναι
 *   γραμμένες. Κάθε άγνωστη περνά. Άρα η ασφαλής εφεδρεία δεν είναι μια ψεύτικη
 *   διεύθυνση — είναι **να μη στείλουμε κεφαλίδα καθόλου**.
 *
 * Και οι δύο φορές το αποτέλεσμα ήταν το ίδιο: εγγραφή ανοιχτή σε οποιονδήποτε,
 * στο site που ο George είπε ρητά «μόνο δικοί μας λογαριασμοί». Στάλθηκαν και δύο
 * πραγματικά SMS σε επινοημένους αριθμούς.
 *
 * ⛔ ΜΗΝ ΕΠΙΣΤΡΕΨΕΙΣ ΠΟΤΕ «ασφαλή» ψεύτικη προέλευση εδώ. Κενό = κλειστό.
 * → Updated (B-20, checked 2026-10-13): the CRM gate is no longer a block list. In the CRM code
 *   (signup-gate.ts `signupAllowed`, clone dcbca61) `MEMBER_SIGNUP_OPEN_ORIGINS` lists the OPEN
 *   hosts; empty list or unknown origin = closed; `MEMBER_SIGNUP_CLOSED_ORIGINS` is legacy and
 *   only logs a warning. The rule above (no made-up origin) stays right under both models.
 */
// originHeader() moved to lib/origin.ts (shared by every proxy, B-03/B-19) — same code.

export const prerender = false;

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

/** 30 ημέρες — όσο και το εισιτήριο. Η ανάκληση δεν εξαρτάται από αυτό: το
 *  επίπεδο διαβάζεται από τη βάση σε κάθε κλήση, οπότε ισχύει αμέσως. */
const MAX_AGE = 60 * 60 * 24 * 30;

export const POST: APIRoute = async ({ request, cookies, url, clientAddress }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* κενό → πέφτει στον έλεγχο */ }

  const rawId = String(body.identifier ?? body.email ?? '').trim().slice(0, 120);
  const identifier = rawId.includes('@') ? rawId.toLowerCase() : rawId;
  // Κρατάμε ΜΟΝΟ ψηφία: ο χρήστης μπορεί να επικολλήσει «481 902» από το SMS.
  const code = String(body.code ?? '').replace(/\D/g, '').slice(0, 6);

  if (!identifier || code.length !== 6) {
    return json({ ok: false, code: 'code_len' });
  }

  try {
    const r = await fetch(`${API}/site/member/verify-code`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...originHeader(request, url),
        // Εδώ μετράει περισσότερο απ' οπουδήποτε: αυτή είναι η πόρτα όπου δοκιμάζονται
        // κωδικοί. Δες `lib/clientip.ts`.
        ...forwardIp(request, clientAddress),
      },
      // CRM #495: the sign-up role (buy | sell | agent); the CRM ignores any other value and writes it only at birth.
      body: JSON.stringify({ identifier, code, intent: ['buy', 'sell', 'agent'].includes(String(body.intent)) ? String(body.intent) : undefined }),
      signal: AbortSignal.timeout(12000),
    });
    const b = await r.json().catch(() => ({}));

    // Πολλοί λογαριασμοί στο ίδιο κινητό: ΔΕΝ δίνεται εισιτήριο μέλους ακόμη.
    // (Ο George όρισε 6/8 ότι κινητό και e-mail γίνονται μοναδικά· αυτό μένει ως
    //  εφεδρεία για τα διπλά που ΥΠΑΡΧΟΥΝ ήδη, μέχρι να γίνει το merge.)
    if (Array.isArray(b?.choose) && b.choose.length) {
      return json({ ok: false, needEmail: true, code: 'need_email' });
    }
    if (!r.ok || !b?.token) {
      return json({ ok: false, ...crmError(r.status, b, 'code_bad') });
    }

    cookies.set('member_token', String(b.token), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      // 🪤 ΜΟΝΟ σε https. Σε τοπική ανάπτυξη (http) ένα `Secure` cookie αγνοείται
      //    σιωπηλά και η σύνδεση δεν «κολλάει» ποτέ — ώρες ψαξίματος για το τίποτα.
      // B-05: url.protocol is "http:" behind the tunnel — isHttps() also reads PUBLIC_ORIGIN / x-forwarded-proto.
      secure: isHttps(request, url),
      maxAge: MAX_AGE,
    });

    return json({
      ok: true,
      name: typeof b.name === 'string' ? b.name : '',
      // Τι λείπει από την επαφή. Κενό = πλήρης, πάει κατευθείαν στη δουλειά του.
      needs: Array.isArray(b?.needs) ? b.needs.map(String) : [],
    });
  } catch {
    return json({ ok: false, code: 'offline' });
  }
};

// B-15: the site's own errors go out as a `code`; the page shows its translation (all 9 languages).
// A `message` is only the CRM's own text, passed through unchanged.
function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
