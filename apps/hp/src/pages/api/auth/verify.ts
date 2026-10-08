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
import type { APIRoute } from 'astro';
import { forwardIp } from '../../../lib/clientip';
import { requestHost } from '../../../lib/seo';

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
 */
function originHeader(request: Request, url: URL): Record<string, string> {
  // Ρητή ρύθμιση πρώτα: δεν εξαρτάται από κεφαλίδες που μπορεί να μην περάσει ο tunnel.
  const cfg = (import.meta.env.PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || '').trim();
  if (cfg) return { origin: cfg.replace(/\/$/, '') };
  const fwd = request.headers.get('x-forwarded-host');
  if (!fwd) return {};                       // ⇒ το EALIDA το θεωρεί κλειστό. Σωστά.
  const proto = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  return { origin: `${proto}://${requestHost(request, url)}` };
}

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
    return json({ ok: false, message: 'Βάλτε και τα έξι ψηφία.' });
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
      body: JSON.stringify({ identifier, code }),
      signal: AbortSignal.timeout(12000),
    });
    const b = await r.json().catch(() => ({}));

    // Πολλοί λογαριασμοί στο ίδιο κινητό: ΔΕΝ δίνεται εισιτήριο μέλους ακόμη.
    // (Ο George όρισε 6/8 ότι κινητό και e-mail γίνονται μοναδικά· αυτό μένει ως
    //  εφεδρεία για τα διπλά που ΥΠΑΡΧΟΥΝ ήδη, μέχρι να γίνει το merge.)
    if (Array.isArray(b?.choose) && b.choose.length) {
      return json({ ok: false, needEmail: true,
        message: 'Για αυτόν τον αριθμό χρειαζόμαστε και το email σας.' });
    }
    if (!r.ok || !b?.token) {
      return json({ ok: false, message: String(b?.message ?? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.') });
    }

    cookies.set('member_token', String(b.token), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      // 🪤 ΜΟΝΟ σε https. Σε τοπική ανάπτυξη (http) ένα `Secure` cookie αγνοείται
      //    σιωπηλά και η σύνδεση δεν «κολλάει» ποτέ — ώρες ψαξίματος για το τίποτα.
      secure: url.protocol === 'https:',
      maxAge: MAX_AGE,
    });

    return json({
      ok: true,
      name: typeof b.name === 'string' ? b.name : '',
      // Τι λείπει από την επαφή. Κενό = πλήρης, πάει κατευθείαν στη δουλειά του.
      needs: Array.isArray(b?.needs) ? b.needs.map(String) : [],
    });
  } catch {
    return json({ ok: false, message: 'Δεν έχουμε σύνδεση αυτή τη στιγμή. Δοκιμάστε ξανά.' });
  }
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
