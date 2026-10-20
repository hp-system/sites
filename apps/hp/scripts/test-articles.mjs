// English articles (/en/articles/{category}/{slug}) and their lists, George 20/10/2026:
// every article 200 with one H1, a self canonical, Article JSON-LD with the author's name and
// no author image, FAQPage where the article has questions; list pages 200 with no count
// ("46 Results" must not exist), pagination, /en/articles → 301 all-news; the tax article
// carries the calculator with its default total €21,245; the 9 cleaned slugs answer and the old
// ":" slugs are 404 until the 301 engine (their old URL stays in each file's `old_url`).
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-articles.mjs
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

// The expected articles come from the content files themselves.
const ROOT = new URL('../src/content/articles/en/', import.meta.url).pathname;
const files = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(ROOT, d.name)).filter((f) => f.endsWith('.md')).map((f) => join(ROOT, d.name, f)));
const field = (fm, k) => (fm.match(new RegExp(`^${k}: *'?([^'\\n]*)'?$`, 'm')) ?? [])[1] ?? '';
const arts = files.map((f) => {
  const fm = readFileSync(f, 'utf8').split('\n---\n')[0];
  return { cat: field(fm, 'category'), slug: field(fm, 'slug'), old: field(fm, 'old_url'),
    faq: /^faq:\n- /m.test(fm), calc: /^has_calculator: true$/m.test(fm) };
});

const stub = await startStub({ port: 4339, n: 120 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { try { const j = JSON.parse(m[1]); return Array.isArray(j) ? j : [j]; } catch { return []; } });

try {
  check('articles found in the content folder', arts.length >= 40, `${arts.length} files`);
  for (const a of arts) {
    const path = `/en/articles/${a.cat}/${a.slug}`;
    const r = await fetch(SITE + encodeURI(path));
    const html = await r.text();
    const ok200 = r.status === 200;
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length === 1;
    const canon = ((html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? '').endsWith(path);
    const j = ld(html);
    const art = j.find((x) => x['@type'] === 'Article');
    const author = art && art.author && art.author.name && !art.author.image;
    const faqOk = !a.faq || j.some((x) => x['@type'] === 'FAQPage');
    check(`${a.slug}`, ok200 && h1 && canon && author && faqOk,
      `status ${r.status}, H1 ${h1}, canonical ${canon}, author ${!!author}, faq ${faqOk}`);
    if (a.calc) {
      check(`${a.slug} calculator`, html.includes('data-calc') && html.includes('€21,245') && html.includes('6.07 %'),
        'calculator markup with the default €21,245 (6.07 %)');
    }
    if (a.old && a.old !== path && a.old.includes(':')) {
      const o = await fetch(SITE + a.old.replace(/:/g, '%3A'), { redirect: 'manual' });
      check(`old slug ${a.old} is 404 for now`, o.status === 404, `status ${o.status} (301 engine comes later)`);
    }
  }
  const cleaned = arts.filter((a) => a.old.includes(':')).length;
  check('the cleaned slugs are the ":" ones', cleaned === 9, `${cleaned} articles had ":" in the old slug`);

  const r0 = await fetch(SITE + '/en/articles', { redirect: 'manual' });
  check('/en/articles → 301 all-news', r0.status === 301 && (r0.headers.get('location') ?? '').endsWith('/en/articles/all-news'),
    `${r0.status} ${r0.headers.get('location')}`);
  for (const c of ['all-news', 'business-news', 'buyers', 'constructors-news']) {
    const r = await fetch(`${SITE}/en/articles/${c}`);
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
    const total = arts.filter((a) => c === 'all-news' || a.cat === c).length;
    check(`/en/articles/${c} 200`, r.status === 200, `status ${r.status}`);
    check(`/en/articles/${c} no count`, !/\bresults?\b/i.test(text) && !new RegExp(`(?<![\\d.,])${total}(?![\\d.,])\\s*(articles|results|posts)`, 'i').test(text),
      `no "N results"/"${total} articles"`);
  }
  const p2 = await fetch(`${SITE}/en/articles/all-news?page=2`);
  const p2h = await p2.text();
  check('all-news page 2 is 200, noindex, canonical to itself', p2.status === 200 && /noindex/.test(p2h) && /rel="canonical" href="[^"]*all-news\?page=2"/.test(p2h),
    `status ${p2.status}`);
  const p99 = await fetch(`${SITE}/en/articles/all-news?page=99`);
  check('a page past the end is 404', p99.status === 404, `status ${p99.status}`);
  const bad = await fetch(`${SITE}/en/articles/nope`);
  check('unknown category is 404', bad.status === 404, `status ${bad.status}`);
} finally {
  site.kill(); stub.close?.();
}
process.exit(fails ? 1 : 0);
