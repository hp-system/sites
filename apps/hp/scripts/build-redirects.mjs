// Builds the merged redirect table `src/data/redirects.json` (sites#152, plan stage 1).
//
//   node scripts/build-redirects.mjs <spec.xlsx> <old-map.csv> --check <base-url>
//
// Sources, in this order (the first source that maps a path wins, overrides beat everything):
//   1. scripts/redirect-overrides.json — decisions that fix George's table (D-20261106-SS-1 D7,
//      the 14 «check» rows, files, broken rows) and moved targets;
//   2. George's sheet `3_Redirects_301` (1,712 rows) — the base (D7: «Ето согласны»);
//   3. the old map `ssot/seo/15_redirect_map_v1.csv` (3,786 rows of 2026-10) — only for paths
//      George's sheet does not have (the «162 uncovered»), with targets checked like the rest.
// Property pages and the legacy .htaccess patterns are RULES (`rules`), not rows: whether an old
// property URL gets a 301 or a 410 depends on the property still being published (D6), which only
// the running site knows.
//
// Every row gets a status:
//   301      — the target answers 200 on <base-url> now;
//   pending  — the target page is not built yet (mostly other languages, stage 5); the engine
//              serves nothing for it until the page exists, the checker lists it;
//   410      — gone for good (files, the broken row, `/currency/*`, decision D7).
// No 302 anywhere. One hop: a target that itself moves is replaced by its final address.
// Rejected: keying on the query string — the old filter URLs differ only in parameters and all
// land on the same list page; the engine keeps the query, the list page canonicalises.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [xlsxPath, csvPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = (process.argv[process.argv.indexOf('--check') + 1] ?? '').replace(/\/$/, '');
if (!xlsxPath || !csvPath || !base.startsWith('http')) {
  console.error('usage: node scripts/build-redirects.mjs <spec.xlsx> <old-map.csv> --check <base-url>');
  process.exit(2);
}

// ── xlsx (same minimal reader as import-seo-spec.mjs) ──────────────────────
function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(local + 26), lxlen = buf.readUInt16LE(local + 28);
    const data = buf.subarray(local + 30 + lnlen + lxlen, local + 30 + lnlen + lxlen + csize);
    files[name] = method === 8 ? inflateRawSync(data) : data;
    p += 46 + nlen + xlen + clen;
  }
  return files;
}
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tText = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unxml(m[1])).join('');
const colIndex = (ref) => [...ref.replace(/\d+$/, '')].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
function sheetRows(files, wanted) {
  const shared = [...String(files['xl/sharedStrings.xml'] ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => tText(m[1]));
  const wb = String(files['xl/workbook.xml']);
  const rels = String(files['xl/_rels/workbook.xml.rels']);
  const sheet = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].find((m) => unxml(m[1]) === wanted);
  const target = new RegExp(`Id="${sheet[2]}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`Target="([^"]+)"[^>]*Id="${sheet[2]}"`).exec(rels)[1];
  const xml = String(files['xl/' + target.replace(/^\/?xl\//, '')]);
  const grid = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const out = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const t = /t="(\w+)"/.exec(c[2])?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1];
      out[colIndex(c[1])] = t === 's' ? shared[Number(v)] : t === 'inlineStr' ? tText(c[3] ?? '') : unxml(v ?? '');
    }
    return out;
  });
  const [head, ...body] = grid;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// ── paths ──────────────────────────────────────────────────────────────────
/** The key the engine matches: decoded, lower case, no query, no trailing slash. */
export function keyOf(u) {
  let s = String(u ?? '').trim().replace(/^https?:\/\/[^/]+/i, '').split('#')[0].split('?')[0];
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.normalize('NFC').toLowerCase().replace(/\/+$/, '');   // one Unicode form: the sources mix NFC and NFD
  return s.startsWith('/') ? s : '/' + s;
}
/** A target as the site serves it: decoded, no host, no query; Greek lives at the root. */
function targetOf(u) {
  let s = String(u ?? '').trim().replace(/^https?:\/\/[^/]+/i, '').split('#')[0].split('?')[0];
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.normalize('NFC').replace(/\/+$/, '') || '/';
  if (s === '/el') return '/';
  if (s.startsWith('/el/')) s = s.slice(3);
  return s;
}
const langOf = (k) => (/^\/(en|de|sr|bg|ro|tr|he|ru)(\/|$)/.exec(k)?.[1]) ?? 'el';

