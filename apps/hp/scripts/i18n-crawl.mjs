// Site-wide translation audit (#251, Sergei 2026-11-12: «проверить каждый язык полностью весь сайт,
// что б переведено было абсолютно все»). Every <loc> of the sitemap of a RUNNING site (production mode,
// real data): each page's visible text, alts, labels, title and meta, compared with the English page of
// the same hreflang group. Reported per language, grouped by string (one fix usually clears hundreds of pages):
//   same-as-en — a text segment identical to a segment of the English page (Latin words of 4+ letters);
//   latin      — on el/bg/ru/he pages, a run of 2+ Latin words that is not a known name.
// Brand, place names in Latin script, language names and contact data are allowed (ALLOW below).
//
//   node scripts/i18n-crawl.mjs [--base http://127.0.0.1:4372] [--conc 4] [--max N] [--out report.json]
//
// Exit 1 when anything is found outside ALLOW.
import { writeFileSync } from 'node:fs';
import { decode, parse } from './seo-check-lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4372').replace(/\/$/, '');
const CONC = Number(arg('conc', 4));
const MAX = Number(arg('max', Infinity));
const OUT = arg('out');
const PROD = 'www.halkidikiproperties.com';
const ORIGIN = `https://${PROD}`;
const NON_LATIN = new Set(['el', 'bg', 'ru', 'he']);

