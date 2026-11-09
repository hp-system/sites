// The merged redirect table (src/data/redirects.json, sites#152) keeps its promises:
// only 301 / 410 / pending / review — never a 302; one hop (no target is itself a 301 source);
// no loops; normalised sources; files and robots.txt handled per D7; no page of the registry is
// redirected away unless a decision says so (forceRedirect, D1/D2). Offline: reads the data only.
import { readFileSync } from 'node:fs';

const T = JSON.parse(readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8'));
const O = JSON.parse(readFileSync(new URL('./redirect-overrides.json', import.meta.url), 'utf8'));
const R = JSON.parse(readFileSync(new URL('../src/data/page-registry.json', import.meta.url), 'utf8'));

let fail = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : ' — ' + info}`); if (!ok) fail++; };

const rows = T.rows;
const by = new Map(rows.map((r) => [r.from, r]));
const key = (p) => p.normalize('NFC').toLowerCase().replace(/\/+$/, '') || '/';
const forced = (k) => O.forceRedirect.some((f) => k === key(f.prefix) || k.startsWith(key(f.prefix) + '/') || k.startsWith(key(f.prefix) + '-'));
const regPaths = new Set(R.pages.flatMap((p) => Object.values(p.paths ?? {})).map(key));

check('the table has rows', rows.length > 500, String(rows.length));
check('statuses are 301 / 410 / pending / review only (never 302)', rows.every((r) => [301, 410, 'pending', 'review'].includes(r.status)),
  rows.filter((r) => ![301, 410, 'pending', 'review'].includes(r.status)).map((r) => r.from + ' ' + r.status).slice(0, 5).join(', '));
check('sources are unique', by.size === rows.length);
check('sources are normalised (lower case, no query, no trailing slash, leading /)',
  rows.every((r) => r.from === key(r.from) && !r.from.includes('?') && r.from.startsWith('/')),
  rows.filter((r) => r.from !== key(r.from) || r.from.includes('?')).map((r) => r.from).slice(0, 5).join(', '));
const r301 = rows.filter((r) => r.status === 301);
check('every 301 has a site-relative target', r301.every((r) => typeof r.to === 'string' && r.to.startsWith('/')));
check('no 301 points to itself', r301.every((r) => key(r.to) !== r.from), r301.filter((r) => key(r.to) === r.from).map((r) => r.from).join(', '));
check('one hop: no 301 target is itself a 301 source', r301.every((r) => by.get(key(r.to))?.status !== 301),
  r301.filter((r) => by.get(key(r.to))?.status === 301).map((r) => `${r.from} → ${r.to}`).slice(0, 5).join(', '));
check('410 rows carry no target', rows.filter((r) => r.status === 410).every((r) => r.to === null));
check('robots.txt is not redirected (D7)', !by.has('/robots.txt'));
check('files (.jpg .png .pdf) never 301 to a page (D7)', rows.filter((r) => /\.(jpe?g|png|webp|gif|pdf)$/i.test(r.from)).every((r) => r.status === 410));
check('no registry page is redirected away', r301.every((r) => !regPaths.has(r.from)),
  r301.filter((r) => regPaths.has(r.from)).map((r) => r.from).slice(0, 5).join(', '));
check('Greek targets live at the root (no /el/ target)', r301.every((r) => !/^\/el(\/|$)/.test(r.to)));
check('every override is applied', O.rows.every((o) => {
  const r = by.get(key(o.from.replace(/\/+$/, '')));
  return o.status === 'keep' ? !r : r && (r.status === o.status || (o.status === 301 && r.status === 'pending'));
}), O.rows.filter((o) => { const r = by.get(key(o.from)); return o.status === 'keep' ? !!r : !r; }).map((o) => o.from).slice(0, 5).join(', '));
check('rules are declared', Array.isArray(T.rules) && T.rules.length >= 4);

if (fail) { console.log(`\n${fail} FAIL`); process.exit(1); }
console.log(`\nALL OK — ${rows.length} rows: 301 ${r301.length} · pending ${rows.filter((r) => r.status === 'pending').length} · 410 ${rows.filter((r) => r.status === 410).length} · review ${rows.filter((r) => r.status === 'review').length}`);
