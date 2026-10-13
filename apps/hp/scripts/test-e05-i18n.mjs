// Acceptance for M1-S05 (B-14, B-15) against the stub API: the account label and the site's own
// form errors appear in the page language, and no API answer of the site carries Greek text.
// The dictionaries themselves (B-02, B-25) are covered by scripts/test-i18n-guard.mjs.
// Usage (from site/, after `pnpm build`): node scripts/test-e05-i18n.mjs   → exit 1 on any FAIL.
import { spawn } from 'node:child_process';
import { register } from 'node:module';
import { startStub } from './stub-api.mjs';

register(new URL('./ts-hooks.mjs', import.meta.url));
const { t, LANGS, prefix } = await import(new URL('../src/lib/i18n.ts', import.meta.url));

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const stub = await startStub({ port: 4339, n: 30 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

try {
  // B-14 — the account label for a member without a first name, in every language.
  for (const lang of LANGS) {
    const html = await (await fetch(`${SITE}${prefix(lang) || ''}/`, { headers: { cookie: 'member_token=stub-noname' } })).text();
    const want = esc(t(lang, 'pnl.title'));
    const header = /class="acct"[^>]*>([^<]*)</.exec(html)?.[1] ?? '';
    const menu = /data-ev="panel:menu"[^>]*>([^<]*)</.exec(html)?.[1] ?? '';
    const ok = header === want && menu === want && (lang === 'el' || !html.includes('Ο λογαριασμός μου'));
    check(`B-14 account label [${lang}]`, ok, `header="${header}" menu="${menu}"`);
  }

  // B-15 — the endpoints answer with codes, never with Greek text.
  const post = (path, body, cookie) => fetch(SITE + path, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://hp.rewize.app', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, text: await r.text() }));
  const cases = [
    ['/api/auth/verify', { identifier: 'stub@example.com', code: '12' }, null, 'code_len'],
    ['/api/auth/complete', { step: 'send', name: 'A' }, null, 'expired'],
    ['/api/auth/complete', { step: 'verify', code: '1' }, 'member_token=stub-token', 'code_len'],
    ['/api/auth/complete', { step: 'send' }, 'member_token=stub-token', 'fill'],
    ['/api/panel/submit', { area: 'x' }, null, 'expired'],
    ['/api/panel/submit', { area: 'x' }, 'member_token=stub-noname', 'name_first'],
    ['/api/panel/submit', { area: '' }, 'member_token=stub-token', 'area'],
  ];
  for (const [path, body, cookie, code] of cases) {
    const r = await post(path, body, cookie);
    const j = JSON.parse(r.text);
    check(`B-15 ${path} → code ${code}`, j.code === code && !GREEK.test(r.text), r.text.slice(0, 90));
  }

  // B-15 — the pages carry the translated text for every code they may receive.
  const L = (html) => JSON.parse((/data-i18n="([^"]*)"/.exec(html)?.[1] ?? '{}').replace(/&quot;|&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  for (const lang of ['en', 'he', 'ru']) {
    const login = L(await (await fetch(`${SITE}${prefix(lang)}/login`)).text());
    const need = ['e_code_len', 'e_code_bad', 'e_need_email', 'e_expired', 'e_fill', 'e_save', 'e_offline'];
    const miss = need.filter((k) => !login[k] || (lang !== 'el' && GREEK.test(login[k])));
    check(`B-15 login texts [${lang}]`, !miss.length, miss.length ? `missing/Greek: ${miss}` : `${need.length} codes translated`);
    const sub = L(await (await fetch(`${SITE}${prefix(lang)}/panel/submit`, { headers: { cookie: 'member_token=stub-token' } })).text());
    const needS = ['e_area', 'e_fail', 'e_offline', 'e_expired', 'e_name_first'];
    const missS = needS.filter((k) => !sub[k] || GREEK.test(sub[k]));
    check(`B-15 submit texts [${lang}]`, !missS.length, missS.length ? `missing/Greek: ${missS}` : `${needS.length} codes translated`);
  }
  // B-25 — land facts on a land property, in the two scripts that fell back to English before.
  const { LAND_TEXT } = await import(new URL('../src/lib/property.ts', import.meta.url));
  for (const lang of ['ru', 'he', 'tr']) {
    const html = await (await fetch(`${SITE}${prefix(lang)}/${(await import(new URL('../src/lib/i18n.ts', import.meta.url))).SLUG[lang].property}/10002`)).text();
    const want = [LAND_TEXT.LBL.buildable[lang], LAND_TEXT.BUILDABLE['1'][lang], LAND_TEXT.LBL.orient[lang], LAND_TEXT.ORIENT['9'][lang], LAND_TEXT.YES_NO.YES[lang], LAND_TEXT.ROAD.dirt[lang]].map(esc);
    const miss = want.filter((w) => !html.includes(w));
    const english = ['Road access', 'Orientation', 'Panoramic', 'Dirt road'].filter((w) => html.includes(w));
    check(`B-25 land facts [${lang}]`, !miss.length && !english.length, miss.length || english.length ? `missing ${miss} · English ${english}` : `${want.length} labels/values in ${lang}`);
  }
} finally {
  site.kill();
  stub.server.close();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
