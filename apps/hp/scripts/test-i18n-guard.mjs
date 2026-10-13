// Mutation test for the build guards — language (B-02) and event names (B-11): each case breaks
// ONE entry in a source file, runs the guard, expects exit 1, and restores the file byte for byte
// (also on crash). Usage (from site/): node scripts/test-i18n-guard.mjs   → exit 1 if a mutation
// is NOT caught or a clean run fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const I18N = ['scripts/check-i18n.mjs'];
const EV = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'scripts/check-events.mjs'];
const guard = (cmd) => spawnSync(process.execPath, cmd, { encoding: 'utf8' });

const CASES = [
  ['T: English value emptied', 'src/lib/i18n.ts', "'nav.login': 'Sign in'", "'nav.login': ''", I18N],
  ['PROP_UI: Hebrew value emptied', 'src/lib/property.ts', "he: { desc: 'תיאור'", "he: { desc: ''", I18N],
  ['PROP_UI: Russian key removed', 'src/lib/property.ts', "ru: { desc: 'Описание', ", 'ru: { ', I18N],
  ['PROP_UI: Greek text on the Russian page', 'src/lib/property.ts', "ru: { desc: 'Описание'", "ru: { desc: 'Περιγραφή'", I18N],
  ['LAND_TEXT: Russian orientation removed', 'src/lib/property.ts', ", he: 'פנורמי', ru: 'Панорамная' }", ", he: 'פנורמי' }", I18N],
  ['LAND_TEXT: Turkish yes emptied', 'src/lib/property.ts', "tr: 'Evet'", "tr: ''", I18N],
  ['CONTENT: English text emptied', 'src/lib/pages-content.ts', null, null, I18N], // filled below
  ['EVENTS: unknown data-ev', 'src/components/PropertyPage.astro', 'data-ev="register:unlock_area"', 'data-ev="register:map"', EV],
  ['EVENTS: name never placed', 'src/lib/track.ts', "  CALL_404: 'call:404',", "  CALL_404: 'call:404',\n  NEVER_USED: 'x:never',", EV],
  ['EVENTS: computed name', 'src/components/ContentPage.astro', 'data-ev={CTA_EV[page.cta.to]}', 'data-ev={`content:${page.cta.to}`}', EV],
  ['EVENTS: missing EVENTS key', 'src/components/ContentPage.astro', 'list: EVENTS.CONTENT_LIST', 'list: EVENTS.CONTENT_LIZT', EV],
];

// CONTENT: empty the first English string of the `contact` page.
{
  const c = CASES.find((x) => x[0].startsWith('CONTENT'));
  const src = readFileSync(c[1], 'utf8');
  const i = src.indexOf('contact: {');
  const j = src.indexOf('en: {', i);
  const m = /'([^'\\]{3,})'/.exec(src.slice(j));
  c[2] = src.slice(j, j + m.index + m[0].length);
  c[3] = src.slice(j, j + m.index) + "''";
}

let fails = 0;
for (const [label, cmd] of [['clean dictionaries pass', I18N], ['clean event names pass', EV]]) {
  const clean = guard(cmd);
  console.log(`${clean.status === 0 ? 'OK  ' : 'FAIL'} ${label} — exit ${clean.status}`);
  if (clean.status !== 0) { fails++; console.log(clean.stdout + clean.stderr); }
}

for (const [name, file, from, to, cmd] of CASES) {
  const orig = readFileSync(file, 'utf8');
  if (orig.split(from).length !== 2) { fails++; console.log(`FAIL ${name} — anchor not found exactly once`); continue; }
  try {
    writeFileSync(file, orig.replace(from, to));
    const r = guard(cmd);
    const caught = r.status === 1;
    if (!caught) fails++;
    const line = (r.stderr.split('\n').find((l) => /\] |missing|empty|letters|EVENTS|data-ev/.test(l)) ?? '').trim();
    console.log(`${caught ? 'OK  ' : 'FAIL'} ${name} — exit ${r.status}${line ? ` · ${line.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(file, orig);
  }
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