// ── sources ────────────────────────────────────────────────────────────────
const overrides = JSON.parse(readFileSync(join(HERE, 'redirect-overrides.json'), 'utf8'));
const spec = sheetRows(unzip(readFileSync(xlsxPath)), '3_Redirects_301');
/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks. */
function parseCsv(text) {
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out;
}
const csv = parseCsv(readFileSync(csvPath, 'utf8')).slice(1).map(([old_path, new_path, type]) => ({ old_path, new_path, type }));

const rows = new Map();   // key → { from, to, status, lang, src, clicks, note }
const put = (key, row) => { if (!rows.has(key)) rows.set(key, row); };

for (const o of overrides.rows) {
  put(keyOf(o.from), { from: keyOf(o.from), to: o.to ? targetOf(o.to) : null, status: o.status, lang: langOf(keyOf(o.from)), src: 'override', clicks: 0, note: o.reason });
}

// Article maps of the site itself (before the sheet): an archived near-duplicate → the article
// that kept its content (#48), an old slug with «:» → the same article's clean URL (#22). The
// same content is the best target; if that article is folded into a guide too
// (D-20261109-SS-2), the one-hop pass below sends the old URL straight to the guide.
const artMap = JSON.parse(readFileSync(join(HERE, '../src/content/redirects/articles.json'), 'utf8')).redirects;
const walkMd = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkMd(join(d, e.name)) : e.name.endsWith('.md') ? [join(d, e.name)] : []);
for (const f of walkMd(join(HERE, '../src/content/articles/en'))) {
  const t = readFileSync(f, 'utf8');
  const o = /^old_url:\s*['"]?([^'"\n]+)/m.exec(t)?.[1], c = /^clean_url:\s*['"]?([^'"\n]+)/m.exec(t)?.[1];
  if (o && c) artMap.push({ from: o, to: c });
}
for (const a of artMap) {
  const key = keyOf(a.from), to = targetOf(a.to);
  if (keyOf(to) !== key) put(key, { from: key, to, status: 301, lang: 'en', src: 'article-map', clicks: 0, note: 'same article (archived duplicate or old slug)' });
}

// George's sheet: per path, the target with the most clicks (query rows share a path).
const bySpecPath = new Map();
for (const r of spec) {
  const key = keyOf(r['Old path (decoded)']);
  const to = targetOf(r['New URL (301 target)']);
  const clicks = Number(r['Clicks 16 months'] || 0);
  const cur = bySpecPath.get(key) ?? { targets: new Map(), clicks: 0, note: r['Rule / note'] };
  cur.targets.set(to, (cur.targets.get(to) ?? 0) + clicks + 0.001);
  cur.clicks += clicks;
  bySpecPath.set(key, cur);
}
let specConflicts = 0;
for (const [key, v] of bySpecPath) {
  const ranked = [...v.targets.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1) specConflicts++;
  const to = ranked[0][0];
  if (keyOf(to) === key) continue;                              // keep: same URL, no redirect
  put(key, { from: key, to, status: 301, lang: langOf(key), src: 'spec', clicks: Math.round(v.clicks), note: v.note });
}

// Old map: only what neither the overrides nor George's sheet cover.
const SKIP_TYPES = new Set(['property-same', 'property-missing→listing', 'legacy-regex', 'UNMAPPED']);
let oldOtherHost = 0;
for (const r of csv) {
  if (!r.old_path || SKIP_TYPES.has(r.type)) continue;
  if (/^https?:\/\//i.test(r.old_path)) { oldOtherHost++; continue; }   // experience.* lives on another host
  const key = keyOf(r.old_path);
  if (rows.has(key)) continue;
  const mapped = overrides.oldMapTypes[r.type];
  const to = mapped === undefined ? (r.new_path ? targetOf(r.new_path) : null) : mapped === null ? null : targetOf(mapped.replace('{lang}', langOf(key)));
  if (to && keyOf(to) === key) continue;
  put(key, { from: key, to, status: to ? 301 : 'pending', lang: langOf(key), src: 'old-map', clicks: 0, note: r.type });
}

// ── moves and checks ───────────────────────────────────────────────────────
for (const m of overrides.moves) for (const row of rows.values()) if (row.to === m.from) row.to = m.to;

for (const row of rows.values()) if (row.to && !row.to.startsWith('/')) { row.note = `${row.note} · unusable target «${row.to}»`; row.to = null; }
const targets = [...new Set([...rows.values()].filter((r) => r.to && r.status !== 410).map((r) => r.to))];
const live = new Map();
for (const t of targets) {
  const res = await fetch(base + encodeURI(t), { redirect: 'manual' });
  const loc = res.headers.get('location');
  live.set(t, { status: res.status, location: loc ? decodeURI(loc.replace(/^https?:\/\/[^/]+/i, '')) : null });
}
// a target that moves once more → its final address (one hop), checked again
for (const row of rows.values()) {
  const c = row.to && live.get(row.to);
  if (c && (c.status === 301 || c.status === 308) && c.location) {
    const fin = targetOf(c.location);
    if (!live.has(fin)) {
      const res = await fetch(base + encodeURI(fin), { redirect: 'manual' });
      live.set(fin, { status: res.status, location: null });
    }
    row.to = fin;
  }
}
for (const row of [...rows.values()]) {
  if (row.status === 'keep') { rows.delete(row.from); continue; }   // the URL itself is served
  if (row.status === 410) { row.to = null; continue; }
  if (!row.to) { row.status = 'pending'; continue; }
  if (keyOf(row.to) === row.from) { rows.delete(row.from); continue; }   // became a self-redirect: keep the page
  row.status = live.get(row.to)?.status === 200 ? 301 : 'pending';
}
// A source the new site serves today: a page of the registry (Sergei's menu, every old page
// moved into the new design) is kept and never redirected away; a decided move
// (`forceRedirect`, D1/D2) stays a 301; anything else waits for a decision (`review`), so a live
// page is never hidden by accident.
const registry = JSON.parse(readFileSync(join(HERE, '../src/data/page-registry.json'), 'utf8'));
const regPaths = new Set(registry.pages.filter((p) => p.status !== 'dropped').flatMap((p) => Object.values(p.paths ?? {})).map((p) => keyOf(p)));
const forced = (k) => overrides.forceRedirect.some((f) => k === keyOf(f.prefix) || k.startsWith(keyOf(f.prefix) + '/') || k.startsWith(keyOf(f.prefix) + '-'));
let keptRegistry = 0;
for (const row of [...rows.values()]) {
  if (row.src === 'override' && row.status !== 301) continue;
  const res = await fetch(base + encodeURI(row.from), { redirect: 'manual' });
  if (res.status !== 200) continue;
  if (regPaths.has(row.from)) { rows.delete(row.from); keptRegistry++; continue; }
  if (!row.to) { rows.delete(row.from); keptRegistry++; continue; }   // live page and no target: keep it
  if (forced(row.from) || row.src === 'override') continue;
  row.note = `${row.note} · REVIEW: the new site serves this URL today (→ ${row.to ?? '—'})`;
  row.status = 'review';
}

// one hop: a target that is itself a source in this table
for (const row of rows.values()) {
  const next = row.to && rows.get(keyOf(row.to));
  if (next && next.status === 301) row.to = next.to;
}

const out = [...rows.values()].sort((a, b) => a.from.localeCompare(b.from));
const count = (f) => out.filter(f).length;
writeFileSync(join(HERE, '../src/data/redirects.json'), JSON.stringify({
  note: 'Generated by scripts/build-redirects.mjs — do not edit; change scripts/redirect-overrides.json and rebuild.',
  checkedAgainst: base,
  rows: out,
  rules: overrides.rules,
}, null, 1) + '\n');

console.log(`redirect table: ${out.length} rows — 301 ${count((r) => r.status === 301)} · pending ${count((r) => r.status === 'pending')} · 410 ${count((r) => r.status === 410)}`);
console.log(`  from: override ${count((r) => r.src === 'override')} · spec ${count((r) => r.src === 'spec')} · old map ${count((r) => r.src === 'old-map')}`);
console.log(`  spec paths with several targets (query rows, most clicks wins): ${specConflicts} · old-map rows on another host (experience.*), not served here: ${oldOtherHost}`);
console.log(`  registry pages kept (the sheet redirected them away): ${keptRegistry} · review (live today, decision needed): ${count((r) => r.status === 'review')}`);
console.log(`  rules: ${overrides.rules.length}`);
