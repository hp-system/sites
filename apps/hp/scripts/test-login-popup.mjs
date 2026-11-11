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
  check('embed login: no header, no cookie banner, no nested dialog', !/<header/.test(e) && !e.includes('id="cc"') && !e.includes('id="lgd"'), 'bare');
  const n = await (await fetch(SITE + '/en/login')).text();
  check('normal login: header + banner, not embed', /<header/.test(n) && n.includes('id="cc"') && !n.includes('data-embed="1"'), 'full');
  // #104: the desktop popup (embed=1&pop=1) — new steps, same protections.
  const pr = await fetch(SITE + '/en/login?embed=1&pop=1&next=%2Fen%2Fproperty%2F10008');
  const ph = await pr.text();
  check('pop login: frame-ancestors self', pr.headers.get('content-security-policy') === "frame-ancestors 'self'", String(pr.headers.get('content-security-policy')));
  check('pop login: noindex', /<meta name="robots" content="noindex/.test(ph), 'noindex');
  check('pop login: bare (no header, banner, nested dialog)', !/<header/.test(ph) && !ph.includes('id="cc"') && !ph.includes('id="lgd"'), 'bare');
  // the role first (LoginRole, Sergei 2026-11-11): buy / sell / agent, Continue only after a pick
  check('pop login: the role first (buy / sell / agent)', ph.includes('id="pr"') && (ph.match(/class="rl__o"/g) ?? []).length === 3 && !ph.includes('id="gor"'), 'role');
  check('pop login: steps name+mobile → email → code → welcome', ['id="p0"', 'id="fn"', 'id="sn"', 'id="ph"', 'id="p1"', 'id="em"', 'id="p2"', 'id="cd"', 'id="p4"'].every((x) => ph.includes(x)), 'steps');
  check('pop login: Continue disabled until consent', /<input type="checkbox" id="agree"/.test(ph) && /id="go0" disabled/.test(ph), 'gated');
  check('pop login: no Google button (no Google sign-in in the API)', !ph.includes('id="google"'), 'off');
  check('pop login: country-code picker with search', ph.includes('data-dial-q') && ph.includes('data-cc="GR"') && ph.includes('data-cc="DE"'), 'picker');
  check('pop login: foreign next not kept', !(await (await fetch(SITE + '/en/login?embed=1&pop=1&next=https%3A%2F%2Fevil.example')).text()).includes('evil.example'), 'safe');
  const de = await (await fetch(SITE + '/de/login?embed=1&pop=1')).text();
  check('pop login (de): own texts', de.includes('Fügen Sie Ihre E-Mail hinzu') && de.includes('Freischalten'), 'de');
  const plain = await (await fetch(SITE + '/en/login?pop=1')).text();
  // one sign-in since 2026-11-11 (no separate login page): /login opened directly is the same window, with the header
  check('/login without embed → the same window with the site header', plain.includes('id="pr"') && /<header/.test(plain) && plain.includes('lp--page'), 'one window');
} finally { site.kill(); stub.server?.close?.(); }
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
