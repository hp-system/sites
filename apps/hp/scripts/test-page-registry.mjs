// Page registry (#151, plan E-111): src/data/page-registry.json is complete and consistent with
// the spec data (src/content/seo) and the EN info pages (src/content/pages/en), and no URL changes
// without notice (R-012: slugs are frozen once published).
//   node scripts/test-page-registry.mjs            check; exit 1 on any FAIL
//   node scripts/test-page-registry.mjs --update   rewrite the URL snapshot after a deliberate change
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(readFileSync(join(APP, 'src/data/page-registry.json'), 'utf8'));
const SNAP = join(APP, 'src/data/page-urls.snapshot.json');
let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

// Spec data.
const seo = {};
for (const id of readdirSync(join(APP, 'src/content/seo'))) {
  for (const f of readdirSync(join(APP, 'src/content/seo', id))) {
    const p = JSON.parse(readFileSync(join(APP, 'src/content/seo', id, f), 'utf8'));
    (seo[id] ??= {})[p.lang] = p;
  }
}
// EN info pages: path of every markdown file.
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const enPages = walk(join(APP, 'src/content/pages/en')).filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(f, 'utf8').match(/^path:\s*(\S+)/m)?.[1]).filter(Boolean);

const pages = reg.pages;
const ids = pages.map((p) => p.id);
check('IDs are P + two digits and unique', ids.every((i) => /^P\d{2}$/.test(i)) && new Set(ids).size === ids.length,
  ids.filter((i, n) => ids.indexOf(i) !== n).join(' '));
const specIds = Object.keys(seo).sort();
check('every spec page is in the registry', specIds.every((i) => ids.includes(i)), specIds.filter((i) => !ids.includes(i)).join(' '));
check('spec rows are exactly the spec IDs', pages.filter((p) => p.source === 'spec').every((p) => seo[p.id]));
check('P22+ rows have an EN path', pages.filter((p) => p.source === 'page').every((p) => p.paths?.en?.startsWith('/en/')),
  pages.filter((p) => p.source === 'page' && !p.paths?.en?.startsWith('/en/')).map((p) => p.id).join(' '));

// URLs: EN of every page; all 9 languages of spec pages.
const urls = {};
for (const p of pages) {
  if (p.source === 'spec') for (const [l, d] of Object.entries(seo[p.id])) urls[`${p.id}/${l}`] = d.path;
  else for (const [l, path] of Object.entries(p.paths)) urls[`${p.id}/${l}`] = path;
}
const all = Object.values(urls);
check('URLs are unique', new Set(all).size === all.length, all.filter((u, n) => all.indexOf(u) !== n).join(' '));

// Every EN info page has a place: a registry row or a retired entry.
const placed = new Set([...pages.filter((p) => p.paths).map((p) => p.paths.en), ...reg.retired.map((r) => r.path)]);
const unplaced = enPages.filter((p) => !placed.has(p));
check('every EN info page is in the registry or retired', unplaced.length === 0, unplaced.join(' '));
const live = pages.filter((p) => p.status === 'live' && p.template !== 'articles'); // articles: own collection
const missing = live.filter((p) => !enPages.includes(p.paths.en));
check('every «live» page exists on the site', missing.length === 0, missing.map((p) => `${p.id} ${p.paths.en}`).join(' '));
check('retired entries point to registry pages', reg.retired.every((r) => ids.includes(r.to)));

// Menu and tree.
const secs = reg.sections;
const menu = pages.filter((p) => p.menu);
check('menu sections are the 7 of the plan', menu.every((p) => secs.includes(p.menu.section)) && secs.every((s) => menu.some((p) => p.menu.section === s)),
  secs.filter((s) => !menu.some((p) => p.menu.section === s)).join(' '));
for (const s of secs) {
  const o = menu.filter((p) => p.menu.section === s).map((p) => p.menu.order);
  check(`menu «${s}» order is 1..n`, o.sort((a, b) => a - b).every((v, i) => v === i + 1), o.join(','));
}
check('every parent exists', pages.every((p) => !p.parent || ids.includes(p.parent)));
const reachable = (p, seen = new Set()) => p.menu || p.footer || (p.parent && !seen.has(p.id) && reachable(pages.find((q) => q.id === p.parent), seen.add(p.id)));
const orphans = pages.filter((p) => p.id !== 'P01' && p.source === 'page' && !reachable(p));
check('every P22+ page is reachable from the menu, the footer or a parent', orphans.length === 0, orphans.map((p) => p.id).join(' '));

// Spec links: each page is linked from the pages the spec names (P03 → P01 in sr/bg/ro).
let gaps = [];
for (const [id, langs] of Object.entries(seo)) {
  for (const [l, p] of Object.entries(langs)) {
    for (const from of p.linkedFrom) {
      const q = seo[from]?.[l] ?? (from === 'P03' ? seo.P01?.[l] : undefined);
      if (!q?.linksOut.some((x) => x.href === p.path)) gaps.push(`${id}/${l}←${from}`);
    }
  }
}
check('spec: every «linked from» page links here', gaps.length === 0, gaps.slice(0, 8).join(' '));

// URL snapshot (R-012).
if (process.argv.includes('--update')) {
  writeFileSync(SNAP, JSON.stringify(Object.fromEntries(Object.entries(urls).sort()), null, 2) + '\n');
  console.log('snapshot written');
} else {
  const snap = existsSync(SNAP) ? JSON.parse(readFileSync(SNAP, 'utf8')) : {};
  const changed = Object.keys({ ...snap, ...urls }).filter((k) => snap[k] !== urls[k]);
  check('no URL changed since the snapshot (R-012)', changed.length === 0,
    changed.slice(0, 8).map((k) => `${k}: ${snap[k] ?? '—'} → ${urls[k] ?? '—'}`).join(' · ') + (changed.length ? ' · run with --update only for a deliberate change' : ''));
}

console.log(fails ? `\n${fails} FAIL` : '\nall OK');
process.exit(fails ? 1 : 0);
