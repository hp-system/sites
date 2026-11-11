// Call-me-back from the property page (#82, George 21/10/2026). Until EALIDA has a request
// endpoint of its own it goes through the CRM's /site/inquiry, so it lands in Requests with the
// property, the number and the time that suits.
// Same anti-robot treatment as api/inquiry.ts: honeypot + 3-second timer, then a per-visitor limit.
import type { APIRoute } from 'astro';
import { sendLead } from '../../lib/lead-outbox';
import { REF_RE } from '../../lib/api';
import { forwardIp, clientIpOf } from '../../lib/clientip';
import { originHeader } from '../../lib/origin';
import { memberOf } from '../../lib/member';
import { checkPhone, phoneLeadEmail } from '../../lib/callback';

export const prerender = false;
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

const WHEN = new Set(['asap', 'morning', 'afternoon']);
const hits = new Map<string, number[]>();     // visitor → recent sends, memory only
const limited = (k: string) => {
  const now = Date.now(); const r = (hits.get(k) ?? []).filter((t) => now - t < 3_600_000);
  if (r.length >= 5) return true; r.push(now); hits.set(k, r); if (hits.size > 5000) hits.clear(); return false;
};
const clean = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export const POST: APIRoute = async ({ request, url, cookies, clientAddress }) => {
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* empty → rejected below */ }

  const opened = Number(b.t ?? 0);
  if (clean(b.website, 10) || !Number.isFinite(opened) || Date.now() - opened < 3000) return json({ ok: true });

  const chk = checkPhone(clean(b.code, 4), clean(b.phone, 40));
  if (!chk.ok) return json({ ok: false, code: chk.code }, 400);
  const rawId = clean(b.propertyId, 12);
  const propertyId = REF_RE.test(rawId) ? rawId : '';
  const when = WHEN.has(String(b.when)) ? String(b.when) : 'asap';
  const lang = clean(b.lang, 5);
  if (limited(clientIpOf(request, clientAddress) || chk.e164)) return json({ ok: false, code: 'too_many' }, 429);

  // A member is filed under their own contact; a guest under one address per phone number.
  const me = await memberOf(cookies.get('member_token')?.value).catch(() => null);
  const member = me && !me.blocked && me.email ? me : null;
  const name = member?.name || chk.e164;
  const email = member?.email || phoneLeadEmail(chk.e164);
  const message = `[Call back] when=${when}; phone=${chk.e164}`;

  // never lost: kept in the outbox and resent when the CRM cannot take it now (lib/lead-outbox, 2026-11-11)
  const sent = await sendLead('/site/inquiry', { ...forwardIp(request, clientAddress), ...originHeader(request, url) },
    { name, email, phone: chk.e164, message, propertyId, lang });
  return sent.ok ? json({ ok: true, phone: chk.e164 }) : json({ ok: false, code: 'upstream' }, 502);
};
