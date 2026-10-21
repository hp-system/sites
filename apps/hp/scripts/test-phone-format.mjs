// The company phone appears everywhere as «+30 2311 24.12.24» (George 21/10/2026).
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-phone-format.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 60, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const WANT = '+30 2311 24.12.24';
const BAD = [/2311 2412 24/, /\(\+30\)\s*2311/, /2311 241224/, /2311241224(?![^<]*(?:tel:|wa\.me))/];
try {
  for (const path of ['/en', '/', '/en/contact', '/en/properties', '/en/property-for-sale/kassandra']) {
    const res = await fetch(SITE + path);
    const html = await res.text();
    // visible text only: drop tags' attributes (tel: links keep digits on purpose)
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    check(`${path} shows ${WANT}`, text.includes(WANT), text.includes(WANT) ? 'found' : `status ${res.status}, not found`);
    const bad = BAD.find((re) => re.test(text));
    check(`${path} has no other phone format`, !bad, bad ? `found ${bad}` : 'clean');
  }
  const { formatCompanyPhone } = await import('../src/lib/phone.ts');
  if (formatCompanyPhone) {
    for (const v of ['(+30) 2311 24.12.24', '2311241224', '+302311241224', '0030 2311 2412 24', '+30 2311 2412 24']) {
      check(`format «${v}»`, formatCompanyPhone(v) === WANT, formatCompanyPhone(v));
    }
  }
} finally {
  site.kill(); stub.close?.();
}
process.exit(fails ? 1 : 0);
