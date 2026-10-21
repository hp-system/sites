// Brand config (template step T1): every company fact comes from src/brand/, so a new brand is a
// new config file and no code change. Two checks:
//  1. SOURCE — no file under src/ outside src/brand/ carries a company literal in code
//     (comments are ignored). Page texts that still name the brand (lib/i18n.ts,
//     lib/pages-content.ts) are content for the CMS step (T2) and are skipped here.
//  2. RENDER — the built site (stub API) shows the brand values: name, phone, e-mail, media host.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-brand.mjs — exit 1 on any FAIL.
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { startStub } from './stub-api.mjs';

let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

// ── 1. SOURCE ──────────────────────────────────────────────────────────────
const SKIP = new Set(['src/brand', 'src/lib/i18n.ts', 'src/lib/pages-content.ts']);
const LITERALS = [/Halkidiki Properties/, /media\.onsea\.gr/, /site=hp\b/, /halkidikiproperties\.com/, /villanatalia/,
  /\+30 ?2311/, /'EUR'/, /addressCountry:\s*'GR'/];
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
// Comments out: block comments, JSX comments, and line comments that start a line.
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
const hits = [];
for (const f of walk('src')) {
  const rel = relative('.', f);
  if ([...SKIP].some((s) => rel === s || rel.startsWith(s + '/'))) continue;
  if (!/\.(ts|astro|mjs|js)$/.test(f)) continue;
  const body = code(readFileSync(f, 'utf8'));
  for (const re of LITERALS) if (re.test(body)) hits.push(`${rel} ~ ${re}`);
}
check('no company literal in code outside src/brand', hits.length === 0, hits.length ? hits.join(' · ') : 'clean');

// ── 2. RENDER ──────────────────────────────────────────────────────────────
const { brand } = await import('../src/brand/hp.ts').then((m) => ({ brand: m.hp })).catch(() => ({ brand: null }));
check('src/brand/hp.ts exists', !!brand, brand ? brand.key : 'missing');
if (brand) {
  const SITE = 'http://127.0.0.1:4331';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const stub = await startStub({ port: 4339, n: 60, variety: true });
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'production', PUBLIC_ORIGIN: brand.web.origin },
  });
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  try {
    const home = await (await fetch(SITE + '/en')).text();
    check('og:site_name = brand name', home.includes(`og:site_name" content="${brand.name}"`), 'meta og:site_name');
    check('phone from brand', home.includes(brand.contact.phoneText), brand.contact.phoneText);
    check('e-mail from brand', home.includes(brand.contact.email), brand.contact.email);
    check('media host from brand', home.includes(`rel="preconnect" href="${brand.web.mediaOrigin}"`), brand.web.mediaOrigin);
    const robots = await (await fetch(SITE + '/robots.txt')).text();
    check('robots names the brand and its origin', robots.startsWith(`# ${brand.name}`) && robots.includes(`Sitemap: ${brand.web.origin}/sitemap.xml`), 'header + sitemap line');
  } finally { site.kill(); stub.close?.(); }
}
process.exit(fails ? 1 : 0);
