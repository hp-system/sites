// The viewing-order page's only door to the CRM (sites#302). GET: the page data, the document, the PDF.
// POST: code, approve, decline, renew. Unknown tokens and unknown operations answer the CRM's own 404 shape
// without calling it.
import type { APIRoute } from 'astro';
import { TOKEN_RE, GET_OPS, POST_OPS, MAX_BODY, relay, notFound } from '../../../../lib/eindication';

export const prerender = false;

export const GET: APIRoute = ({ params, request, clientAddress }) => {
  const token = params.token ?? '';
  const op = params.op ?? '';
  if (!TOKEN_RE.test(token) || !GET_OPS.has(op)) return notFound();
  return relay(token, op, request, clientAddress);
};

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  const token = params.token ?? '';
  const op = params.op ?? '';
  if (!TOKEN_RE.test(token) || !POST_OPS.has(op)) return notFound();
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) {
    return new Response(JSON.stringify({ statusCode: 413, code: 'too_large' }), { status: 413, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(JSON.stringify({ statusCode: 413, code: 'too_large' }), { status: 413, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  // Only a JSON object goes on (an empty body is sent as {} for the actions that take none).
  let body = '{}';
  if (text.trim()) {
    try { const j = JSON.parse(text); if (j && typeof j === 'object' && !Array.isArray(j)) body = JSON.stringify(j); else return notFound(); }
    catch { return notFound(); }
  }
  return relay(token, op, request, clientAddress, body);
};
