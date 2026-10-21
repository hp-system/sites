// English articles (/en/articles/{category}/{slug}) and their lists, George 20/10/2026:
// every article 200 with one H1, a self canonical, Article JSON-LD with the author's name and
// no author image, FAQPage where the article has questions; list pages 200 with no count
// ("46 Results" must not exist), pagination, /en/articles → 301 all-news; the tax article
// carries the calculator with its default total €21,245; the 9 cleaned slugs answer and the old
// ":" slugs are 404 until the 301 engine (their old URL stays in each file's `old_url`).
// Issue #48 (21/10/2026): every author has a role in authors.ts (JSON-LD jobTitle is that role, not
// the brand fallback); every article body has at least 600 words; the near-duplicates moved to
// archive/articles-merged-20261021/ are not served (404) and not in the sitemap; every target in
// src/content/redirects/articles.json is a live article and no source is one.
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
const words = (text) => text.split('\n---\n').slice(1).join('\n---\n').split(/\s+/).filter(Boolean).length;
const arts = files.map((f) => {
  const text = readFileSync(f, 'utf8');
  const fm = text.split('\n---\n')[0];
  return { cat: field(fm, 'category'), slug: field(fm, 'slug'), old: field(fm, 'old_url'), author: field(fm, 'author'),
    words: words(text), faq: /^faq:\n- /m.test(fm), calc: /^has_calculator: true$/m.test(fm) };
});
// Full-SEO rule (George 20/10/2026): title ≤ 60 characters, description 140–160 (#66).
{
  // Own reader: `field()` stops at an apostrophe, which would cut a quoted description short.
  const get = (fm, k) => ((fm.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm')) ?? [])[1] ?? '').trim();
  const unq = (v) => { const q = v[0]; return (q === "'" || q === '"') && v.endsWith(q) ? v.slice(1, -1).replace(/''/g, "'") : v; };
  const bad = files.map((f) => readFileSync(f, 'utf8')).map((t) => {
    const fm = t.split('\n---\n')[0];
    return { t: unq(get(fm, 'title')), d: unq(get(fm, 'description')), s: get(fm, 'slug') };
  }).filter((x) => x.t.length > 60 || x.d.length < 140 || x.d.length > 160);
  check('every article: title ≤ 60, description 140–160', bad.length === 0, bad.map((x) => `${x.s} (${x.t.length}/${x.d.length})`).join(', ') || 'all');
}
const livePaths = new Set(arts.map((a) => `/en/articles/${a.cat}/${a.slug}`));

// The retired near-duplicates (kept as files, never built: the content glob reads src/content only).
const ARCH = new URL('../archive/articles-merged-20261021/', import.meta.url).pathname;
const archived = readdirSync(ARCH, { withFileTypes: true }).filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(ARCH, d.name)).filter((f) => f.endsWith('.md')).map((f) => join(ARCH, d.name, f)))
  .map((f) => { const fm = readFileSync(f, 'utf8').split('\n---\n')[0]; return { clean: field(fm, 'clean_url'), old: field(fm, 'old_url') }; });
