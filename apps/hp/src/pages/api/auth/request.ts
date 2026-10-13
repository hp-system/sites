// ═══════════════════════════════════════════════════════════════════════════
// ΒΗΜΑ 1 — «στείλε μου κωδικό»
//
// Γέφυρα προς το EALIDA. Ο φυλλομετρητής ΔΕΝ μιλάει ποτέ απευθείας στο API:
// ζει σε άλλο δίκτυο, και το εισιτήριο πρέπει να γίνει cookie ΤΟΥ ΔΙΚΟΥ ΜΑΣ
// τομέα για να το διαβάζει ο διακομιστής μας σε κάθε σελίδα.
//
// 🪤 ΤΟ `signup_closed` ΕΙΝΑΙ 2xx, ΟΧΙ ΣΦΑΛΜΑ. Το φρένο του δοκιμαστικού
//    απαντά `{ok:false, reason:'signup_closed'}` με **επιτυχή** κωδικό κατάστασης,
//    ώστε να μη μπερδεύεται με το φρένο ταχύτητας (429). Αν ελέγχαμε μόνο τον
//    κωδικό κατάστασης, θα δείχναμε «σου στείλαμε κωδικό» σε κάποιον που ΔΕΝ
//    μπορεί καν να γραφτεί — και θα περίμενε για πάντα.
//
// 🔒 ΤΑΥΤΟΤΗΤΑ = EMAIL, ΠΑΡΑΔΟΣΗ = SMS. Μετρήθηκε 6/8 στη βάση: 9.830 μοναδικά
//    email με **μηδέν** διπλότυπα, αλλά **267 λογαριασμοί μοιράζονται 17 τηλέφωνα**
//    (γραφεία, ζευγάρια, οικογένειες). Με κλειδί το τηλέφωνο, 267 πραγματικοί
//    πελάτες δεν θα μπορούσαν να ταυτοποιηθούν. Το email ταυτοποιεί· ο κωδικός
//    πάει στο κινητό, όπως ζήτησε ο George.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { forwardIp } from '../../../lib/clientip';
import { originHeader } from '../../../lib/origin';

export const prerender = false;

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

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
// originHeader() moved to lib/origin.ts (shared by every proxy, B-03/B-19) — same code.

/** Καθαρίζει και ελέγχει, ΧΩΡΙΣ να «διορθώνει» — μια σιωπηλή διόρθωση κρύβει το λάθος. */
const clean = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Στοιχειώδης έλεγχος email. Ο αυστηρός γίνεται στο EALIDA· εδώ κόβουμε τα προφανή. */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Τηλέφωνο σε E.164. Δεχόμαστε ό,τι γράφει ο άνθρωπος (κενά, παύλες, παρενθέσεις,
 * `0030`) και το φέρνουμε σε μία μορφή.
 * 🪤 Το `00` είναι το διεθνές πρόθεμα κλήσης — γίνεται `+`. Μετρήθηκε 6/8: **και τα
 *    9.830** τηλέφωνα της βάσης ξεκινούν με `00`, οπότε η μετατροπή είναι ένα προς
 *    ένα, χωρίς καμία εικασία χώρας.
 */
/**
 * 🪤 ΔΕΥΤΕΡΟ ΔΙΧΤΥ, ΟΧΙ ΑΝΤΙΓΡΑΦΟ ΤΗΣ ΟΘΟΝΗΣ.
 *
 * Η οθόνη στέλνει πάντα πλήρη διεθνή αριθμό. Αλλά όποιος καλέσει αυτό το endpoint
 * απευθείας — δοκιμή, παλιός σελιδοδείκτης, άλλη φόρμα αύριο — με σκέτα δέκα ψηφία
 * έπαιρνε `+6977943773`: **ανύπαρκτος κωδικός χώρας**, άρα «δεν βρέθηκε λογαριασμός»
 * αντί για «λάθος αριθμός». Ο πελάτης θα νόμιζε ότι δεν τον ξέρουμε.
 *
 * Δεν μαντεύουμε χώρα γενικά — μόνο το ελληνικό κινητό, που είναι αναγνωρίσιμο
 * χωρίς αμφιβολία (`69` + 8 ψηφία) και είναι η κύρια αγορά μας.
 */
