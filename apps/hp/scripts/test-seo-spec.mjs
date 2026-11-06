// SEO spec data (#150, plan E-111): the committed src/content/seo/<PageID>/<lang>.json files pass
// every rule of scripts/seo-spec-rules.mjs, and the rules themselves catch what they must.
// No build needed. Usage (from apps/hp): node scripts/test-seo-spec.mjs. Exit 1 on any FAIL.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, htmlProblems, LANGS, NOT_BUILT } from './seo-spec-rules.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(APP, 'src/content/seo');
let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

const pages = [];
for (const id of readdirSync(DIR)) {
  for (const f of readdirSync(join(DIR, id))) pages.push(JSON.parse(readFileSync(join(DIR, id, f), 'utf8')));
}
const overrides = JSON.parse(readFileSync(join(APP, 'scripts/seo-spec-overrides.json'), 'utf8'));
const knownPaths = new Set(pages.map((p) => p.path));

// 1. The data.
const expected = 21 * LANGS.length - Object.values(NOT_BUILT).flat().length;
check('page count', pages.length === expected, `${pages.length} of ${expected}`);
const errors = validate(pages, { knownPaths, allowedLinkTargets: overrides.allowedLinkTargets });
check('every rule passes', errors.length === 0, errors.slice(0, 10).join(' · '));
check('file name = page language', pages.every((p) => existsSync(join(DIR, p.id, `${p.lang}.json`))));
check('property template has 9 languages',
  JSON.parse(readFileSync(join(APP, 'src/data/seo-property-template.json'), 'utf8')).length === LANGS.length);

// 2. The rules catch bad input (each case must produce an error).
const good = pages.find((p) => p.id === 'P04' && p.lang === 'en');
const bad = (patch) => validate(pages.map((p) => (p === good ? { ...p, ...patch } : p)), { knownPaths, allowedLinkTargets: overrides.allowedLinkTargets });
const cases = {
  'script tag': { intro: good.intro + '<script>alert(1)</script>' },
  'attribute': { body: good.body.replace('<p>', '<p onclick="x()">') },
  'link in text': { intro: good.intro + '<a href="/x">x</a>' },
  'title > 60': { title: 'x'.repeat(61) },
  'meta too short': { meta: 'short' },
  'H2 differs from outline': { h2: [...good.h2, 'Extra'] },
  'FAQ count differs': { faq: good.faq.slice(1) },
  'coordinate in text': { intro: good.intro + '<p>40.123456, 23.456789</p>' },
  'unknown link target': { linksOut: [{ anchor: 'x', href: '/en/nowhere' }] },
  'duplicate title': { title: pages.find((p) => p.id === 'P07' && p.lang === 'en').title },
};
for (const [name, patch] of Object.entries(cases)) check(`rule catches: ${name}`, bad(patch).length > 0);
check('a language missing is caught', validate(pages.filter((p) => p !== good), { knownPaths, allowedLinkTargets: overrides.allowedLinkTargets }).some((e) => e.includes('language en missing')));
check('sanitiser accepts the allowed tags', htmlProblems('<p>a <strong>b</strong></p><h2>c</h2><h3>d</h3><ul><li>e</li></ul>').length === 0);

console.log(fails ? `\n${fails} FAIL` : '\nall OK');
process.exit(fails ? 1 : 0);