const redirects = JSON.parse(readFileSync(new URL('../src/content/redirects/articles.json', import.meta.url), 'utf8')).redirects;
// Roles: the keys of ROLES in authors.ts.
const authorsTs = readFileSync(new URL('../src/content/articles/authors.ts', import.meta.url), 'utf8');
const ROLE_NAMES = new Set([...(authorsTs.match(/ROLES[^{]*\{([\s\S]*?)\n\};/) ?? ['', ''])[1].matchAll(/'([^']+)':/g)].map((m) => m[1]));

const stub = await startStub({ port: 4339, n: 120 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { try { const j = JSON.parse(m[1]); return Array.isArray(j) ? j : [j]; } catch { return []; } });

try {
  check('articles found in the content folder', arts.length >= 30, `${arts.length} files`);
  for (const a of arts) {
    check(`${a.slug} author has a role`, !a.author || ROLE_NAMES.has(a.author), `author "${a.author}"`);
    check(`${a.slug} body ≥ 600 words`, a.words >= 600, `${a.words} words`);
  }
  check('archived near-duplicates found', archived.length >= 1, `${archived.length} files in archive/articles-merged-20261021`);
  for (const r of redirects) {
    check(`articles.json ${r.from}`, livePaths.has(r.to) && !livePaths.has(r.from), `→ ${r.to} (target live: ${livePaths.has(r.to)}, source not live: ${!livePaths.has(r.from)})`);
  }
  for (const x of archived) {
    check(`archived ${x.clean} is mapped in articles.json`, redirects.some((r) => r.from === x.clean), 'redirect recorded');
    const r = await fetch(SITE + encodeURI(x.clean), { redirect: 'manual' });
    // Since the 301 engine (#56) the old address moves permanently to the kept article; never a page.
    const to = redirects.find((m) => m.from === x.clean)?.to;
    check(`archived ${x.clean} is not served (301 to the kept article)`, r.status === 301 && decodeURIComponent(r.headers.get('location') ?? '') === to, `status ${r.status} ${r.headers.get('location') ?? ''}`);
  }
  for (const a of arts) {
    const path = `/en/articles/${a.cat}/${a.slug}`;
    const r = await fetch(SITE + encodeURI(path));
    const html = await r.text();
    const ok200 = r.status === 200;
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length === 1;
    const canon = ((html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? '').endsWith(path);
    const j = ld(html);
    const art = j.find((x) => x['@type'] === 'Article');
    const author = art && art.author && art.author.name && !art.author.image
      && art.author.jobTitle && art.author.jobTitle !== 'Halkidiki Properties';
    const faqOk = !a.faq || j.some((x) => x['@type'] === 'FAQPage');
    check(`${a.slug}`, ok200 && h1 && canon && author && faqOk,
      `status ${r.status}, H1 ${h1}, canonical ${canon}, author ${!!author}, faq ${faqOk}`);
    if (a.calc) {
      check(`${a.slug} calculator`, html.includes('data-calc') && html.includes('€21,245') && html.includes('6.07 %'),
        'calculator markup with the default €21,245 (6.07 %)');
    }
    if (a.old && a.old !== path && a.old.includes(':')) {
      const o = await fetch(SITE + a.old.replace(/:/g, '%3A'), { redirect: 'manual' });
      // The 301 engine (#56): the old ':' slug now moves permanently to the clean URL.
      check(`old slug ${a.old} → 301 to ${path}`, o.status === 301 && decodeURIComponent(o.headers.get('location') ?? '') === path, `status ${o.status} ${o.headers.get('location') ?? ''}`);
    }
  }
  // 9 old slugs had ":"; some of those articles are now archived (their old URL is in articles.json).
  const cleaned = arts.filter((a) => a.old.includes(':')).length + archived.filter((x) => x.old.includes(':')).length;
  check('the cleaned slugs are the ":" ones', cleaned === 9, `${cleaned} articles (live + archived) had ":" in the old slug`);

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
  site.kill();
}

// The sitemap exists only in production mode: every live article is listed, no archived one is.
await sleep(400);
const prod = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'production', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
try {
  const sm = await (await fetch(SITE + '/sitemap.xml')).text();
  const locs = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
  const missing = [...livePaths].filter((p) => !locs.has(encodeURI(p)));
  check('sitemap lists every live article', missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : `${livePaths.size} articles`);
  const leaked = archived.filter((x) => locs.has(encodeURI(x.clean)) || locs.has(encodeURI(x.old)));
  check('sitemap lists no archived article', leaked.length === 0, leaked.length ? `found ${leaked.map((x) => x.clean).join(', ')}` : 'none');
} finally {
  prod.kill(); stub.close?.();
}
process.exit(fails ? 1 : 0);
