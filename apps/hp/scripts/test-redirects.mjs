// The redirect engine v2 (#152, plan stage 2) serves the merged table and the legacy rules:
// every 301 row of src/data/redirects.json answers 301 with its target, every 410 row answers
// 410, pending/review rows are served as they are (never redirected), the query string is kept,
// /rs → /sr, /<lang>/ID123 → the property page, a property that is gone answers 410 (D6), and no
// page that is live today is redirected away. v1 (#56) tested EN 301 / other 302; D7 retired the
// 302s. Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-redirects.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const T = JSON.parse(readFileSync('src/data/redirects.json', 'utf8'));
const R = JSON.parse(readFileSync('src/data/page-registry.json', 'utf8'));

const stub = await startStub({ port: 4339, n: 30 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
const get = (p) => fetch(SITE + encodeURI(p), { redirect: 'manual' });
const loc = (r) => decodeURIComponent(r.headers.get('location') ?? '');

try {
  const bad301 = [];
  for (const row of T.rows.filter((x) => x.status === 301)) {
    const r = await get(row.from);
    if (r.status !== 301 || loc(r) !== row.to) bad301.push(`${row.from} → ${r.status} ${loc(r)}`);
  }
  check(`all ${T.rows.filter((x) => x.status === 301).length} table 301 rows answer 301 with their target`, bad301.length === 0, bad301.slice(0, 3).join(' | ') || 'all');

  const bad410 = [];
  for (const row of T.rows.filter((x) => x.status === 410)) { const r = await get(row.from); if (r.status !== 410) bad410.push(`${row.from} ${r.status}`); }
  check('all 410 rows answer 410', bad410.length === 0, bad410.join(' | ') || 'all');

  const pend = [];
  for (const row of T.rows.filter((x) => x.status === 'pending' || x.status === 'review')) {
    const r = await get(row.from);
    const elRoot = row.from.startsWith('/el/') && loc(r) === row.from.slice(3);   // the generic /el/x → /x rule, not the table
    if (r.status === 301 && !elRoot) pend.push(`${row.from} → ${loc(r)}`);
  }
  check('pending rows are not redirected by the table', pend.length === 0, pend.slice(0, 3).join(' | ') || 'none');

  const live = [];
  for (const p of R.pages.filter((x) => x.status !== 'dropped').flatMap((x) => Object.values(x.paths ?? {}))) {
    const r = await get(p);
    if (r.status === 301 || r.status === 302 || r.status === 410) live.push(`${p} ${r.status} ${loc(r)}`);
  }
  check('no registry page is redirected or gone', live.length === 0, live.slice(0, 3).join(' | ') || 'none');

  const q = await get('/en/property-for-sale-in-greece?utm_source=x');
  check('query string kept', q.status === 301 && (q.headers.get('location') ?? '').endsWith('?utm_source=x'), `${q.status} ${q.headers.get('location')}`);
  const rs = await get('/rs/nekretnine');
  check('/rs → /sr (legacy rule)', rs.status === 301 && loc(rs) === '/sr/nekretnine', `${rs.status} ${loc(rs)}`);
  const id = await get('/en/some-villa-ID10008');
  check('/<lang>/…-ID123 → the property page (legacy rule)', id.status === 301 && loc(id) === '/en/property/10008', `${id.status} ${loc(id)}`);
  const gone = await get('/en/property/999999');
  check('a property that is not published answers 410 (D6)', gone.status === 410, String(gone.status));
  const there = await get('/en/property/10008');
  check('a published property answers 200', there.status === 200, String(there.status));
  for (const p of ['/en', '/en/properties', '/en/services/seller-services', '/en/contact']) {
    const s = (await get(p)).status;
    check(`live page ${p} not redirected`, s === 200, String(s));
  }
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
