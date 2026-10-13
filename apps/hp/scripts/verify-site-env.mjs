// Acceptance for SITE_ENV (E-01, traps T-A01): starts the BUILT server once per SITE_ENV value on
// 127.0.0.1:4331 (no API needed), probes /robots.txt with and without the production host header.
// Usage (from site/, after `pnpm build`): node scripts/verify-site-env.mjs   → exit 1 on any FAIL.
import { spawn } from 'node:child_process';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROD = 'www.halkidikiproperties.com';
const cases = [
  ['preview', PROD, true], ['preview', null, true],
  ['production', null, false], ['production', PROD, false],
  ['', PROD, false], ['', null, true],
];
let fails = 0;
for (const env of ['preview', 'production', '']) {
  const e = { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: 'http://127.0.0.1:9/api' };
  if (env) e.SITE_ENV = env; else delete e.SITE_ENV;
  const srv = spawn(process.execPath, ['dist/server/entry.mjs'], { env: e });
  let log = ''; srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:4331/robots.txt'); break; } catch { await sleep(250); } }
  console.log(`SITE_ENV=${env || '(unset)'} log: ${(log.match(/\[hp-site\][^\n]*/) || ['none'])[0]}`);
  for (const [cEnv, host, expectNoindex] of cases.filter((c) => c[0] === env)) {
    const r = await fetch('http://127.0.0.1:4331/robots.txt', { headers: host ? { 'x-forwarded-host': host } : {} });
    const body = await r.text();
    const xr = r.headers.get('x-robots-tag');
    const ok = !!xr === expectNoindex;
    if (!ok) fails++;
    console.log(`  host=${host ?? 'localhost'} → X-Robots-Tag=${xr ?? '—'} robots.txt=${body.split('\n')[0].slice(0, 50)} ${ok ? 'OK' : 'FAIL'}`);
  }
  srv.kill(); await sleep(500);
}
console.log(fails ? `${fails} FAIL` : 'ALL OK'); process.exit(fails ? 1 : 0);
