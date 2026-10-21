// Call-me-back (#82, mockup approved by George 21/10/2026): the link next to the phone, the mobile
// Call sheet, /api/callback (phone check, honeypot, member, limit) and the visit form's lead address.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-callback.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 30, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const post = (body, headers = {}) => fetch(SITE + '/api/callback', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: SITE, ...headers }, body: JSON.stringify(body),
});
const inquiries = async () => (await (await fetch(stub.base.replace(/\/api$/, '') + '/__captured')).json())
  .filter((c) => c.path === '/api/site/inquiry');
const t = Date.now() - 10_000;

try {
  const el = await (await fetch(SITE + '/' + encodeURIComponent('ακινητο') + '/10005')).text();
  check('Greek page: link next to the phone', /class="cb-open"[^>]*>να σε καλέσουμε</.test(el), 'cb-open');
  check('desktop panel starts closed', /<form[^>]*id="cb-d"[^>]*hidden/.test(el), 'hidden');
  check('panel title with the property', el.includes('Να σε καλέσουμε για το #10005'), 'title');
  check('three time choices', ['Όσο πιο σύντομα', 'Πρωί', 'Απόγευμα'].every((x) => el.includes(x)), 'when');
  check('country list with Greece and Germany', el.includes('value="30" data-cc="GR"') && el.includes('value="49" data-cc="DE"'), 'dial');
  check('mobile bar Call opens the sheet', /data-callsheet[^>]*data-ev="lead:callsheet_open"/.test(el) && el.includes('id="callsheet"'), 'sheet');
  check('sheet: call us now + we call you', el.includes('Πάρε μας τώρα') && el.includes('ή να σε καλέσουμε εμείς') && el.includes('id="cb-m"'), 'both');
  check('honeypot in the panel', /id="cb-d"[\s\S]*?name="website"/.test(el), 'hp');
  const en = await (await fetch(SITE + '/en/property/10005')).text();
  check('English texts', en.includes('we call you') && en.includes('Call me') && en.includes('When suits you?'), 'en');

  const ok = await post({ code: '30', phone: '694 512 3456', when: 'morning', propertyId: '10005', lang: 'el', t });
  const okj = await ok.json();
  check('guest: accepted', ok.status === 200 && okj.ok && okj.phone === '+306945123456', `${ok.status} ${JSON.stringify(okj)}`);
  await sleep(150);
  let caps = await inquiries();
  const g = caps.at(-1)?.body ?? {};
  check('guest: filed under one address per number', g.email === 'p306945123456@lead.local', g.email);
  check('guest: message has time and number', g.message === '[Call back] when=morning; phone=+306945123456' && g.propertyId === '10005', g.message);

  const bad = await post({ code: '30', phone: '694 512', when: 'asap', propertyId: '10005', lang: 'el', t });
  check('short Greek number refused with code gr', bad.status === 400 && (await bad.json()).code === 'gr', `${bad.status}`);

  for (const [code, phone] of [['1', '694 512'], ['49', '151 23'], ['1', '415 555 01']]) {
    const r = await post({ code, phone, propertyId: '10005', t });
    check(`+${code} ${phone} refused as too short`, r.status === 400 && (await r.json()).code === 'short', `${r.status}`);
  }
  const n0 = (await inquiries()).length;
  const trap = await post({ code: '30', phone: '6945123456', website: 'x', propertyId: '10005', t });
  const fast = await post({ code: '30', phone: '6945123456', propertyId: '10005', t: Date.now() });
  await sleep(150);
  check('robots get a quiet ok and nothing is sent', trap.status === 200 && fast.status === 200 && (await inquiries()).length === n0, 'trap+timer');

  const mem = await post({ code: '49', phone: '0151 2345 6789', when: 'asap', propertyId: '10005', lang: 'en', t },
    { cookie: 'member_token=stub-token' });
  await sleep(150);
  caps = await inquiries();
  const m = caps.at(-1)?.body ?? {};
  check('member: filed under their own contact', mem.status === 200 && m.email === 'stub@example.com' && m.name === 'Stub User' && m.phone === '+4915123456789', `${m.email} ${m.phone}`);

  let last = 0;
  for (let i = 0; i < 5; i++) last = (await post({ code: '44', phone: '7700 900123', propertyId: '10005', t })).status;
  check('more than 5 an hour → 429', last === 429, `${last}`);
} finally {
  site.kill(); stub.server?.close?.(); stub.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
