// Acceptance for M1-S03 data fixes (B-01, B-03, B-04, B-19) against the stub API.
// Starts scripts/stub-api.mjs (127.0.0.1:4339, 1,200 properties) and the BUILT site
// (127.0.0.1:4331, SITE_ENV=production so the sitemap is served). Exit 1 on any FAIL.
// Usage (from site/, after `pnpm build`): node scripts/test-e05-data.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const N = 1200;
const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: N, junk: true });   // + 1 record without a public id (B-26)
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'production', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
let log = '';
site.stdout.on('data', (d) => (log += d)); site.stderr.on('data', (d) => (log += d));
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

try {
  // B-01 — the sitemap is asked FIRST: with the old code its 1,000 filled the shared cache.
  const t0 = Date.now();
  const sm = await (await fetch(SITE + '/sitemap.xml')).text();
  const smMs = Date.now() - t0;
  const enProps = (sm.match(/<loc>[^<]*\/en\/property\/[^<]+<\/loc>/g) || []).length;
  check('B-01 sitemap lists every property', enProps === N, `${enProps} /en/property/ URLs of ${N} (first fetch ${smMs} ms)`);
  check('B-26 no empty-id URL in the sitemap', !/\/property\/<\/loc>/.test(sm), /\/property\/<\/loc>/.test(sm) ? 'found /property/ with empty id' : 'none');
  const count = await (await fetch(SITE + '/api/count')).json();
  // /api/count no longer publishes a number (no public property counts) — only whether anything matches.
  check('B-01 /api/count says the catalogue is not empty', count.any === true && !('total' in count), JSON.stringify(count));

  // B-04 — pool counter equals the properties with a real pool code (3/4/5/6).
  const pools = stub.items.filter((p) => (p.attributes.pools ?? []).some((x) => ['3', '4', '5', '6'].includes(x))).length;
  const pc = await (await fetch(SITE + '/api/count?pool=1')).json();
  check('B-04 pool counter answers for real pools only', pc.any === (pools > 0), `pool=1 → ${JSON.stringify(pc)}, real pools ${pools}`);

  // B-03 — letter id kept, visitor IP and origin forwarded; junk id dropped.
  const post = (body, headers = {}) => fetch(SITE + '/api/inquiry', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  const base = { name: 'Stub Test', email: 'stub@example.com', message: 'm', lang: 'en', t: Date.now() - 10_000 };
  const r1 = await post({ ...base, propertyId: 'HP-8564' }, { 'x-forwarded-for': '203.0.113.7' });
  const c1 = stub.captured.at(-1);
  check('B-03 inquiry accepted', r1.status === 200 && c1?.path === '/api/site/inquiry', `status ${r1.status}, stub got ${c1?.path}`);
  check('B-03 letter id kept', c1?.body?.propertyId === 'HP-8564', `propertyId=${JSON.stringify(c1?.body?.propertyId)}`);
  check('B-03 visitor IP forwarded', c1?.headers['x-forwarded-for'] === '203.0.113.7', `x-forwarded-for=${c1?.headers['x-forwarded-for']}`);
  check('B-03 origin forwarded', c1?.headers.origin === 'https://hp.rewize.app', `origin=${c1?.headers.origin}`);
  await post({ ...base, propertyId: '8075' });
  check('B-03 numeric id kept', stub.captured.at(-1)?.body?.propertyId === '8075', `propertyId=${JSON.stringify(stub.captured.at(-1)?.body?.propertyId)}`);
  await post({ ...base, propertyId: 'ακινητο' });
  check('B-03 non-id dropped', stub.captured.at(-1)?.body?.propertyId === '', `propertyId=${JSON.stringify(stub.captured.at(-1)?.body?.propertyId)}`);
  const before = stub.captured.length;
  await post({ ...base, propertyId: 'HP-1', website: 'bot' });
  check('B-03 honeypot still silent', stub.captured.length === before, `stub calls ${stub.captured.length - before}`);

  // B-19 — complete forwards origin like request/verify.
  await fetch(SITE + '/api/auth/complete', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: 'member_token=stub-token' },
    body: JSON.stringify({ step: 'send', name: 'Stub' }),
  });
  const c2 = stub.captured.at(-1);
  check('B-19 complete forwards origin', c2?.path === '/api/site/member/complete' && c2?.headers.origin === 'https://hp.rewize.app', `path=${c2?.path} origin=${c2?.headers.origin}`);

  // Regression for the shared lib/origin.ts: request/verify still send the same origin.
  for (const [route, body, upstream] of [
    ['/api/auth/request', { identifier: 'stub@example.com', name: 'Stub' }, '/api/site/member/request-code'],
    ['/api/auth/verify', { identifier: 'stub@example.com', code: '123456' }, '/api/site/member/verify-code'],
  ]) {
    await fetch(SITE + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const c = stub.captured.at(-1);
    check(`origin unchanged on ${route}`, c?.path === upstream && c?.headers.origin === 'https://hp.rewize.app', `path=${c?.path} origin=${c?.headers.origin}`);
  }
} finally {
  site.kill();
}

// lib/origin.ts rule without PUBLIC_ORIGIN: no forwarded host → NO origin header (an unknown
// origin would open signup, 2026-08-06); with x-forwarded-host → that host.
await sleep(500);
const env2 = { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' };
delete env2.PUBLIC_ORIGIN;
const site2 = spawn(process.execPath, ['dist/server/entry.mjs'], { env: env2 });
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
try {
  const req = (headers) => fetch(SITE + '/api/auth/request', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ identifier: 'stub@example.com', name: 'Stub' }) });
  await req({});
  const a = stub.captured.at(-1);
  check('origin absent without PUBLIC_ORIGIN and forwarded host', a?.path === '/api/site/member/request-code' && !('origin' in a.headers), `origin=${a?.headers.origin}`);
  await req({ 'x-forwarded-host': 'hp.rewize.app', 'x-forwarded-proto': 'https' });
  const b = stub.captured.at(-1);
  check('origin from forwarded host', b?.headers.origin === 'https://hp.rewize.app', `origin=${b?.headers.origin}`);
} finally {
  site2.kill();
  stub.server.close();
}
const warn = log.match(/\[hp-site\] allProperties[^\n]*/);
if (warn) console.log('log:', warn[0]);
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
