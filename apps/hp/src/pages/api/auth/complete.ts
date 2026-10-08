// ═══════════════════════════════════════════════════════════════════════════
// ΣΥΜΠΛΗΡΩΣΗ ΤΩΝ ΕΛΛΕΙΨΕΩΝ — ΜΕΤΑ την επαλήθευση, ποτέ πριν.
//
// George, 6/8: «αν η επαφή υπάρχει μόνο με τηλέφωνο θα ζητάει μέιλ και το αντίθετο,
// ώστε όλα να είναι ολοκληρωμένα».
//
// 🔴 ΓΙΑΤΙ Η ΣΕΙΡΑ ΕΙΝΑΙ ΤΟ ΠΑΝ. Αν ζητούσαμε το στοιχείο που λείπει **πριν** την
//    επαλήθευση, θα ήταν κατάληψη λογαριασμού με μία κίνηση: γράφεις το e-mail του
//    θύματος, δίνεις το ΔΙΚΟ ΣΟΥ κινητό, ο κωδικός έρχεται σε σένα, μπήκες.
//    Εδώ ο χρήστης έχει ήδη αποδείξει ότι είναι αυτός — κρατά εισιτήριο.
//
// 🪤 ΚΑΙ ΤΟ ΝΕΟ ΣΤΟΙΧΕΙΟ ΕΠΑΛΗΘΕΥΕΤΑΙ ΚΙ ΑΥΤΟ. Χωρίς αυτό, κάποιος θα πρόσθετε ξένο
//    e-mail στον λογαριασμό του και θα «άρπαζε» την ταυτότητα εκείνου — και ο
//    πραγματικός κάτοχος, στην επόμενη εγγραφή, θα έπεφτε στον λογαριασμό του άλλου.
//    Ο κωδικός πάει στο **ΝΕΟ** στοιχείο, όχι στο παλιό.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { forwardIp } from '../../../lib/clientip';

export const prerender = false;

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const token = cookies.get('member_token')?.value;
  // Χωρίς εισιτήριο δεν συμπληρώνεται τίποτα. Δεν είναι «σφάλμα εισόδου» — είναι
  // ακριβώς η γραμμή που κρατά την κατάληψη λογαριασμού έξω.
  if (!token) return json({ ok: false, message: 'Η σύνδεσή σας έληξε. Ξεκινήστε από την αρχή.' });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* κενό → πέφτει στους ελέγχους */ }

  // Δύο φάσεις στο ίδιο endpoint: «στείλε κωδικό στο νέο στοιχείο» και «να ο κωδικός».
  const step = String(body.step ?? 'send');
  const path = step === 'verify' ? 'complete-verify' : 'complete';

  const payload: Record<string, unknown> = {};
  if (step === 'verify') {
    payload.code = String(body.code ?? '').replace(/\D/g, '').slice(0, 6);
    if (String(payload.code).length !== 6) return json({ ok: false, message: 'Βάλτε και τα έξι ψηφία.' });
  } else {
    const name = String(body.name ?? '').trim().slice(0, 40);
    // 🗄️ Χωριστά, όπως τα κρατά η βάση — δες `LoginPage.astro`.
    const surname = String(body.surname ?? '').trim().slice(0, 40);
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const phone = String(body.phone ?? '').replace(/[^\d+]/g, '').slice(0, 24);
    /* 🗄️ ΔΥΟ ΠΕΔΙΑ, ΧΩΡΙΣ ΜΑΝΤΕΨΙΑ (George 6/8· διακομιστής `69ace1f`).
       Ο διακομιστής, όταν πάρει `surname`, γράφει `first_name`/`last_name` **αυτούσια**.
       Χωρίς αυτό έκοβε στο πρώτο κενό: «Άννα Μαρία Παπαδοπούλου» → επώνυμο
       «Μαρία Παπαδοπούλου», και ο πελάτης το έβλεπε λάθος στην καρτέλα του.
       🪤 ΜΗΝ στείλεις ΜΟΝΟ `surname` — ο διακομιστής απαντά 401 και δεν γράφεται τίποτα.
       Γι' αυτό η οθόνη απαιτεί **και τα δύο** πριν στείλει. */
    if (name) payload.name = name;
    if (surname) payload.surname = surname;
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    if (!name && !surname && !email && !phone) return json({ ok: false, message: 'Συμπληρώστε το πεδίο.' });
  }

  try {
    const r = await fetch(`${API}/site/member/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-member-token': token,
        ...forwardIp(request, clientAddress),   // και εδώ φρενάρει ανά διεύθυνση
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, message: String(b?.message ?? 'Δεν μπόρεσε να αποθηκευτεί.') });
    return json({
      ok: b?.ok !== false,
      message: typeof b?.message === 'string' ? b.message : undefined,
      channel: typeof b?.channel === 'string' ? b.channel : undefined,
      hint: typeof b?.hint === 'string' ? b.hint : undefined,
      pending: typeof b?.pending === 'string' ? b.pending : undefined,
      saved: typeof b?.saved === 'string' ? b.saved : undefined,
      needs: Array.isArray(b?.needs) ? b.needs.map(String) : [],
    });
  } catch {
    return json({ ok: false, message: 'Δεν έχουμε σύνδεση αυτή τη στιγμή. Δοκιμάστε ξανά.' });
  }
};
