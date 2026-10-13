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

export function originHeader(request: Request, url: URL): Record<string, string> {
  // Ρητή ρύθμιση πρώτα: δεν εξαρτάται από κεφαλίδες που μπορεί να μην περάσει ο tunnel.
  const cfg = (import.meta.env.PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || '').trim();
  if (cfg) return { origin: cfg.replace(/\/$/, '') };
  const fwd = request.headers.get('x-forwarded-host');
  if (!fwd) return {};                       // ⇒ το EALIDA το θεωρεί κλειστό. Σωστά.
  const proto = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  return { origin: `${proto}://${requestHost(request, url)}` };
}
