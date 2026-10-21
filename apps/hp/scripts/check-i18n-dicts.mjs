#!/usr/bin/env node
// Language guard, stage 2 (B-02, traps T-K02/T-K03/T-C02) — run by scripts/check-i18n.mjs.
// Stage 1 (check-i18n.mjs) only compares the KEYS of `T`/`U` in i18n.ts, by reading the source.
// It cannot see an empty string (which silently un-publishes a language) nor the other
// dictionaries. This stage IMPORTS the real dictionaries (Node strips the types; scripts/ts-hooks.mjs
// resolves the imports) and checks their VALUES:
//   · T (merged), LIST_UI, PROP_UI: every key of `el` present and non-empty in all 9 languages
//   · FACETS: name + slug in all 9 languages, slugs unique per language
//   · LAND_TEXT (property.ts): every label/value in all 9 languages
//   · CONTENT (pages-content.ts): only the languages a page declares (pages fall back to English
//     on purpose), but `el` and `en` are required, and no declared text may be empty
//   · every text: no letters of a foreign alphabet (Greek on a German page, Cyrillic on a Greek
//     page …). Latin is allowed everywhere (brand names, units, e-mail).
// Exit 1 with a table "dictionary × language" on any problem.
import { register } from 'node:module';

register(new URL('./ts-hooks.mjs', import.meta.url));
const lib = (f) => import(new URL(`../src/lib/${f}`, import.meta.url));
const { T, LANGS, SLUG } = await lib('i18n.ts');
const { LIST_UI, FACETS } = await lib('listing.ts');
const { PROP_UI, LAND_TEXT, BUILDING_TEXT } = await lib('property.ts');
const { CONTENT } = await lib('pages-content.ts');

const SCRIPTS = { Greek: /[Ͱ-Ͽἀ-῿]/, Cyrillic: /[Ѐ-ӿ]/, Hebrew: /[֐-׿]/ };
const OWN = { el: 'Greek', bg: 'Cyrillic', ru: 'Cyrillic', he: 'Hebrew' };
const foreign = (lang, s) => Object.keys(SCRIPTS).filter((k) => k !== OWN[lang] && SCRIPTS[k].test(s));

const problems = [];
const report = (dict, lang, what) => problems.push({ dict, lang, what });

function text(dict, lang, where, v) {
  if (typeof v === 'function') return;                       // templates are code, checked by use
  if (typeof v !== 'string') return report(dict, lang, `${where}: not a string`);
  if (!v.trim()) return report(dict, lang, `${where}: empty`);
  const f = foreign(lang, v);
  if (f.length) report(dict, lang, `${where}: ${f.join('+')} letters in "${v.slice(0, 60)}"`);
}

function perLang(dict, D) {
  if (!D?.el) return report(dict, 'el', 'dictionary not found');
  const keys = Object.keys(D.el);
  for (const lang of LANGS) {
    const d = D[lang];
    if (!d) { report(dict, lang, 'language missing'); continue; }
    for (const k of keys) (k in d ? text(dict, lang, k, d[k]) : report(dict, lang, `${k}: missing`));
    for (const k of Object.keys(d)) if (!keys.includes(k)) report(dict, lang, `${k}: not in el`);
  }
}

function byLangTable(dict, table) {
  for (const [key, entry] of Object.entries(table)) {
    for (const lang of LANGS) (entry?.[lang] !== undefined ? text(dict, lang, key, entry[lang]) : report(dict, lang, `${key}: missing`));
  }
}

perLang('T', T);
perLang('LIST_UI', LIST_UI);
perLang('PROP_UI', PROP_UI);

for (const lang of LANGS) {
  for (const k of ['list', 'property']) text('SLUG', lang, k, SLUG[lang]?.[k]);
  const seen = new Map();
  for (const f of FACETS) {
    text('FACETS', lang, `${f.key}.name`, f.name?.[lang]);
    text('FACETS', lang, `${f.key}.slug`, f.slug?.[lang]);
    const s = String(f.slug?.[lang] ?? '').toLowerCase();
    if (s && seen.has(s)) report('FACETS', lang, `${f.key}.slug "${s}" also used by ${seen.get(s)}`);
    seen.set(s, f.key);
  }
}

for (const [name, table] of Object.entries(LAND_TEXT)) byLangTable(`LAND_TEXT.${name}`, table);
for (const [name, table] of Object.entries(BUILDING_TEXT)) byLangTable(`BUILDING_TEXT.${name}`, table);

const walk = (page, lang, v, path) => {
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(page, lang, x, `${path}.${k}`);
  else text('CONTENT', lang, `${page}${path}`, v);
};
for (const [page, byLang] of Object.entries(CONTENT)) {
  for (const lang of ['el', 'en']) if (!byLang?.[lang]) report('CONTENT', lang, `${page}: required language missing`);
  for (const [lang, c] of Object.entries(byLang ?? {})) {
    if (!LANGS.includes(lang)) { report('CONTENT', lang, `${page}: unknown language`); continue; }
    walk(page, lang, c, '');
  }
}

const dicts = ['T', 'LIST_UI', 'PROP_UI', 'SLUG', 'FACETS', ...Object.keys(LAND_TEXT).map((n) => `LAND_TEXT.${n}`), ...Object.keys(BUILDING_TEXT).map((n) => `BUILDING_TEXT.${n}`), 'CONTENT'];
if (!problems.length) {
  console.log(`✅ i18n values: ${dicts.length} dictionaries × ${LANGS.length} languages — no gap, no empty text, no foreign alphabet.`);
  process.exit(0);
}
console.error('\n🔴 BUILD STOPPED — language problems in the dictionaries (B-02)\n');
const pad = (s, n) => String(s).padEnd(n);
console.error(`   ${pad('dictionary', 22)}${LANGS.map((l) => pad(l, 5)).join('')}`);
for (const d of dicts) {
  const row = LANGS.map((l) => pad(problems.filter((p) => p.dict === d && p.lang === l).length || '·', 5)).join('');
  if (problems.some((p) => p.dict === d)) console.error(`   ${pad(d, 22)}${row}`);
}
console.error('');
for (const p of problems.slice(0, 40)) console.error(`   ${p.dict} [${p.lang}] ${p.what}`);
if (problems.length > 40) console.error(`   … and ${problems.length - 40} more`);
console.error('');
process.exit(1);
