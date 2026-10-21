// The 301 engine (#56): every old URL in content/redirects/*.json and every article `old_url`
// answers with a redirect to a page that answers 200; English → 301, other languages → 302;
// the query string survives; nothing that is a page today is redirected.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-redirects.mjs
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const entries = [];
for (const f of ['listings', 'articles', 'services']) {
  for (const r of JSON.parse(readFileSync(`src/content/redirects/${f}.json`, 'utf8')).redirects) entries.push(r);
}
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const f of walk('src/content/articles/en').filter((x) => x.endsWith('.md'))) {
  const t = readFileSync(f, 'utf8');
  const o = (t.match(/^old_url:\s*['"]?([^'"\n]+)/m) || [])[1];
  const c = (t.match(/^clean_url:\s*['"]?([^'"\n]+)/m) || [])[1];
  if (o && c && o.toLowerCase() !== c.toLowerCase()) entries.push({ from: o, to: c, lang: 'en' });
}

const stub = await startStub({ port: 4339, n: 30 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
const enc = (p) => encodeURI(p);

try {
  const bad = [];
  const targets = new Set();
  for (const e of entries) {
    const r = await fetch(SITE + enc(e.from), { redirect: 'manual' });
    const want = (e.lang ?? e.from.split('/')[1]) === 'en' ? 301 : 302;
    const loc = decodeURIComponent(r.headers.get('location') ?? '');
    if (r.status !== want || loc.split('#')[0] !== e.to.split('#')[0]) bad.push(`${e.from} → ${r.status} ${loc}`);
    targets.add(e.to.split('#')[0]);
  }
  check(`all ${entries.length} old URLs redirect to their page (EN 301, others 302)`, bad.length === 0, bad.slice(0, 3).join(' | ') || 'all');
  const dead = [];
  for (const t of targets) { const s = (await fetch(SITE + enc(t), { redirect: 'manual' })).status; if (s !== 200) dead.push(`${t} ${s}`); }
  check(`all ${targets.size} targets answer 200`, dead.length === 0, dead.slice(0, 3).join(' | ') || 'all');
  const q = await fetch(SITE + '/en/properties-in-halkidiki-greece/land-halkidiki/?utm_source=x', { redirect: 'manual' });
  check('trailing slash + query string kept', q.status === 301 && q.headers.get('location') === '/en/property-for-sale/land?utm_source=x', `${q.status} ${q.headers.get('location')}`);
  const h = await fetch(SITE + '/en/services/seller-services/energy-efficiency-certificates-pea', { redirect: 'manual' });
  check('sub-service → section anchor', h.headers.get('location') === '/en/services/seller-services#energy-efficiency-certificates-pea', h.headers.get('location'));
  for (const p of ['/en', '/en/properties', '/en/property-for-sale/land', '/en/services/seller-services', '/en/contact']) {
    const s = (await fetch(SITE + p, { redirect: 'manual' })).status;
    check(`live page ${p} not redirected`, s === 200, String(s));
  }
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
