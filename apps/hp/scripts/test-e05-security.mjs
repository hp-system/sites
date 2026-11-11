// Acceptance for M1-S04 security/caching fixes (B-05, B-06, B-07, B-24) against the stub API.
// B-08 (alt-text leak) is a data scan of the live preview, not a code test — see the vault.
// Usage (from site/, after `pnpm build`): node scripts/test-e05-security.mjs   → exit 1 on any FAIL.
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const stub = await startStub({ port: 4339, n: 30 });

async function withSite(env, fn) {
  const e = { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', ...env };
  for (const [k, v] of Object.entries(env)) if (v === null) delete e[k];
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], { env: e });
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  try { await fn(); } finally { site.kill(); await sleep(400); }
}
const verify = (headers = {}) => fetch(SITE + '/api/auth/verify', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify({ identifier: 'stub@example.com', code: '123456' }),
});

// B-05 — behind the tunnel: container sees http, no x-forwarded-proto, PUBLIC_ORIGIN is https.
await withSite({ PUBLIC_ORIGIN: 'https://hp.rewize.app' }, async () => {
  const c = (await verify()).headers.get('set-cookie') ?? '';
  check('B-05 Secure behind tunnel (PUBLIC_ORIGIN https)', /;\s*Secure/i.test(c) && /HttpOnly/i.test(c), c);
  const out = await fetch(SITE + '/api/auth/logout', { method: 'POST', redirect: 'manual', headers: { cookie: 'member_token=stub-token', origin: 'https://hp.rewize.app', 'content-type': 'application/x-www-form-urlencoded' } });
  const d = out.headers.get('set-cookie') ?? '';
  check('B-05 logout clears with the same attributes', /member_token=[^;]*;.*Expires=Thu, 01 Jan 1970/i.test(d) && /;\s*Secure/i.test(d), d);
  // B-06 — count: member → private; guest → public.
  const m = await fetch(SITE + '/api/count', { headers: { cookie: 'member_token=stub-token' } });
  check('B-06 member count is private', /^private/.test(m.headers.get('cache-control') ?? '') && /cookie/i.test(m.headers.get('vary') ?? ''), `cache-control=${m.headers.get('cache-control')} vary=${m.headers.get('vary')}`);
  const g = await fetch(SITE + '/api/count');
  check('B-06 guest count stays public', /^public/.test(g.headers.get('cache-control') ?? ''), `cache-control=${g.headers.get('cache-control')}`);
  // B-07 — hostile description cannot close the JSON-LD script.
  const r = await fetch(SITE + '/en/property/10001');
  const html = await r.text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  let parsed = 0; for (const b of blocks) { try { JSON.parse(b); parsed++; } catch { /* counted below */ } }
  check('B-07 property page renders', r.status === 200, `status ${r.status}`);
  check('B-07 every JSON-LD block is valid JSON', blocks.length > 0 && parsed === blocks.length, `${parsed}/${blocks.length} parse`);
  // Inside a quoted attribute value (<meta content="…">) `<script>` is plain text; only markup counts.
  const markup = html.replace(/="[^"]*"/g, '=""');
  check('B-07 no injected script element', !markup.includes('<script>window.__pwned=1</script>'), markup.includes('window.__pwned') ? `escaped occurrences: ${(markup.match(/__pwned/g) || []).length}` : 'absent');
});
// B-24 — form POST behind the tunnel: the container sees https://localhost, the browser sends
// Origin https://hp.rewize.app (measured on the preview 2026-10-13).
const tunnel = { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'hp.rewize.app' };
const form = (headers) => fetch(SITE + '/api/auth/logout', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers } });
await withSite({ PUBLIC_ORIGIN: 'https://hp.rewize.app' }, async () => {
  const ok = await form({ ...tunnel, origin: 'https://hp.rewize.app' });
  check('B-24 same-site logout form passes', ok.status === 303, `status ${ok.status}`);
  const evil = await form({ ...tunnel, origin: 'https://evil.example' });
  check('B-24 cross-site form still 403', evil.status === 403, `status ${evil.status}`);
  const none = await form({ ...tunnel });
  check('B-24 form without Origin still 403', none.status === 403, `status ${none.status}`);
  const json = await fetch(SITE + '/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' });
  // since 2026-11-11 (forms audit) the lead endpoint refuses another site itself, no longer only CORS
  check('B-24 JSON lead from another site: refused by /api/inquiry', json.status === 403, `status ${json.status}`);
});
await withSite({ PUBLIC_ORIGIN: null }, async () => {
  const ok = await form({ ...tunnel, origin: 'https://hp.rewize.app' });
  check('B-24 forwarded host is the public origin when PUBLIC_ORIGIN is unset', ok.status === 303, `status ${ok.status}`);
  const local = await form({ origin: SITE });
  check('B-24 local dev form passes', local.status === 303, `status ${local.status}`);
});
// B-05 — local dev: plain http, no PUBLIC_ORIGIN, no proxy → no Secure (else the login never sticks).
await withSite({ PUBLIC_ORIGIN: null }, async () => {
  const c = (await verify()).headers.get('set-cookie') ?? '';
  check('B-05 no Secure on plain local http', c.includes('member_token=') && !/;\s*Secure/i.test(c), c);
  const c2 = (await verify({ 'x-forwarded-proto': 'https' })).headers.get('set-cookie') ?? '';
  check('B-05 Secure when the proxy says https', /;\s*Secure/i.test(c2), c2);
});
stub.server.close();
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
