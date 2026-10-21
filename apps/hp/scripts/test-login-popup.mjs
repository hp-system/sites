// Sign-in popup (q05, George 21/10/2026): every page carries the dialog; the login page in
// embed mode has no header, no cookie banner, no second dialog; only our own pages may frame
// the login page. The click-to-popup itself runs in the browser (checked by hand on 21/10).
// Usage (from apps/hp, after `pnpm build`): node scripts/test-login-popup.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const stub = await startStub({ port: 4339, n: 20 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], { env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' } });
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
try {
  for (const p of ['/en', '/en/properties', '/en/property/10008', '/de']) {
    const h = await (await fetch(SITE + p)).text();
    check(`${p}: sign-in dialog present`, h.includes('id="lgd"') && /<dialog/.test(h), 'dialog');
  }
  const r = await fetch(SITE + '/en/login?embed=1&next=%2Fen%2Fproperty%2F10008');
  const e = await r.text();
  check('embed login: frame-ancestors self', r.headers.get('content-security-policy') === "frame-ancestors 'self'", String(r.headers.get('content-security-policy')));
  check('embed login: no header, no cookie banner, no nested dialog', !/<header/.test(e) && !e.includes('id="cc"') && !e.includes('id="lgd"') && e.includes('data-embed="1"'), 'bare');
  const n = await (await fetch(SITE + '/en/login')).text();
  check('normal login: header + banner, not embed', /<header/.test(n) && n.includes('id="cc"') && !n.includes('data-embed="1"'), 'full');
} finally { site.kill(); stub.server?.close?.(); }
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
