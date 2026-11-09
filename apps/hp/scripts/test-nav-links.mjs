// Every page is reachable and every internal link lands directly (#69, George 21/10/2026:
// "check that all pages are linked and work"). Crawls the BUILT site from the 9 home pages
// (stub data), following every internal link (query strings included, property pages capped):
//   · no internal link answers 4xx/5xx;
//   · no internal link is a redirect hop (links must point at the final URL);
//   · every English info page, article and area page is linked from somewhere;
//   · the header has Blog, the footer has the Guides column.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-nav-links.mjs
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { startStub } from './stub-api.mjs';
import { movedTo } from './retired.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const fm = (f, k) => ((readFileSync(f, 'utf8').match(new RegExp(`^${k}:\\s*['"]?([^'"\\n]+)`, 'm')) ?? [])[1] ?? '').trim();
const expected = new Set([
  ...walk('src/content/pages/en').filter((f) => f.endsWith('.md')).map((f) => fm(f, 'path')),
  ...walk('src/content/articles/en').filter((f) => f.endsWith('.md')).map((f) => fm(f, 'clean_url')),
  ...[...readFileSync('src/content/areas/en.ts', 'utf8').matchAll(/slug: '([a-z-]+)', kind:/g)].map((m) => `/en/property-for-sale/${m[1]}`),
].filter(Boolean));

const stub = await startStub({ port: 4339, n: 40, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const skip = (h) => !h.startsWith('/') || h.startsWith('//') || /^\/(api|_astro|_image)\//.test(h)
  || /\.(css|js|png|jpe?g|webp|avif|svg|ico|xml|txt|pdf|woff2?)(\?|$)/.test(h);
const status = new Map(); const from = new Map(); const linked = new Set();
const queue = ['/', '/en', '/bg', '/sr', '/de', '/ro', '/tr', '/he', '/ru'];
let props = 0;
try {
  while (queue.length && status.size < 4000) {
    const batch = queue.splice(0, 12);
    await Promise.all(batch.map(async (p) => {
      const r = await fetch(SITE + encodeURI(decodeURI(p)), { redirect: 'manual' });
      status.set(p, r.status);
      if (r.status !== 200) return;
      const h = await r.text();
      for (const m of h.matchAll(/href="([^"#]+)/g)) {
        const u = m[1].replace(/&amp;/g, '&');
        if (skip(u)) continue;
        linked.add(u.split('?')[0]);
        if (!from.has(u)) from.set(u, p);
        if (status.has(u) || queue.includes(u)) continue;
        if (/\/(property|ακινητο|имот|nekretnina|immobilie|proprietate|emlak|נכס|объект)\/[^/]+$/.test(decodeURI(u)) && ++props > 60) continue;
        queue.push(u);
      }
    }));
  }
  // ⏳ TEMPORARY (#160 → removed by #161): the spec texts of the listing pages link to the 4 spec
  //    guides (P03, P19, P20, P21), which portion 3 builds. Only their exact spec URLs are excused;
  //    every other broken link still fails. #161 deletes this block.
  const PENDING = new Set(['P03', 'P19', 'P20', 'P21'].flatMap((id) =>
    readdirSync(`src/content/seo/${id}`).map((f) => JSON.parse(readFileSync(`src/content/seo/${id}/${f}`, 'utf8')).path)));
  const dec = (u) => { try { return decodeURI(u); } catch { return u; } };
  const pendingHit = [...status].filter(([p, s]) => s >= 400 && PENDING.has(dec(p)));
  if (pendingHit.length) console.log(`INFO ${pendingHit.length} link target(s) wait for portion 3 (#161): ${pendingHit.slice(0, 4).map(([p]) => dec(p)).join(' ')}`);
  const broken = [...status].filter(([p, s]) => s >= 400 && !PENDING.has(dec(p)));
  check(`no broken internal link (${status.size} pages crawled)`, broken.length === 0, broken.slice(0, 4).map(([p, s]) => `${p} ${s} ← ${from.get(p)}`).join(' | ') || 'none');
  const hops = [...status].filter(([, s]) => s >= 300 && s < 400);
  check('no internal link is a redirect hop', hops.length === 0, hops.slice(0, 4).map(([p, s]) => `${p} ${s} ← ${from.get(p)}`).join(' | ') || 'none');
  const orphans = [...expected].filter((p) => !linked.has(p) && !movedTo(p));   // moved pages (#152) are not pages
  check(`all ${expected.size} English pages are linked from somewhere`, orphans.length === 0, orphans.slice(0, 5).join(', ') || 'none');
  const en = await (await fetch(SITE + '/en')).text();
  check('header: Blog → /en/articles/all-news', /<nav class="navlinks[^"]*"[\s\S]*?href="\/en\/articles\/all-news"[\s\S]*?<\/nav>/.test(en), 'link');
  check('footer: Guides column with the 3 guides', ['/en/properties/homes-for-sale', '/en/articles/business-news/taxes-foreigners-properties-greece', '/en/buying-property-in-greece'].every((u) => en.includes(`href="${u}"`)), 'links');
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
