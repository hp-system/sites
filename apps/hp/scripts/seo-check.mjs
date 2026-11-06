// SEO checker (#153, plan E-111): crawl a RUNNING site and check every registry page against
// George's spec and Google's rules (scripts/seo-check-lib.mjs).
//
//   node scripts/seo-check.mjs [--base http://127.0.0.1:4330] [--mode preview|production]
//        [--ids P02,P04] [--lang en] [--must P02,P04 | --must all] [--out report.json] [--items]
//
// Prints a summary per page. Writes the full report as JSON with --out. Exit 1 when a page listed
// in --must (or every page with --must all) has a problem; without --must it only reports.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSpecPage, checkCommon, parse } from './seo-check-lib.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4330');
const MODE = arg('mode', 'preview');
const IDS = arg('ids') ? new Set(arg('ids').split(',')) : null;
const LANG = arg('lang');
const MUST = arg('must');
const ITEMS = process.argv.includes('--items');

const spec = {};
for (const id of readdirSync(join(APP, 'src/content/seo'))) for (const f of readdirSync(join(APP, 'src/content/seo', id))) {
  const p = JSON.parse(readFileSync(join(APP, 'src/content/seo', id, f), 'utf8'));
  (spec[id] ??= []).push(p);
}
const reg = JSON.parse(readFileSync(join(APP, 'src/data/page-registry.json'), 'utf8'));

const targets = [];
for (const r of reg.pages) {
  if (IDS && !IDS.has(r.id)) continue;
  if (r.source === 'spec') for (const p of spec[r.id] ?? []) { if (!LANG || p.lang === LANG) targets.push({ id: r.id, lang: p.lang, path: p.path, page: p }); }
  else for (const [lang, path] of Object.entries(r.paths ?? {})) { if (!LANG || lang === LANG) targets.push({ id: r.id, lang, path }); }
}

const report = [];
for (const t of targets) {
  let problems;
  try {
    const res = await fetch(BASE + encodeURI(t.path), { redirect: 'manual' });
    const html = await res.text();
    if (res.status !== 200) problems = [`status: ${res.status}${res.headers.get('location') ? ' → ' + res.headers.get('location') : ''}`];
    else if (t.page) problems = checkSpecPage(html, t.page, spec[t.id], { mode: MODE, items: ITEMS });
    else {
      const p = parse(html);
      problems = checkCommon(p);
      if (p.h1.length !== 1) problems.push(`one H1: ${p.h1.length} H1`);
      if (!p.meta) problems.push('meta: missing');
      if (p.canonical.length !== 1) problems.push('canonical: missing');
    }
  } catch (e) {
    problems = [`fetch failed: ${e.message}`];
  }
  report.push({ id: t.id, lang: t.lang, path: t.path, problems });
}

const failing = report.filter((r) => r.problems.length);
const byRule = {};
for (const r of failing) for (const pr of r.problems) { const k = pr.split(':')[0]; byRule[k] = (byRule[k] ?? 0) + 1; }
console.log(`SEO check ${BASE} (${MODE}): ${report.length} pages, ${report.length - failing.length} clean, ${failing.length} with problems`);
for (const [k, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
for (const r of failing.slice(0, 40)) console.log(`\n${r.id}/${r.lang} ${r.path}\n  - ${r.problems.slice(0, 6).join('\n  - ')}${r.problems.length > 6 ? `\n  … ${r.problems.length - 6} more` : ''}`);
if (arg('out')) writeFileSync(arg('out'), JSON.stringify(report, null, 1));

if (MUST) {
  const must = MUST === 'all' ? null : new Set(MUST.split(','));
  const broken = failing.filter((r) => !must || must.has(r.id));
  if (broken.length) { console.log(`\nFAIL: ${broken.length} required page(s) with problems`); process.exit(1); }
  console.log('\nall required pages OK');
}
