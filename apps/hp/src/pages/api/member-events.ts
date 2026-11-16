// Signed-in members' activity to the CRM (sites#305, Sergei 2026-11-16: «все клики в аналитику в срм зареганого юзера»).
// The CRM records it on the contact (site-activity recorder, card «Δραστηριότητα στο site») from
// POST /site/member/events: page_view, property_view, search, contact_click. The browser sends a batch here
// (navigator.sendBeacon); we add the member token from the cookie — the identity never comes from the body — and the
// visitor's address, browser, country and language, as for the forms. No member cookie: nothing is sent.
// The CRM cleans the events itself (closed list of kinds and filters, ≤20 events, ≤4 KB, brakes per member and IP).
import type { APIRoute } from 'astro';
import { forwardIp } from '../../lib/clientip';
import { visitorCountry } from '../../lib/api';

export const prerender = false;
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
const done = (status = 204) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const token = cookies.get('member_token')?.value;
  if (!token) return done();
  const text = await request.text();
  if (!text || text.length > 4096) return done(413);
  let body: { events?: unknown[] };
  try { body = JSON.parse(text); } catch { return done(400); }
  if (!Array.isArray(body?.events) || body.events.length === 0) return done();
  const events = body.events.slice(0, 20);
  const headers: Record<string, string> = {
    'content-type': 'application/json', 'x-member-token': token, ...forwardIp(request, clientAddress),
  };
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 400);
  if (ua) { headers['user-agent'] = ua; headers['x-visitor-ua'] = ua; }
  const country = visitorCountry(request);
  if (country) headers['x-visitor-country'] = country;
  const lang = (request.headers.get('accept-language') ?? '').slice(0, 2).toLowerCase();
  if (/^[a-z]{2}$/.test(lang)) headers['x-visitor-lang'] = lang;
  try {
    // never holds the visitor: a short timeout, and the answer does not matter to the page
    await fetch(`${API}/site/member/events`, { method: 'POST', headers, body: JSON.stringify({ events }), signal: AbortSignal.timeout(4000) });
  } catch (e) {
    console.error(`[hp-site] member events → ${(e as Error).name}: ${(e as Error).message}`);
  }
  return done(202);
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
