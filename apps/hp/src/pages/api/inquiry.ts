// ═══════════════════════════════════════════════════════════════════════════
// Η ΑΠΛΗ ΦΟΡΜΑ ΠΛΗΡΟΦΟΡΙΩΝ → EALIDA CRM.
//
// Γιατί υπάρχει αυτή η γέφυρα: ο browser ΔΕΝ βλέπει το `api:3020` — ζει μόνο
// στο εσωτερικό δίκτυο των containers. Η φόρμα ποστάρει εδώ, κι εμείς
// προωθούμε στο `POST /site/inquiry`, που γράφει επαφή + αίτημα στο CRM.
//
// 🛡️ ΑΝΤΙ-ΡΟΜΠΟΤ ΧΩΡΙΣ CAPTCHA (ο George: «captcha αν είναι απαραίτητο»):
//    (α) παγίδα-μέλι: κρυφό πεδίο `website` — άνθρωπος δεν το βλέπει, ρομπότ
//        το γεμίζει· αν έχει τιμή, απαντάμε «ok» ΧΩΡΙΣ να στείλουμε τίποτα,
//        ώστε το ρομπότ να μη μάθει ότι απέτυχε.
//    (β) χρονο-φρένο: το πεδίο `t` κουβαλά πότε άνοιξε η φόρμα· υποβολή σε
//        λιγότερο από 3΄΄ δεν είναι άνθρωπος.
//    Αν τα logs δείξουν spam παρ' όλα αυτά, τότε μπαίνει πραγματικό captcha.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';

export const prerender = false;
const API = import.meta.env.EALIDA_API ?? process.env.EALIDA_API ?? 'http://localhost:3020/api';

export const POST: APIRoute = async ({ request }) => {
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* κενό σώμα → κόβεται παρακάτω */ }

  const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const name = clean(b.name, 120), email = clean(b.email, 200);
  const phone = clean(b.phone, 40), message = clean(b.message, 2000);
  const propertyId = clean(b.propertyId, 6).replace(/\D+/g, '');
  const lang = clean(b.lang, 5);

  // παγίδα-μέλι + χρονο-φρένο — ψεύτικο «ok», δες την κεφαλίδα του αρχείου
  const opened = Number(b.t ?? 0);
  if (clean(b.website, 10) || !Number.isFinite(opened) || Date.now() - opened < 3000) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (!name || !email || !/.+@.+\..+/.test(email)) {
    return new Response(JSON.stringify({ error: 'name+email' }), { status: 400 });
  }

  try {
    const r = await fetch(`${API}/site/inquiry`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, phone, message, propertyId, lang }),
      signal: AbortSignal.timeout(10_000),
    });
    return new Response(JSON.stringify({ ok: r.ok }), { status: r.ok ? 200 : 502 });
  } catch {
    return new Response(JSON.stringify({ error: 'upstream' }), { status: 502 });
  }
};
