// Electronic viewing order (sites#302, George 16/11: ealida docs/eindication-site-contract.md).
// The CRM stores and decides everything; the site shows the client's page and forwards the client's
// actions over the private link (`/api/site/eindication/{token}…`). The token in the path is the only key:
// no cookie, no member token. We forward the visitor's address and browser, as for the forms (the CRM
// writes them next to every step as proof and its per-address brake counts them).
import { forwardIp } from './clientip';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

/** 43 url-safe characters, 256 random bits (contract «The token»). Anything else never reaches the CRM. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** What the browser may ask for: '' = the page data, the four actions, the document and the PDF. */
export const GET_OPS = new Set(['', 'document', 'pdf']);
export const POST_OPS = new Set(['code', 'approve', 'decline', 'renew']);

/** The CRM's limit on these routes is 256 KB (George 16/11 §3); a body above it is refused here. */
export const MAX_BODY = 256 * 1024;

/** Headers on every answer of this feature: never cached, never indexed, the token never leaves in a Referer. */
export const PRIVATE_HEADERS: Record<string, string> = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'x-content-type-options': 'nosniff',
};

export const notFound = () => new Response(JSON.stringify({ statusCode: 404, code: 'not_found' }), {
  status: 404, headers: { 'content-type': 'application/json', ...PRIVATE_HEADERS },
});

/** Forwards one call to the CRM and hands its answer back as it is (status, JSON, or the document / PDF file). */
export async function relay(token: string, op: string, request: Request, clientAddress: string | undefined, body?: string): Promise<Response> {
  const headers: Record<string, string> = {
    accept: op === 'pdf' ? 'application/pdf' : op === 'document' ? 'text/html' : 'application/json',
    ...forwardIp(request, clientAddress),
  };
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 400);
  if (ua) headers['x-visitor-ua'] = ua;
  const lang = (request.headers.get('accept-language') ?? '').slice(0, 2).toLowerCase();
  if (/^[a-z]{2}$/.test(lang)) headers['x-visitor-lang'] = lang;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const qs = new URL(request.url).searchParams.get('download') === '1' ? '?download=1' : '';
  let res: Response;
  try {
    res = await fetch(`${API}/site/eindication/${token}${op ? `/${op}` : ''}${qs}`, {
      method: body !== undefined ? 'POST' : 'GET', headers, body, signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error(`[hp-site] eindication ${op || 'get'} → ${(e as Error).name}: ${(e as Error).message}`);
    return new Response(JSON.stringify({ statusCode: 503, code: 'upstream' }), {
      status: 503, headers: { 'content-type': 'application/json', ...PRIVATE_HEADERS },
    });
  }
  const out = new Headers(PRIVATE_HEADERS);
  for (const k of ['content-type', 'content-disposition', 'retry-after']) {
    const v = res.headers.get(k);
    if (v) out.set(k, v);
  }
  // The document is a whole HTML file of the CRM's: shown on its own, it may not run anything or frame anything.
  if (op === 'document') out.set('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'");
  return new Response(res.body, { status: res.status, headers: out });
}
