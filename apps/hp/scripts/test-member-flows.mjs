// Member flows found broken in the end-to-end test of 21/10/2026 (#59):
//  · the login page's country select had id="cc" — the cookie banner's id — so on the login
//    page the banner's buttons were never wired (TypeError, banner stuck for new visitors);
//  · CRM messages (Greek) were shown on English pages;
//  · the favourite button sent signed-in members to the login page.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-member-flows.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 30 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: SITE },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
const M = { cookie: 'member_token=stub-token' };

try {
  for (const p of ['/en/login', '/en', '/en/property/10008', '/en/panel/submit']) {
    const h = await (await fetch(SITE + p, { headers: p.includes('panel') ? M : {} })).text();
    const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
    check(`${p}: no duplicate element ids`, dup.length === 0, dup.join(',') || 'unique');
  }
  for (const f of ['LoginPage', 'SubmitPage']) {
    const src = readFileSync(`src/components/${f}.astro`, 'utf8');
    check(`${f}: CRM message only on Greek pages`, /lang\.startsWith\('el'\) \? \w\?\.message/.test(src), 'gated');
  }
  const g = await (await fetch(SITE + '/en/property/10008')).text();
  check('guest: favourite leads to sign-up', /<a class="btn btn--fav" href="\/en\/login\?next=/.test(g) && !g.includes('id="fav"'), 'link');
  const m1 = await (await fetch(SITE + '/en/property/10008', { headers: M })).text();
  check('member: favourite is a toggle, not pressed', /id="fav"[^>]*aria-pressed="false"/.test(m1) || /aria-pressed="false"[^>]*id="fav"/.test(m1), 'button');
  const post = (body, h = M) => fetch(SITE + '/api/panel/favorite', { method: 'POST', headers: { ...h, 'content-type': 'application/json', origin: SITE }, body: JSON.stringify(body) }).then((r) => r.json());
  const a = await post({ ref: '10008' });
  check('member: save → favorite true', a.ok === true && a.favorite === true && a.total === 1, JSON.stringify(a));
  const m2 = await (await fetch(SITE + '/en/property/10008', { headers: M })).text();
  check('member: page shows it saved (cache forgotten)', /aria-pressed="true"/.test(m2) && m2.includes('>Saved<'), 'pressed');
  const b = await post({ ref: '10008' });
  check('member: second press → unsaved', b.ok === true && b.favorite === false, JSON.stringify(b));
  const c = await post({ ref: '10008' }, {});
  check('guest POST → expired, nothing saved', c.ok === false && c.code === 'expired', JSON.stringify(c));
  const d = await post({ ref: '<script>' });
  check('bad ref rejected', d.ok === false && d.code === 'ref', JSON.stringify(d));
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
