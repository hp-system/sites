// Save / unsave a property for the signed-in member (#59) → `POST /site/member/favorite`.
// The member is proven by the token cookie, never by the body; the CRM toggles and answers
// `{ favorite, total }` (limit 500, `member-limits.ts`). Errors go out as a `code`.
import type { APIRoute } from 'astro';
import { memberOf, forgetMember } from '../../../lib/member';
import { REF_RE } from '../../../lib/api';

export const prerender = false;

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('member_token')?.value;
  const me = await memberOf(token);
  if (!token || !me || me.blocked) return json({ ok: false, code: 'expired' });
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* empty */ }
  const ref = String(b.ref ?? '').trim().slice(0, 64);
  if (!REF_RE.test(ref)) return json({ ok: false, code: 'ref' });
  try {
    const r = await fetch(`${API}/site/member/favorite`, {
      method: 'POST',
      headers: { 'x-member-token': token, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ref }),
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, code: r.status === 429 ? 'limit' : 'save' });
    forgetMember(token);
    return json({ ok: true, favorite: d?.favorite === true, total: Number(d?.total ?? 0) });
  } catch {
    return json({ ok: false, code: 'save' });
  }
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
