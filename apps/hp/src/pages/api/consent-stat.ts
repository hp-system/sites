// Anonymous count of cookie-banner choices (George, 21/10/2026: "his own numbers" from day one).
// The browser sends one beacon per choice: { choice, analytics, marketing, device, lang }.
// We add only the country (Cloudflare's CF-IPCountry), the UTC day, a coarse page group taken
// from the Referer path and the environment — and write ONE JSON line to stdout, prefixed
// `consent_stat`. No cookie, no id, no fingerprint; the IP is used only for the in-memory
// rate limit below and is never logged. `scripts/consent-report.mjs` turns the lines into totals.
import type { APIRoute } from 'astro';
import { LANGS } from '../../lib/i18n';
import { clientIpOf } from '../../lib/clientip';
import { requestHost } from '../../lib/seo';

export const prerender = false;

const CHOICES = new Set(['accept', 'reject', 'custom']);
const DEVICES = new Set(['mobile', 'tablet', 'desktop']);
const MAX_BODY = 512;
const LIMIT = 5;              // choices per IP per minute — a person clicks once
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();   // IP → recent timestamps, memory only

const ENV = (process.env.SITE_ENV ?? '').trim().toLowerCase() === 'production' ? 'production' : 'preview';

function limited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();      // bounded memory; a reset only loosens the limit
  return recent.length > LIMIT;
}

/** Coarse page group from a path — never the full URL. */
export function pageGroup(path: string): string {
  const seg = path.split('?')[0].split('/').filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase());
  const rest = seg.length && (LANGS as readonly string[]).includes(seg[0]) ? seg.slice(1) : seg;
  if (rest.length === 0) return 'home';
  if (rest[0] === 'articles') return 'article';
  if (rest[0] === 'property-for-sale') return 'area';
  if (rest.length >= 2 && /^[a-z]{0,3}-?\d+$/i.test(rest[rest.length - 1])) return 'property';
  if (rest.length === 1 && /(propert|ακινητα|immobilien|nekretnine|имоти|proprietati|emlak|נכסים|недвижимость)/i.test(rest[0])) return 'list';
  return 'other';
}

const sameOrigin = (request: Request, url: URL): boolean => {
  const origin = request.headers.get('origin');
  if (!origin) return true;                  // sendBeacon from the same page may omit it
  try { return new URL(origin).host === requestHost(request, url); } catch { return false; }
};

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!sameOrigin(request, url)) return new Response(null, { status: 403 });
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > MAX_BODY) return new Response(null, { status: 413 });
  let raw = '';
  try { raw = (await request.text()).slice(0, MAX_BODY + 1); } catch { /* empty */ }
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return new Response(null, { status: 400 });

  const keys = Object.keys(b).sort().join(',');
  const { choice, analytics, marketing, device, lang } = b as Record<string, unknown>;
  if (keys !== 'analytics,choice,device,lang,marketing'
      || typeof choice !== 'string' || !CHOICES.has(choice)
      || typeof analytics !== 'boolean' || typeof marketing !== 'boolean'
      || typeof device !== 'string' || !DEVICES.has(device)
      || typeof lang !== 'string' || !(LANGS as readonly string[]).includes(lang)) {
    return new Response(null, { status: 400 });
  }

  const now = Date.now();
  if (limited(clientIpOf(request, clientAddress) || 'unknown', now)) return new Response(null, { status: 429 });

  const cc = (request.headers.get('cf-ipcountry') ?? '').toUpperCase();
  let path = '/';
  try { path = new URL(request.headers.get('referer') ?? '/', url).pathname; } catch { /* keep "/" */ }
  const line = {
    day: new Date(now).toISOString().slice(0, 10),
    env: ENV,
    choice, analytics, marketing, device, lang,
    country: /^[A-Z]{2}$/.test(cc) ? cc : 'XX',
    page: pageGroup(path),
  };
  console.log(`consent_stat ${JSON.stringify(line)}`);
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
