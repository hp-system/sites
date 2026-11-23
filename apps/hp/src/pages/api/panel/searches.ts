// The member's saved searches («Requests», /panel/request) — CRM #496 (2026-11-23, `/site/member/searches`).
//   GET            → { ok, api, items }        api:false = the CRM has no searches yet (404): the page keeps the browser copy
//   POST {q, text} → { ok, item }              used once per browser item, to move the browser copy into the CRM
//   DELETE ?id=    → { ok }                    the CRM archives it (nothing is removed)
// Saving from the filter window goes through /api/panel/request (type filters), which also tells the adviser.
import type { APIRoute } from 'astro';
import { memberOf } from '../../../lib/member';
import { memberCall, panelSearch } from '../../../lib/member-api';

export const prerender = false;
const json = (d: unknown) => new Response(JSON.stringify(d), {
  status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
});
const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

async function who(cookies: Parameters<APIRoute>[0]['cookies']) {
  const token = cookies.get('member_token')?.value;
  const me = await memberOf(token);
  return me && !me.blocked && token ? token : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = await who(cookies);
  if (!token) return json({ ok: false, code: 'expired' });
  const r = await memberCall(token, 'GET', 'searches');
  if (r.status === 404) return json({ ok: true, api: false, items: [] });
  if (r.status !== 200) return json({ ok: false, code: 'offline' });
  return json({ ok: true, api: true, items: (Array.isArray(r.body?.items) ? r.body.items : []).map(panelSearch) });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const token = await who(cookies);
  if (!token) return json({ ok: false, code: 'expired' });
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch { /* empty */ }
  const r = await memberCall(token, 'POST', 'searches', { q: clean(b.q, 1000), label: clean(b.text, 800) });
  if (r.status === 409) return json({ ok: false, code: 'limit' });
  if (r.status !== 200 && r.status !== 201) return json({ ok: false, code: r.status === 404 ? 'noapi' : 'save' });
  return json({ ok: true, item: panelSearch(r.body) });
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
  const token = await who(cookies);
  if (!token) return json({ ok: false, code: 'expired' });
  const id = clean(url.searchParams.get('id'), 80);
  if (!id) return json({ ok: false, code: 'bad' });
  const r = await memberCall(token, 'DELETE', `searches/${encodeURIComponent(id)}`);
  // 404 = already gone: the same for the member
  return json(r.status === 200 || r.status === 404 ? { ok: true } : { ok: false, code: 'save' });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'GET, POST, DELETE' } });
