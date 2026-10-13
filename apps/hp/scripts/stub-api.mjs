// Local stand-in for the CRM site API, for acceptance tests of the site (M1, E-05).
// Serves N synthetic properties and records every POST so a test can check what the site sent.
// Usage: node scripts/stub-api.mjs [port=4339] [n=1200]   → base URL http://127.0.0.1:<port>/api
// Not a contract: only the fields the site reads for list/count/sitemap/forms.
import { createServer } from 'node:http';

export function startStub({ port = 4339, n = 1200 } = {}) {
  // Pools cycle through "private pool" (3), "no pool" (2) and nothing: 1/3 really have a pool.
  const items = Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    reference: i % 50 === 0 ? `HP-${9000 + i}` : null,
    title: `Stub property ${i}`,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    attributes: {
      onsea_id: i % 50 === 0 ? undefined : String(10000 + i),
      category: 'residential',
      subcategory: 'detached_house',
      public_price: 100000 + i * 1000,
      price_public_visible: true,
      bedrooms: 1 + (i % 5),
      sqm: 50 + (i % 200),
      pools: [['3'], ['2'], []][i % 3],
      // Property 10001 carries hostile text, as a CRM editor could type it (B-07 JSON-LD test).
      ...(i === 1 ? { description_en: 'Sea view </script><script>window.__pwned=1</script> & more' } : {}),
    },
  }));
  const captured = [];

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'POST') {
      let raw = '';
      for await (const c of req) raw += c;
      let body = null;
      try { body = JSON.parse(raw); } catch { /* keep null */ }
      captured.push({ path: url.pathname, headers: req.headers, body });
      // A successful code check returns a member token, as the CRM does.
      if (url.pathname === '/api/site/member/verify-code') return send(200, { ok: true, token: 'stub-token', name: 'Stub', needs: [] });
      return send(200, { ok: true });
    }
    if (url.pathname === '/__captured') return send(200, captured);
    if (url.pathname === '/api/site/properties') {
      const limit = Math.min(60, Number(url.searchParams.get('limit') ?? 60));
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      return send(200, { total: items.length, page, limit, items: items.slice((page - 1) * limit, page * limit) });
    }
    const m = url.pathname.match(/^\/api\/site\/property\/(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const p = items.find((x) => x.attributes.onsea_id === id || x.reference === id || x.id === id);
      return p ? send(200, p) : send(404, { message: 'not found' });
    }
    return send(404, { message: 'stub: not implemented', path: url.pathname });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, items, captured, base: `http://127.0.0.1:${port}/api` })));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 4339), n = Number(process.argv[3] ?? 1200);
  const { base } = await startStub({ port, n });
  console.log(`stub API ${base} with ${n} properties`);
}