// Names that stay as they are in every language (brand, product names, language names in their own
// script, Latin place names on Latin-script pages are caught by the same-as-en rule only if a whole
// segment is a name — those are listed here).
const ALLOW = [
  /^halkidiki properties$/i, /^secret portfolio$/i, /^exclusive$/i, /^golden visa$/i, /^whatsapp$/i, /^viber$/i, /^google( maps)?$/i,
  /^(english|deutsch|srpski|română|türkçe|ελληνικά|български|русский|עברית)$/i,
  /^[\w.+-]+@[\w.-]+$/, /^https?:\/\//i, /^[+\d\s()€.,:/–-]+$/,
  /^(halkidiki|chalkidiki|kassandra|sithonia|nea propontida|aristotelis|polygyros|thessaloniki|neo rysio|mount athos)(,\s*(halkidiki|chalkidiki|greece|thessaloniki))*$/i,
  /^(facebook|instagram|youtube|linkedin|tiktok|x)$/i, /^www\.halkidikiproperties\.com$/i,
];
// words that are the same in the language itself (checked one by one, 2026-11-12)
const SAME_WORD = {
  de: ['Blog', 'Cookies', 'Marketing', 'Hotels', '8. Cookies', 'Maisonette'], ro: ['Blog', 'Contact', 'Marketing'], sr: ['Blog', 'Marketing'],
  tr: ['Blog'], el: ['Cookies', '8. Cookies'],
};
const allowedIn = (lang, s) => allowed(s) || (SAME_WORD[lang] ?? []).includes(s);
const allowed = (s) => ALLOW.some((r) => r.test(s));
// names that stay in Latin script inside a sentence of any language: removed before the Latin-run test
const NAMES = /Halkidiki Properties|Secret Portfolio|Golden Visa|George Tsigaras|GREEK PROPERTIES[^«»“”"()]*|Electronic Premium Registration|Google Analytics|Google|Facebook|LinkedIn|Instagram|WhatsApp|What’s up|Viber|SendGrid|monday|Crisp|Privacy Authority|www\.halkidikiproperties\.com/gi;

const get = (path) => fetch(BASE + path, { headers: { 'x-forwarded-host': PROD, 'user-agent': 'hp-i18n-crawl' }, redirect: 'manual' });
const toPath = (u) => (u.startsWith(ORIGIN) ? u.slice(ORIGIN.length) || '/' : u);
const langOf = (path) => { const s = decodeURI(path).split('/')[1]; return ['en', 'de', 'sr', 'bg', 'ro', 'tr', 'he', 'ru'].includes(s) ? s : 'el'; };

/** The words a reader meets on the page: text between tags, alts, labels, placeholders, title, meta. */
function segments(html) {
  const p = parse(html);
  const body = html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ');
  const out = new Set();
  const add = (s) => { s = decode(s).replace(/\s+/g, ' ').trim(); if (s && /[A-Za-zΑ-ωА-яא-ת]/.test(s)) out.add(s); };
  const start = body.search(/<body\b/i);
  // a tag ends at the first «>» outside quotes (attribute values hold JSON with words in them)
  for (const m of body.slice(start > 0 ? start : 0).split(/<(?:[^>"']|"[^"]*"|'[^']*')*>/)) add(m);
  for (const m of body.matchAll(/\s(?:alt|title|aria-label|placeholder)="([^"]+)"/gi)) add(m[1]);
  add(p.title ?? ''); add(p.meta ?? '');
  return { segs: out, hreflang: p.hreflang ?? {} };
}

const latinRun = (s) => /\b[A-Za-z]{3,}\b[\s,'’-]+\b[A-Za-z]{3,}\b/.test(s.replace(NAMES, ' · '));
const englishish = (s) => /\b[A-Za-z]{4,}\b/.test(s);

const sm = await get('/sitemap.xml');
if (sm.status !== 200) { console.error(`sitemap.xml → ${sm.status}: run the server with SITE_ENV=production`); process.exit(2); }
let locs = [...(await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (Number.isFinite(MAX)) locs = locs.slice(0, MAX);
console.log(`crawling ${locs.length} URLs (${CONC} at a time)`);

const pages = new Map();   // path → { lang, segs, en }
const enCache = new Map();
async function fetchSegs(path) {
  for (let a = 0; a < 3; a++) {
    try { const r = await get(path); if (r.status !== 200) return null; return segments(await r.text()); } catch { /* retry */ }
  }
  return null;
}
let done = 0;
const t0 = Date.now();
async function one(loc) {
  const path = toPath(loc);
  const lang = langOf(path);
  const s = await fetchSegs(path);
  if (!s) return;
  if (lang === 'en') enCache.set(decodeURI(path), s.segs);
  const enHref = s.hreflang.en ? decodeURI(toPath(s.hreflang.en)) : undefined;
  pages.set(path, { lang, segs: s.segs, enHref });
  if (++done % 250 === 0) console.log(`${done}/${locs.length} · ${Math.round((Date.now() - t0) / 1000)}s`);
}
const q = [...locs];
await Promise.all(Array.from({ length: CONC }, async () => { while (q.length) await one(q.shift()); }));

// English pages that are not in the sitemap themselves (a language copy may point to one) — fetched once
for (const pg of pages.values()) if (pg.lang !== 'en' && pg.enHref && !enCache.has(pg.enHref)) {
  const s = await fetchSegs(encodeURI(pg.enHref)); enCache.set(pg.enHref, s?.segs ?? new Set());
}

// language → string → { kind, pages: [path…] }
const found = {};
for (const [path, pg] of pages) {
  if (pg.lang === 'en') continue;
  const en = (pg.enHref && enCache.get(pg.enHref)) || new Set();
  for (const s of pg.segs) {
    if (allowedIn(pg.lang, s)) continue;
    const kind = en.has(s) && englishish(s) ? 'same-as-en' : NON_LATIN.has(pg.lang) && latinRun(s) ? 'latin' : null;
    if (!kind) continue;
    const L = (found[pg.lang] ??= {});
    (L[s] ??= { kind, pages: [] }).pages.push(decodeURI(path));
  }
}

let total = 0;
for (const lang of Object.keys(found).sort()) {
  const rows = Object.entries(found[lang]).sort((a, b) => b[1].pages.length - a[1].pages.length);
  total += rows.length;
  console.log(`\n## ${lang}: ${rows.length} strings`);
  for (const [s, r] of rows.slice(0, 60)) console.log(`  ${String(r.pages.length).padStart(5)} ${r.kind.padEnd(10)} ${JSON.stringify(s.slice(0, 110))}  e.g. ${r.pages[0]}`);
  if (rows.length > 60) console.log(`  … ${rows.length - 60} more`);
}
if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), base: BASE, crawled: pages.size, found }, null, 1));
console.log(`\n${pages.size} pages · ${total} untranslated strings`);
process.exit(total ? 1 : 0);
