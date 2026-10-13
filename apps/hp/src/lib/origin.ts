// The `Origin` the site sends to the CRM API on every form/auth proxy (B-03, B-19).
// One function for all proxies — until 2026-10 it was copied into auth/request.ts and
// auth/verify.ts, and inquiry.ts and auth/complete.ts did not send it at all.
//
// The rule, from the 2026-08-06 incident (full history in the Greek comment of
// pages/api/auth/request.ts): the CRM signup brake is a BLOCK LIST of origins.
//   explicit PUBLIC_ORIGIN → sent as is (does not depend on tunnel headers)
//   no PUBLIC_ORIGIN, x-forwarded-host present → `${proto}://${host}`
//   neither → NO header at all. Never a made-up "safe" origin: an unknown origin OPENS signup.
import { requestHost } from './seo';

/**
 * Is the visitor on https? (B-05, traps T-K06). Behind the Cloudflare tunnel the container is
 * reached over plain http, so `url.protocol` alone says "http:" and the member cookie would go
 * out without `Secure`. The explicit PUBLIC_ORIGIN wins (like originHeader), then the proxy's
 * `x-forwarded-proto`, then the request itself. Local dev (http, no PUBLIC_ORIGIN) stays
 * non-Secure — a Secure cookie on http is dropped silently by the browser.
 */
export function isHttps(request: Request, url: URL): boolean {
  const cfg = (import.meta.env.PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || '').trim();
  if (cfg) return cfg.startsWith('https://');
  const proto = (request.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase();
  return proto === 'https' || url.protocol === 'https:';
}

export function originHeader(request: Request, url: URL): Record<string, string> {
  // Ρητή ρύθμιση πρώτα: δεν εξαρτάται από κεφαλίδες που μπορεί να μην περάσει ο tunnel.
  const cfg = (import.meta.env.PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || '').trim();
  if (cfg) return { origin: cfg.replace(/\/$/, '') };
  const fwd = request.headers.get('x-forwarded-host');
  if (!fwd) return {};                       // ⇒ το EALIDA το θεωρεί κλειστό. Σωστά.
  const proto = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  return { origin: `${proto}://${requestHost(request, url)}` };
}
