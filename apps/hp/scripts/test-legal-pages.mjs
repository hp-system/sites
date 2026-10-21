// Privacy policy in all 9 languages (#94, George 21/10/2026): each language's page serves at its
// path in its own language, the nine form one hreflang cluster, the old Greek URL redirects, and
// every privacy link (banner, property forms, call-me) opens the policy in the page language.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-legal-pages.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const { PRIVACY_PATH } = await import('../src/lib/legal.ts');
const { propertyUrl } = await import('../src/lib/i18n.ts');
const stub = await startStub({ port: 4339, n: 20, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

try {
  for (const [lang, path] of Object.entries(PRIVACY_PATH)) {
    const href = encodeURI(path);
    const r = await fetch(SITE + href);
    const h = await r.text();
    check(`${lang}: policy serves at ${path}`, r.status === 200, `${r.status}`);
    check(`${lang}: page in its own language`, new RegExp(`<html[^>]+lang="${lang}"`).test(h), (h.match(/<html[^>]*>/) ?? [''])[0]);
    const alts = (h.match(/<link[^>]+rel="alternate"[^>]+hreflang="[a-z-]+"/g) ?? []).length;
    check(`${lang}: 9 language alternates + x-default`, alts === 10, `${alts}`);
    check(`${lang}: company data present`, h.includes('801541781') && h.includes('158806004000'), 'ΑΦΜ/ΓΕΜΗ');
    check(`${lang}: AI section present`, /<h2[^>]*>[^<]*4\.1/.test(h), '4.1');
    check(`${lang}: banner links to this language's policy`, new RegExp(`id="cc-b"[\\s\\S]{0,800}href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(h), href);
    const pr = await (await fetch(SITE + propertyUrl(lang, '10015'))).text();
    check(`${lang}: property forms link to this language's policy`, (pr.split(`href="${href}"`).length - 1) >= 4, `${pr.split(`href="${href}"`).length - 1} links`);
  }
  const old = await fetch(SITE + encodeURI('/el/πολιτικη-απορρητου'), { redirect: 'manual' });
  check('old Greek URL → 301 to the Greek page', old.status === 301 && decodeURI(old.headers.get('location') ?? '') === '/πολιτικη-απορρητου', `${old.status} ${old.headers.get('location')}`);
  const wrong = await fetch(SITE + '/de/' + encodeURI('πολιτικη-απορρητου'));
  check('a page is not served under another language', wrong.status === 404, `${wrong.status}`);
} finally {
  site.kill(); stub.server?.close?.(); stub.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
