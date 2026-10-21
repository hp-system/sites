// Anonymous cookie-choice counting: endpoint, banner beacons, report script.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331), captures its stdout.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-consent-stat.mjs
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

// 1 — the banner sends one beacon per choice (source check, the script is client-side).
const src = readFileSync(new URL('../src/components/CookieConsent.astro', import.meta.url), 'utf8');
check('banner sends a beacon to /api/consent-stat', /sendBeacon\?\.\('\/api\/consent-stat'/.test(src));
for (const c of ['accept', 'reject', 'custom']) check(`banner counts "${c}"`, src.includes(`count('${c}'`));

// 2 — the report script turns sample lines into percentages.
const repPath = new URL('./consent-report.mjs', import.meta.url);
if (existsSync(repPath)) {
  const { parse, summarise } = await import(repPath.href);
  const L = (o) => `x consent_stat ${JSON.stringify({ day: '2026-12-01', env: 'production', analytics: false, marketing: false, device: 'mobile', lang: 'en', country: 'DE', page: 'home', ...o })}`;
  const text = [L({ choice: 'accept', analytics: true, marketing: true }), L({ choice: 'reject' }), L({ choice: 'reject', country: 'RS' }), L({ choice: 'custom', analytics: true }), L({ choice: 'accept', env: 'preview' })].join('\n');
  const s = summarise(parse(text));
  check('report keeps production only', s.all.total === 4, `total=${s.all.total}`);
  check('report counts choices', s.all.accept === 1 && s.all.reject === 2 && s.all.custom === 1, JSON.stringify(s.all));
  check('report groups by country', s.country[0][0] === 'DE' && s.country[0][1].total === 3);
} else check('report script exists', false);

// 3 — the endpoint.
const stub = await startStub({ port: 4339, n: 20 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
let log = '';
site.stdout.on('data', (d) => (log += d)); site.stderr.on('data', (d) => (log += d));
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
const post = (body, headers = {}) => fetch(SITE + '/api/consent-stat', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-ipcountry': 'GR', 'x-forwarded-for': '203.0.113.7', referer: 'https://hp.rewize.app/en/articles/buyers/x', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
try {
  const ok = { choice: 'reject', analytics: false, marketing: false, device: 'mobile', lang: 'en' };
  const r1 = await post(ok);
  check('valid payload → 204', r1.status === 204, `got ${r1.status}`);
  for (const [name, bad] of [['unknown choice', { ...ok, choice: 'maybe' }], ['extra field', { ...ok, id: 'abc' }], ['bad device', { ...ok, device: 'tv' }], ['bad lang', { ...ok, lang: 'xx' }], ['not json', 'hello']]) {
    const r = await post(bad, { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200)}` });
    check(`invalid (${name}) → 400`, r.status === 400, `got ${r.status}`);
  }
  const g = await fetch(SITE + '/api/consent-stat');
  check('GET → 405', g.status === 405, `got ${g.status}`);
  const x = await post(ok, { origin: 'https://evil.example' });
  check('foreign origin → 403', x.status === 403, `got ${x.status}`);
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await post(ok, { 'x-forwarded-for': '192.0.2.55' })).status;
  check('rate limit → 429 after 5/min', last === 429, `last=${last}`);
  await sleep(300);
  const lines = log.split('\n').filter((l) => l.startsWith('consent_stat '));
  check('a consent_stat line is logged', lines.length >= 1, `${lines.length} lines`);
  const first = lines[0] ? JSON.parse(lines[0].slice(13)) : {};
  check('line has country, page group, env', first.country === 'GR' && first.page === 'article' && first.env === 'preview', JSON.stringify(first));
  check('no IP in any log line', !lines.some((l) => /203\.0\.113\.7|192\.0\.2\.55|198\.51\.100\./.test(l)));
} finally {
  site.kill(); stub.close?.();
}
console.log(fails ? `\n${fails} FAIL` : '\nall OK');
process.exit(fails ? 1 : 0);
