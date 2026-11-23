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
  for (const p of ['/en/login', '/en/login?embed=1&pop=1', '/en', '/en/property/10008', '/en/panel/submit']) {
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

  // #64 — a signed-in member's forms come filled with their own details; a guest's never.
  const mp = await fetch(SITE + '/en/property/10008', { headers: M });
  const mh = await mp.text();
  check('member: request form prefilled (name, email)', /id="qf-n"[^>]*value="Stub User"/.test(mh) && /id="qf-e"[^>]*value="stub@example.com"/.test(mh), 'values');
  check('member page is private (no shared cache)', /private|no-store/.test(mp.headers.get('cache-control') ?? ''), mp.headers.get('cache-control') ?? 'none');
  const gh = await (await fetch(SITE + '/en/property/10008')).text();
  check('guest: forms empty', !/id="qf-[nep]"[^>]*value=/.test(gh) && !gh.includes('stub@example.com'), 'empty');
  const ch = await (await fetch(SITE + '/en/contact', { headers: M })).text();
  check('member: contact form prefilled', /name="name"[^>]*value="Stub User"/.test(ch) && /name="email"[^>]*value="stub@example.com"/.test(ch), 'values');
  const cg = await (await fetch(SITE + '/en/contact')).text();
  check('guest: contact form empty', !cg.includes('stub@example.com'), 'empty');

  // #73 — hearts on cards, login redirect, no count in the closed collection, hidden prices for Exclusive.
  const lg = await (await fetch(SITE + '/en/properties')).text();
  check('guest: card heart leads to sign-in and back', /<a class="heart" href="\/en\/login\?next=%2Fen%2Fproperties"/.test(lg) && !/button class="heart"/.test(lg), 'link');
  await post({ ref: '10010' });
  const lm = await (await fetch(SITE + '/en/properties', { headers: M })).text();
  check('member: card hearts are toggles, saved one pressed', /button class="heart"[^>]*data-fav="10010"[^>]*aria-pressed="true"/.test(lm) && /button class="heart"[^>]*data-fav="10011"[^>]*aria-pressed="false"/.test(lm), 'pressed');
  await post({ ref: '10010' });
  const rl = await fetch(SITE + '/en/login?next=%2Fen%2Fproperty%2F10008', { headers: M, redirect: 'manual' });
  check('member opening /login → next', rl.status === 302 && rl.headers.get('location') === '/en/property/10008', `${rl.status} ${rl.headers.get('location')}`);
  const rl2 = await fetch(SITE + '/en/login?next=https%3A%2F%2Fevil.example', { headers: M, redirect: 'manual' });
  check('member opening /login with a foreign next → panel', rl2.headers.get('location') === '/en/panel', String(rl2.headers.get('location')));
  const coll = await (await fetch(SITE + '/en/panel/collection', { headers: M })).text();
  check('closed collection shows no count', !/\d+\s+propert(y|ies)<\/p>/.test(coll), 'no count');
  const X = { cookie: 'member_token=stub-exclusive' };
  const hx = await (await fetch(SITE + '/en/property/10009', { headers: X })).text();
  const hm = await (await fetch(SITE + '/en/property/10009', { headers: M })).text();
  check('hidden price: Exclusive sees it, member does not', /€109,000/.test(hx) && !/€109,000/.test(hm), 'exclusive only');
  // #74 — panel tabs, request + Exclusive request through the CRM, compare inside favourites, logout scopes.
  const pb = await (await fetch(SITE + '/en/panel', { headers: M })).text();
  // design E3 since 2026-11-11 (Sergei «AFTER main v3»): /panel sends the member where something waits; the side
  // panel carries the Buy / Sell tabs (Buy current), the sections, no cooperation for a member
  // 2026-11-23 (Sergei, E3 by role): a buyer (the CRM sends no role yet) has no Buy / Sell tabs; the selling door
  // under the menu; no cooperation for a member
  check('panel E3: lands on a section, buyer: no tabs, the selling door', !/class="ps__tabs"/.test(pb) && /class="ps__sell"/.test(pb)
    && pb.includes('href="/en/panel/submit"') && !pb.includes('?tab=coop'), 'tabs');
  // the closed collection is a row for everyone since 2026-11-23 (locked inside unless Exclusive)
  check('panel: request + closed collection rows, no compare row', pb.includes('href="/en/panel/request"') && pb.includes('href="/en/panel/collection"') && !pb.includes('href="/en/panel/compare"'), 'rows');
  const ps = await (await fetch(SITE + '/en/panel?tab=sell', { headers: M })).text();
  // the Sell tab lands on «send a property» (the owner statistics wait for the CRM: not shown, not invented)
  check('panel sell tab: the submit form, the selling door current', /class="ps__sell"[^>]*aria-current="page"/.test(ps) && ps.includes('class="sb'), 'sell');
  const before = (await (await fetch(stub.base.replace('/api', '') + '/__captured')).json()).length;
  const rq = (b) => fetch(SITE + '/api/panel/request', { method: 'POST', headers: { ...M, 'content-type': 'application/json', origin: SITE }, body: JSON.stringify(b) }).then((r) => r.json());
  const r1 = await rq({ type: 'request', kind: 'home', where: 'Sithonia', maxPrice: '450,000', lang: 'en' });
  const r2 = await rq({ type: 'exclusive', note: 'Seafront villa', lang: 'en' });
  const r3 = await rq({ type: 'request', kind: 'castle' });
  const cap = (await (await fetch(stub.base.replace('/api', '') + '/__captured')).json()).slice(before).filter((c) => c.path === '/api/site/inquiry');
  check('request → CRM inquiry with member data', r1.ok && cap.some((c) => c.body?.message === '[Request] kind=home; where=Sithonia; max=€450,000' && c.body?.email === 'stub@example.com'), JSON.stringify(cap.map((c) => c.body?.message)));
  check('Exclusive request → CRM inquiry', r2.ok && cap.some((c) => c.body?.message === '[Exclusive request] Seafront villa'), 'sent');
  check('bad kind refused', r3.ok === false && r3.code === 'kind', JSON.stringify(r3));
  const rg = await fetch(SITE + '/api/panel/request', { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE }, body: '{}' }).then((r) => r.json());
  check('guest request refused', rg.code === 'expired', JSON.stringify(rg));
  const rpage = await (await fetch(SITE + '/en/panel/request', { headers: M })).text();
  // 2026-11-23: the Requests page — «Add a request» opens the list's filter window in request mode; no contact fields
  check('request page: add opens the filter window, no contact fields', rpage.includes('data-fs-open') && rpage.includes('data-mode="request"') && !rpage.includes('name="email"'), 'form');
  await post({ ref: '10010' }); await post({ ref: '10011' });
  const fv = await (await fetch(SITE + '/en/panel/favorites', { headers: M })).text();
  check('favourites: Compare button with 2+ saved', fv.includes('href="/en/panel/compare"'), 'button');
  await post({ ref: '10010' }); await post({ ref: '10011' });
  const capBefore = (await (await fetch(stub.base.replace('/api', '') + '/__captured')).json()).length;
  const lo1 = await fetch(SITE + '/api/auth/logout', { method: 'POST', headers: { ...M, origin: SITE, 'content-type': 'application/x-www-form-urlencoded' }, body: '', redirect: 'manual' });
  const lo2 = await fetch(SITE + '/api/auth/logout', { method: 'POST', headers: { ...M, origin: SITE, 'content-type': 'application/x-www-form-urlencoded' }, body: 'scope=all', redirect: 'manual' });
  const caps = (await (await fetch(stub.base.replace('/api', '') + '/__captured')).json()).slice(capBefore).filter((c) => c.path === '/api/site/member/logout');
  check('sign out: this device does not call the CRM, everywhere does', lo1.status === 303 && lo2.status === 303 && caps.length === 1, `${caps.length} CRM logout(s)`);

  const { crmError } = await import('../src/lib/crmerror.ts');
  check('CRM errors → codes', crmError(401, { message: 'Λάθος κωδικός. Απομένουν 2 προσπάθειες.' }, 'code_bad').left === 2
    && crmError(401, { message: 'Ο λογαριασμός έχει ανασταλεί.' }, 'code_bad').code === 'suspended'
    && crmError(429, { retryAfterSec: 90 }, 'code_bad').retryAfterSec === 90
    && crmError(401, { message: 'Ο κωδικός δεν ισχύει πια. Ζήτησε νέον.' }, 'code_bad').code === 'expired', 'mapped');
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
