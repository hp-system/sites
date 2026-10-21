// A signed-in member's request ("tell us what you look for", q12) or Exclusive request (q15)
// (George 21/10/2026). Until EALIDA has its own endpoints (hp-system/ealida P2-13/14) both go
// through the CRM's /site/inquiry as a structured message, so they land in Requests today.
// The person comes from the token, never from the body.
import type { APIRoute } from 'astro';
import { memberOf } from '../../../lib/member';
import { forwardIp } from '../../../lib/clientip';
import { originHeader } from '../../../lib/origin';

export const prerender = false;
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
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
  const me = await memberOf(cookies.get('member_token')?.value);
  if (!me || me.blocked) return json({ ok: false, code: 'expired' });
  if (!me.email) return json({ ok: false, code: 'need_email' });
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* empty */ }
  const type = b.type === 'exclusive' ? 'exclusive' : 'request';
  let message: string;
  if (type === 'request') {
    const kind = String(b.kind ?? '');
    if (!KINDS.has(kind)) return json({ ok: false, code: 'kind' });
    const where = clean(b.where, 60);
    const max = Math.round(Number(String(b.maxPrice ?? '').replace(/[^\d]/g, '')) || 0);
    message = `[Request] kind=${kind}; where=${where || 'any'}; max=${max > 0 ? '€' + max.toLocaleString('en-US') : 'any'}`;
  } else {
    message = `[Exclusive request] ${clean(b.note, 600)}`.trim();
  }
  if (limited(me.email)) return json({ ok: false, code: 'too_many' });
  try {
    const r = await fetch(`${API}/site/inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...forwardIp(request, clientAddress), ...originHeader(request, url) },
      body: JSON.stringify({ name: me.name || me.email, email: me.email, phone: me.phone, message, lang: clean(b.lang, 5) }),
      signal: AbortSignal.timeout(10_000),
    });
    return json(r.ok ? { ok: true } : { ok: false, code: 'save' });
  } catch {
    return json({ ok: false, code: 'save' });
  }
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
