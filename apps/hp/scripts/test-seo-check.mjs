// SEO checker in CI (#153, plan E-111).
//  1. The rules catch what they must (bad HTML in, a problem out).
//  2. The skeleton passes every rule on all 186 spec pages: the checker and the data agree.
//  3. The REAL pages listed in scripts/seo-must-pass.json pass every rule. That list grows with
//     each portion of the build (a page goes in when its template is done), so a finished page
//     can never fall back. Other real pages are only counted.
// Starts the BUILT site twice on stub data. Usage (from apps/hp, after `pnpm build`).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { startStub } from './stub-api.mjs';
import { checkSpecPage, parse, checkCommon } from './seo-check-lib.mjs';

let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const spec = {};
for (const id of readdirSync('src/content/seo')) for (const f of readdirSync(`src/content/seo/${id}`)) {
  const p = JSON.parse(readFileSync(`src/content/seo/${id}/${f}`, 'utf8'));
  (spec[id] ??= []).push(p);
}
const all = Object.values(spec).flat();
const must = JSON.parse(readFileSync('scripts/seo-must-pass.json', 'utf8')).pages;

const stub = await startStub({ port: 4361, n: 300, variety: true });
async function start(port, env) {
  const p = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_ENV: 'preview', EALIDA_API: stub.base, PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, ...env },
  });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/robots.txt`); break; } catch { await sleep(250); } }
  return p;
}
const html = async (port, path) => (await fetch(`http://127.0.0.1:${port}${encodeURI(path)}`)).text();

const sk = await start(4362, { SKELETON: '1' });
const real = await start(4363, { SKELETON: '' });
try {
  // 1. Rules catch bad input.
  const p = spec.P04.find((x) => x.lang === 'en');
  const good = await html(4362, p.path);
  check('a correct page has no problem', checkSpecPage(good, p, spec.P04, { mode: 'preview' }).length === 0,
    checkSpecPage(good, p, spec.P04, { mode: 'preview' }).join(' · '));
  const mutations = {
    'wrong title': (h) => h.replace(/<title>[^<]*/, '<title>Other'),
    'second H1': (h) => h.replace('</main>', '<h1>x</h1></main>'),
    'missing FAQ H3': (h) => h.replace(/<h3[^>]*>/, '<h4>').replace('</h3>', '</h4>'),
    'link anchor changed': (h) => h.replace(new RegExp(`>${p.linksOut[0].anchor}</a>`), '>click here</a>'),
    'canonical to another page': (h) => h.replace(/rel="canonical" href="[^"]*"/, 'rel="canonical" href="https://www.halkidikiproperties.com/en"'),
    'hreflang language missing': (h) => h.replace(/<link rel="alternate" hreflang="de"[^>]*>/, ''),
    'not noindex on preview': (h) => h.replace(/content="noindex[^"]*"/, 'content="index, follow"'),
    'image without alt': (h) => h.replace('</main>', '<img src="/x.jpg"></main>'),
    'coordinates in markup': (h) => h.replace('</main>', '<script type="application/ld+json">{"@type":"Place","geo":{"latitude":40.1}}</script></main>'),
    'intro missing': (h) => h.replace(p.intro, ''),
  };
  for (const [name, fn] of Object.entries(mutations)) {
    const changed = fn(good);
    check(`catches: ${name}`, changed !== good && checkSpecPage(changed, p, spec.P04, { mode: 'preview' }).length > 0);
  }

  // 2. Skeleton: every spec page clean.
  const skBad = [];
  for (const q of all) { const pr = checkSpecPage(await html(4362, q.path), q, spec[q.id], { mode: 'preview' }); if (pr.length) skBad.push(`${q.id}/${q.lang}: ${pr[0]}`); }
  check(`skeleton: all ${all.length} spec pages pass`, skBad.length === 0, skBad.slice(0, 5).join(' · '));

  // 3. Real pages: the must-pass list passes, the rest is counted.
  let clean = 0; const mustBad = [];
  for (const q of all) {
    const pr = checkSpecPage(await html(4363, q.path), q, spec[q.id], { mode: 'preview', items: true });
    if (!pr.length) clean++;
    if (must.includes(`${q.id}/${q.lang}`) && pr.length) mustBad.push(`${q.id}/${q.lang}: ${pr.slice(0, 2).join(' | ')}`);
  }
  check(`real site: the ${must.length} must-pass pages pass`, mustBad.length === 0, mustBad.slice(0, 5).join(' · '));
  console.log(`INFO real site: ${clean} of ${all.length} spec pages already pass every rule`);
} finally {
  sk.kill(); real.kill(); stub.server.close();
}
console.log(fails ? `\n${fails} FAIL` : '\nall OK');
process.exit(fails ? 1 : 0);
