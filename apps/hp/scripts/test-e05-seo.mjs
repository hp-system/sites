// Acceptance for M1-S06 SEO fixes (B-09, B-16) against the stub API (B-11 has its own build check).
// 1. SITE_ENV=production: `verify-seo.mjs --mode=production` over EVERY sitemap URL, then the B-16
//    rules: content pages in the sitemap exactly in their own languages; a fallback language
//    serves 200 with canonical → the original and hreflang limited to the own languages.
// 2. SITE_ENV=preview: `verify-seo.mjs --mode=preview` (also claiming the production host).
// Usage (from site/, after `pnpm build`): node --experimental-strip-types scripts/test-e05-seo.mjs
import { spawn } from 'node:child_process';
import { register } from 'node:module';
import { startStub } from './stub-api.mjs';

register(new URL('./ts-hooks.mjs', import.meta.url));
const { PUBLISHED } = await import(new URL('../src/lib/i18n.ts', import.meta.url));
const { PAGE_KEYS, pageExists, pageLangs, contentUrl } = await import(new URL('../src/lib/pages.ts', import.meta.url));
// the redirect table's 301 rows (what the sitemap leaves out, #152)
const { readFileSync } = await import('node:fs');
const MOVED = new Set(JSON.parse(readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8')).rows
  .filter((r) => r.status === 301).map((r) => r.from.toLowerCase()));
const redirectFor = (p) => MOVED.has(p.toLowerCase());

const SITE = 'http://127.0.0.1:4331';
const ORIGIN = 'https://www.halkidikiproperties.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const stub = await startStub({ port: 4339, n: 60 });

async function withSite(siteEnv, fn) {
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: siteEnv, PUBLIC_ORIGIN: 'https://hp.rewize.app' },
  });
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  try { await fn(); } finally { site.kill(); await sleep(400); }
}

// Async on purpose: the stub API lives in THIS process — a blocking spawnSync would freeze it.
function verify(mode) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, ['scripts/verify-seo.mjs', SITE, `--mode=${mode}`]);
    let out = '';
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (out += d));
    c.on('close', (status) => {
      const lines = out.split('\n');
      resolve({
        status,
        summary: lines.filter((l) => /URLs →|ΠΕΡΑΣΑΝ|ΑΠΟΤΥΧΙΕΣ/.test(l)).join(' | ').trim(),
        failed: lines.filter((l) => l.includes('✗')),
      });
    });
  });
}

await withSite('production', async () => {
  const v = await verify('production');
  check('B-09 verify-seo --mode=production', v.status === 0, `${v.summary}${v.failed.length ? ` · ${v.failed.slice(0, 3).join(' · ')}` : ''}`);

  const xml = await (await fetch(SITE + '/sitemap.xml')).text();
  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const keys = PAGE_KEYS.filter(pageExists);
  const wrong = [];
  for (const k of keys) for (const l of PUBLISHED) {
    // a URL the redirect engine moves (301) is never in the sitemap (#152) — e.g. projects merged into construction services (#340)
    if (redirectFor(contentUrl(k, l))) { if (locs.has(ORIGIN + encodeURI(contentUrl(k, l)))) wrong.push(`${k}/${l} (moved)`); continue; }
    const u = ORIGIN + encodeURI(contentUrl(k, l));
    if (locs.has(u) !== pageLangs(k).includes(l)) wrong.push(`${k}/${l}`);
  }
  check('B-16 content pages in the sitemap = own languages', !wrong.length && keys.length > 0,
    wrong.length ? `wrong: ${wrong.slice(0, 8)}` : `${keys.length} pages, ${keys.reduce((n, k) => n + pageLangs(k).length, 0)} URLs`);
  check('B-16 pages without text stay out', ![...locs].some((u) => u.endsWith('/team')), 'team absent');
  // the Halkidiki guide has George's text since 08/11 (P21, GuidePage) and is in the sitemap (SEO crawl 2026-11-11)
  check('guides in the sitemap (P19, P21)', locs.has(ORIGIN + '/en/halkidiki') && locs.has(ORIGIN + '/en/buying-property-in-greece'), 'en/halkidiki, en/buying-property-in-greece');

  // A fallback: `contact` has no text in this language.
  const fb = PUBLISHED.find((l) => !pageLangs('contact').includes(l));
  const r = await fetch(SITE + encodeURI(contentUrl('contact', fb)));
  const html = await r.text();
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const hl = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]).filter((x) => x !== 'x-default');
  check(`B-16 fallback /${fb}/contact canonical → original`, r.status === 200 && canon === ORIGIN + encodeURI(contentUrl('contact', 'en')), `status ${r.status}, canonical ${canon}`);
  check('B-16 fallback hreflang = own languages only', [...hl].sort().join() === [...pageLangs('contact')].sort().join(), `hreflang ${hl}`);
  const own = await (await fetch(SITE + encodeURI(contentUrl('about', 'de')))).text();
  check('B-16 own-language page keeps its canonical', own.includes(`rel="canonical" href="${ORIGIN}${encodeURI(contentUrl('about', 'de'))}"`), 'about/de self-canonical');
});

await withSite('preview', async () => {
  const v = await verify('preview');
  check('B-09 verify-seo --mode=preview (incl. production host claim)', v.status === 0, `${v.summary}${v.failed.length ? ` · ${v.failed.slice(0, 3).join(' · ')}` : ''}`);
});

stub.server.close();
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