function e164(raw: string): string {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return '+' + d.slice(1).replace(/\D/g, '');
  if (d.startsWith('00')) return '+' + d.slice(2);
  const bare = d.replace(/\D/g, '');
  if (/^0?69\d{8}$/.test(bare)) return '+30' + bare.replace(/^0+/, '');
  if (/^3069\d{8}$/.test(bare)) return '+' + bare;
  return bare ? '+' + bare : '';
}

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* κενό σώμα → πέφτει στους ελέγχους */ }

  // ΕΝΑ αναγνωριστικό: e-mail Ή κινητό. Ο χρήστης διάλεξε ήδη ποιο, στην πρώτη
  // οθόνη — δεν μαντεύουμε. Το «@» απλώς επιβεβαιώνει ποιο μας έστειλε.
  const rawId = clean(body.identifier, 120);
  const isEmail = rawId.includes('@');
  const identifier = isEmail ? rawId.toLowerCase() : e164(rawId);
  const name = clean(body.name, 80);
  const intent = clean(body.intent, 20);

  if (isEmail && !EMAIL_OK.test(identifier)) return json({ ok: false, reason: 'bad_email' });
  // 🇬🇷 ΜΟΝΟ ΚΙΝΗΤΑ (George 6/8). Για την Ελλάδα ο κανόνας είναι καθαρός: 69 + 10
  //    ψηφία. Τον επιβάλλουμε ΠΡΙΝ φύγει αίτημα — κάθε λάθος SMS είναι χρήμα και
  //    ένας πελάτης που περιμένει κάτι που δεν έρχεται.
  //    ⚠️ Για τις άλλες οκτώ χώρες ΔΕΝ φτιάχνουμε δικό μας κανόνα: στη Γερμανία τα
  //       κινητά έχουν πολλά προθέματα, αλλού μοιράζονται εύρη με τα σταθερά. Ένας
  //       πρόχειρος κανόνας θα έκοβε έγκυρους Βούλγαρους και Σέρβους αγοραστές.
  //       Αποφασίζει ο πάροχος, και το λέμε καθαρά αν αποτύχει.
  if (!isEmail) {
    if (identifier.length < 9) return json({ ok: false, reason: 'bad_phone' });
    if (identifier.startsWith('+30') && !/^\+3069\d{8}$/.test(identifier)) {
      return json({ ok: false, reason: 'not_mobile' });
    }
  }

  try {
    const r = await fetch(`${API}/site/member/request-code`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Η ΠΡΟΕΛΕΥΣΗ ΚΡΙΝΕΙ ΤΟ ΦΡΕΝΟ ΕΓΓΡΑΦΗΣ. Χωρίς αυτήν, ο διακομιστής τη
        // θεωρεί «κλειστή» — σωστά, αλλά τότε δεν γράφεται ούτε ο George.
        ...originHeader(request, url),
        // 🔴 Η ΔΙΕΥΘΥΝΣΗ ΤΟΥ ΕΠΙΣΚΕΠΤΗ. Χωρίς αυτήν κάθε προσπάθεια φαινόταν να
        //    έρχεται από τον ΙΔΙΟ (τον διακομιστή μας) και το φρένο ανά διεύθυνση
        //    ήταν διακοσμητικό. Δες `lib/clientip.ts`.
        ...forwardIp(request, clientAddress),
      },
      body: JSON.stringify({ identifier, name: name || undefined, intent: intent || undefined }),
      signal: AbortSignal.timeout(12000),
    });

    // 429 = φρένο ταχύτητας. Περνάμε τα δευτερόλεπτα ώστε να δείξουμε αντίστροφη μέτρηση.
    if (r.status === 429) {
      const b = await r.json().catch(() => ({}));
      return json({ ok: false, reason: 'too_many', retryAfterSec: Number(b?.retryAfterSec) || 60 });
    }

    const b = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, reason: 'server' });

    // Το `ok:false` με 2xx είναι το `signup_closed` — δες το σχόλιο στην κορυφή.
    return json({
      ok: b?.ok !== false,
      reason: b?.ok === false ? String(b?.reason ?? 'closed') : undefined,
      delivered: !!b?.delivered,
      channel: typeof b?.channel === 'string' ? b.channel : (isEmail ? 'email' : 'sms'),
      hint: typeof b?.hint === 'string' ? b.hint : undefined,
      isNew: b?.isNew === true,
      multiple: b?.multiple === true,
    });
  } catch {
    return json({ ok: false, reason: 'server' });
  }
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
