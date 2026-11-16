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
//
// Forms audit 2026-11-11:
//   · our own site only (lib/origin sameSite) and at most 10 sends an hour per visitor (lib/ratelimit) —
//     the comment in InfoForm said so, the code did not;
//   · never lost: when the CRM cannot take the lead it waits in the outbox (lib/lead-outbox) and is resent;
//   · without JavaScript the forms post here as a normal form (no GET with the details in the address); the
//     visitor goes back to the page they were on, with #sent (or #not-sent).
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { REF_RE } from '../../lib/api';
import { forwardIp, clientIpOf } from '../../lib/clientip';
import { originHeader, sameSite } from '../../lib/origin';
import { limited } from '../../lib/ratelimit';
import { sendLead } from '../../lib/lead-outbox';

export const prerender = false;

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const ct = request.headers.get('content-type') ?? '';
  const isForm = ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data');
  let b: Record<string, unknown> = {};
  try { b = isForm ? Object.fromEntries((await request.formData()).entries()) : await request.json(); } catch { /* κενό σώμα → κόβεται παρακάτω */ }

  // a plain form (no JavaScript) goes back to the page it came from, on our own site only
  const back = (ok: boolean) => {
    let to = '/';
    try {
      const r = new URL(request.headers.get('referer') ?? '', url);
      const pub = originHeader(request, url).origin;
      const ours = new Set([url.host, request.headers.get('host') ?? '', ...(pub ? [new URL(pub).host] : [])]);
      if (ours.has(r.host)) to = r.pathname + r.search;
    } catch { /* home */ }
    return new Response(null, { status: 303, headers: { location: `${to}#${ok ? 'sent' : 'not-sent'}`, 'cache-control': 'no-store' } });
  };
  const answer = (ok: boolean, body: unknown, status = 200) => (isForm ? back(ok) : json(body, status));

  if (!sameSite(request, url)) return answer(false, { error: 'origin' }, 403);

  const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  // a plain form sends the name in one field or as first + surname, and its source apart (JS puts it in the message)
  const name = clean(b.name, 120) || `${clean(b.first, 60)} ${clean(b.last, 60)}`.trim();
  const email = clean(b.email, 200);
  const phone = clean(b.phone, 40);
  const source = clean(b.source, 80);
  const rawMessage = clean(b.message, 2000);
  const message = isForm && source && !rawMessage.startsWith('[') ? `[${source}] ${rawMessage}`.trim() : rawMessage;
  // B-03: the id is kept as is (`HP-8564`), or dropped if it is not an id at all. Until 2026-10
  // it was cut to 6 chars and stripped of non-digits: `HP-8564` reached the CRM as `856`.
  const rawId = clean(b.propertyId, 12);
  const propertyId = REF_RE.test(rawId) ? rawId : '';
  const lang = clean(b.lang, 5);

  // παγίδα-μέλι + χρονο-φρένο — ψεύτικο «ok», δες την κεφαλίδα του αρχείου
  const opened = Number(b.t ?? 0);
  if (clean(b.website, 10) || !Number.isFinite(opened) || Date.now() - opened < 3000) return answer(true, { ok: true });
  if (!name || !email || !/.+@.+\..+/.test(email)) return answer(false, { error: 'name+email' }, 400);
  if (limited('inquiry', clientIpOf(request, clientAddress) || email, 10)) return answer(false, { error: 'too_many' }, 429);

  // sites#306: a date and time (the online appointment form) → the CRM books the meeting in its calendar
  // (/site/appointment: it matches or creates the contact, a «meeting» event at that time). A moment in the past or
  // more than a year ahead is not a booking: the request goes as a plain inquiry with the time in the message.
  const whenRaw = clean(b.when, 40);
  const at = whenRaw ? new Date(whenRaw) : null;
  const okAt = !!at && !isNaN(at.getTime()) && at.getTime() > Date.now() - 600_000 && at.getTime() < Date.now() + 366 * 864e5;
  if (okAt) {
    const booked = await sendLead('/site/appointment', { ...forwardIp(request, clientAddress), ...originHeader(request, url) },
      { name, email, phone, datetime: at!.toISOString(), message, lang });
    return booked.ok ? answer(true, { ok: true, ...(booked.queued ? { queued: true } : {}) }) : answer(false, { error: 'upstream' }, 502);
  }
  const msgOut = whenRaw && !okAt ? `${message} · when=${whenRaw}`.trim() : message;
  // B-03: visitor IP and site origin, as every other proxy sends them (lib/clientip, lib/origin).
  const sent = await sendLead('/site/inquiry', { ...forwardIp(request, clientAddress), ...originHeader(request, url) },
    { name, email, phone, message: msgOut, propertyId, lang });
  return sent.ok ? answer(true, { ok: true, ...(sent.queued ? { queued: true } : {}) }) : answer(false, { error: 'upstream' }, 502);
};
