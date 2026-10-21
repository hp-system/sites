// Property page go-live batch 1 (#88, audit 21/10/2026): floors, title, type and municipality in
// the page language, energy letters, distance labels, privacy line under every form, phone
// numbers left-to-right, 503 when the CRM does not answer.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-golive1.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const startSite = (api) => spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: api, SITE_ENV: 'preview' },
});
const up = async () => { for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); return; } catch { await sleep(250); } } };
const page = async (path) => {
  const res = await fetch(SITE + path);
  const html = await res.text();
  return { status: res.status, html, text: html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
};
const titleOf = (h) => (h.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';

const stub = await startStub({ port: 4339, n: 30, variety: true });
let site = startSite(stub.base);
await up();
try {
  const en = await page('/en/property/10015');
  check('floors: ground floor and floor 1, no basement', /class="fl__h"[^>]*>Floor 1</.test(en.html) && /class="fl__h"[^>]*>Ground floor</.test(en.html) && !en.html.includes('>Basement<'), 'fl');
  check('title as the old site (en)', titleOf(en.html) === 'Detached house for sale in Nea Propontida, Halkidiki, Greece | #10015', titleOf(en.html));
  const el = await page('/' + encodeURIComponent('ακινητο') + '/10015');
  check('title in Greek', titleOf(el.html) === 'Μονοκατοικία προς πώληση — Νέα Προποντίδα, Χαλκιδική | #10015', titleOf(el.html));
  const ru = await page('/ru/obekt/10015');
  check('ru: Russian type, not Bulgarian', ru.html.includes('Отдельный дом') && !ru.html.includes('Самостоятелна'), titleOf(ru.html));
  const he = await page('/he/neches/10015');
  check('he: Hebrew type, not English', /<h1[^>]*>[^<]*בית פרטי/.test(he.html), titleOf(he.html));
  check('he: phone isolated left-to-right', /<bdi dir="ltr"[^>]*>\+30[^<]*<\/bdi>/.test(he.html), 'bdi');
  const cls = (h) => (h.match(/<div[^>]*><b[^>]*>([^<]+)<\/b><span[^>]*>(?:Energy|Ενεργειακή)</) ?? [])[1];
  check('energy class Latin outside Greek (Δ → D)', cls(en.html) === 'D', String(cls(en.html)));
  check('energy class stays Greek in Greek', cls(el.html) === 'Δ', String(cls(el.html)));
  const de = await page('/de/immobilie/10015');
  check('distances in German, no «Drag Store»', de.text.includes('Apotheke') && de.text.includes('Flughafen') && !de.text.includes('Drag Store'), 'poi');
  check('distances in English: Pharmacy', en.text.includes('Pharmacy') && !en.text.includes('Drag Store'), 'poi');
  const privCount = (en.html.match(/class="[^"]*\bqf__priv\b[^"]*"[^>]*>We use your details only to answer you\. <a href="\/en\/privacy-policy"/g) ?? []).length;
  check('privacy line under the info form and the visit dialog', privCount === 2, `${privCount}`);
  const cbPriv = (en.html.match(/class="cb__fine"[^>]*>[^<]*We use your details only to answer you\. <a href="\/en\/privacy-policy"/g) ?? []).length;
  check('privacy line in both call-me panels', cbPriv === 2, `${cbPriv}`);
  check('Greek privacy line in the singular', el.text.includes('Τα στοιχεία σου τα χρησιμοποιούμε μόνο για να σου απαντήσουμε.'), 'el');
} finally {
  site.kill();
}

// The CRM does not answer at all (cold start): the property page says 503 + Retry-After, not 404.
await sleep(300);
site = startSite('http://127.0.0.1:4398/api');      // nothing listens there
await up();
try {
  const r = await fetch(SITE + '/en/property/10015');
  check('CRM down → 503 with Retry-After', r.status === 503 && r.headers.get('retry-after') === '120', `${r.status} ${r.headers.get('retry-after')}`);
  const r2 = await fetch(SITE + '/en/no-such-page-at-all');
  check('an unknown page is still 404', r2.status === 404, `${r2.status}`);
} finally {
  site.kill(); stub.server?.close?.(); stub.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
