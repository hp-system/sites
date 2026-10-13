// Mutation test for the language guard (B-02): each case breaks ONE dictionary entry in a source
// file, runs `node scripts/check-i18n.mjs`, expects exit 1, and restores the file byte for byte
// (also on crash). Usage (from site/): node scripts/test-i18n-guard.mjs   → exit 1 if a mutation
// is NOT caught or the clean run fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const guard = () => spawnSync(process.execPath, ['scripts/check-i18n.mjs'], { encoding: 'utf8' });
const CASES = [
  ['T: English value emptied', 'src/lib/i18n.ts', "'nav.login': 'Sign in'", "'nav.login': ''"],
  ['PROP_UI: Hebrew value emptied', 'src/lib/property.ts', "he: { desc: 'תיאור'", "he: { desc: ''"],
  ['PROP_UI: Russian key removed', 'src/lib/property.ts', "ru: { desc: 'Описание', ", 'ru: { '],
  ['PROP_UI: Greek text on the Russian page', 'src/lib/property.ts', "ru: { desc: 'Описание'", "ru: { desc: 'Περιγραφή'"],
  ['LAND_TEXT: Russian orientation removed', 'src/lib/property.ts', ", he: 'פנורמי', ru: 'Панорамная' }", ", he: 'פנורמי' }"],
  ['LAND_TEXT: Turkish yes emptied', 'src/lib/property.ts', "tr: 'Evet'", "tr: ''"],
  ['CONTENT: English text emptied', 'src/lib/pages-content.ts', null, null], // filled below
];

// CONTENT: empty the first English string of the `contact` page.
{
  const src = readFileSync('src/lib/pages-content.ts', 'utf8');
  const i = src.indexOf('contact: {');
  const j = src.indexOf('en: {', i);
  const m = /'([^'\\]{3,})'/.exec(src.slice(j));
  CASES[CASES.length - 1][2] = src.slice(j, j + m.index + m[0].length);
  CASES[CASES.length - 1][3] = src.slice(j, j + m.index) + "''";
}

let fails = 0;
const clean = guard();
console.log(`${clean.status === 0 ? 'OK  ' : 'FAIL'} clean dictionaries pass — exit ${clean.status}`);
if (clean.status !== 0) { fails++; console.log(clean.stdout + clean.stderr); }

for (const [name, file, from, to] of CASES) {
  const orig = readFileSync(file, 'utf8');
  if (orig.split(from).length !== 2) { fails++; console.log(`FAIL ${name} — anchor not found exactly once`); continue; }
  try {
    writeFileSync(file, orig.replace(from, to));
    const r = guard();
    const caught = r.status === 1;
    if (!caught) fails++;
    const line = (r.stderr.split('\n').find((l) => /\] |missing|empty|letters/.test(l)) ?? '').trim();
    console.log(`${caught ? 'OK  ' : 'FAIL'} ${name} — exit ${r.status}${line ? ` · ${line.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(file, orig);
  }
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
