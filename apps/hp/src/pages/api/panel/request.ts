// A signed-in member's request ("tell us what you look for", q12) or Exclusive request (q15)
// (George 21/10/2026). Until EALIDA has its own endpoints (hp-system/ealida P2-13/14) both go
// through the CRM's /site/inquiry as a structured message, so they land in Requests today.
// The person comes from the token, never from the body.
//
// CRM #496 (2026-11-23): where the CRM now stores the data, it goes there first —
//   filters → `member/searches` (the saved search) + the inquiry, so the adviser still hears of it;
//   prefs   → `member/preferences` (no inquiry any more);
//   delete  → `member/delete-request` (a GDPR request and a task for the adviser).
// A 404 from the CRM (an API without these endpoints) falls back to the tagged inquiry line, as before.
// Every inquiry carries `topic` (request · exclusive · preferences · account_delete); the tag stays in the text.
import type { APIRoute } from 'astro';
import { memberCall, panelSearch } from '../../../lib/member-api';
import { sendLead } from '../../../lib/lead-outbox';
import { forgetMember, memberOf } from '../../../lib/member';
import { forwardIp } from '../../../lib/clientip';
import { originHeader } from '../../../lib/origin';

export const prerender = false;
const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

const KINDS = new Set(['home', 'apartment', 'land', 'business']);
const hits = new Map<string, number[]>();     // member → recent sends, memory only
const limited = (k: string) => {
  const now = Date.now(); const r = (hits.get(k) ?? []).filter((t) => now - t < 3_600_000);
  if (r.length >= 5) return true; r.push(now); hits.set(k, r); if (hits.size > 5000) hits.clear(); return false;
};
const clean = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export const POST: APIRoute = async ({ request, url, cookies, clientAddress }) => {
  const token = cookies.get('member_token')?.value ?? '';
  const me = await memberOf(token);
  if (!me || me.blocked) return json({ ok: false, code: 'expired' });
  if (!me.email) return json({ ok: false, code: 'need_email' });
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* empty */ }
  const type = b.type === 'exclusive' ? 'exclusive' : b.type === 'filters' ? 'filters' : b.type === 'prefs' ? 'prefs' : b.type === 'delete' ? 'delete' : 'request';
  let message: string;
  let topic: 'request' | 'exclusive' | 'preferences' | 'account_delete' = 'request';
  let saved: ReturnType<typeof panelSearch> | null = null;
  if (type === 'prefs') {
    // My details (Sergei 2026-11-23): gender, contact ways, how often — the CRM has no fields for them yet, so the
    // adviser gets them as a line; only known values pass
    const G = new Set(['female', 'male', 'none']), W = new Set(['email', 'call', 'whatsapp', 'viber', 'sms']), O = new Set(['now', 'day', 'week', 'never']);
    const g = String(b.gender ?? ''), o = String(b.often ?? '');
    const w = (Array.isArray(b.ways) ? b.ways : []).map(String).filter((x) => W.has(x));
    const patch: Record<string, unknown> = {};
    if ('gender' in b) patch.gender = G.has(g) ? g : null;
    if ('ways' in b) patch.contactWays = [...new Set(w)];
    if (O.has(o)) patch.frequency = o;
    const r = await memberCall(token, 'PATCH', 'preferences', patch);
    // the member's answer is cached 30 s (lib/member.ts): the next page must read the new values
    if (r.status === 200) { forgetMember(token); return json({ ok: true, crm: true }); }
    if (r.status !== 404) return json({ ok: false, code: 'save' });
    message = `[Preferences] gender=${G.has(g) ? g : '-'}; contact=${w.join(',') || '-'}; frequency=${O.has(o) ? o : '-'}`;
    topic = 'preferences';
  } else if (type === 'delete') {
    const r = await memberCall(token, 'POST', 'delete-request');
    if (r.status === 200) return json({ ok: true, crm: true });
    if (r.status !== 404) return json({ ok: false, code: 'save' });
    message = '[Account] The member asks to delete the account (My details). Confirm with them by e-mail.';
    topic = 'account_delete';
  } else if (type === 'filters') {
    // «Tell us what you look for» from the filter window (Sergei 2026-11-23): the choices as one readable line
    const f = String(b.filters ?? '').replace(/\s+/g, ' ').trim().slice(0, 800);
    if (!f) return json({ ok: false, code: 'kind' });
    message = `[Request] ${f}`;
    // the saved search: a CRM id → change it; a new one (or a browser-only id) → add it
    const q = String(b.q ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 1000);
    const id = clean(b.id, 80);
    let r = id && !/^\d{10,}$/.test(id) ? await memberCall(token, 'PATCH', `searches/${encodeURIComponent(id)}`, { q, label: f }) : { status: 404, body: {} };
    if (r.status === 404) r = await memberCall(token, 'POST', 'searches', { q, label: f });
    if (r.status === 409) return json({ ok: false, code: 'limit' });
    if (r.status === 200 || r.status === 201) saved = panelSearch(r.body);
  } else if (type === 'request') {
    const kind = String(b.kind ?? '');
    if (!KINDS.has(kind)) return json({ ok: false, code: 'kind' });
    const where = clean(b.where, 60);
    const max = Math.round(Number(String(b.maxPrice ?? '').replace(/[^\d]/g, '')) || 0);
    message = `[Request] kind=${kind}; where=${where || 'any'}; max=${max > 0 ? '€' + max.toLocaleString('en-US') : 'any'}`;
  } else {
    message = `[Exclusive request] ${clean(b.note, 600)}`.trim();
    topic = 'exclusive';
  }
  if (limited(me.email)) return json({ ok: false, code: 'too_many' });
  // never lost: kept in the outbox and resent when the CRM cannot take it now (lib/lead-outbox, 2026-11-11)
  const sent = await sendLead('/site/inquiry', { ...forwardIp(request, clientAddress), ...originHeader(request, url) },
    { name: me.name || me.email, email: me.email, phone: me.phone, message, topic, lang: clean(b.lang, 5) });
  // a search kept in the CRM counts as saved even if the adviser's note waits in the outbox
  if (saved) return json({ ok: true, crm: true, item: saved });
  return json(sent.ok ? { ok: true } : { ok: false, code: 'save' });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
