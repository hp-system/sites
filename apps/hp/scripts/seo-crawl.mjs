// Site-wide SEO crawl (Sergei 2026-11-11: «пройдемся по всем страницам и проверим сео»).
// Every <loc> of the sitemap of a RUNNING site in production mode, on real data, checked against
// Google's rules, George's spec rules and ours. seo-check.mjs checks the registry pages against their
// spec text; this checks EVERY page (properties too) for what holds on any page, plus what only shows
// across pages (duplicate titles, hreflang that does not answer back, broken internal links).
//
//   node scripts/seo-crawl.mjs [--base http://127.0.0.1:4372] [--conc 4] [--max N] [--out report.json]
//
// The server must run with SITE_ENV=production (sitemap on, index). The production host is sent as
// x-forwarded-host, as verify-seo.mjs does. Exit 1 when any page has an error; warnings only report.
import { writeFileSync } from 'node:fs';
import { parse, checkCommon, text } from './seo-check-lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4372').replace(/\/$/, '');
const CONC = Number(arg('conc', 4));
const MAX = Number(arg('max', Infinity));
const OUT = arg('out');
const PROD = 'www.halkidikiproperties.com';
const ORIGIN = `https://${PROD}`;
const LANGS = ['el', 'en', 'de', 'sr', 'bg', 'ro', 'tr', 'he', 'ru'];
// R-005: the CRM's internal name never in a public page (spelled out by parts so this file is not a hit)
const CRM = new RegExp(['e', 'a?', 'lida'].join(''), 'i');
const len = (s) => [...(s ?? '')].length;

const get = (path) => fetch(BASE + path, { headers: { 'x-forwarded-host': PROD, 'user-agent': 'hp-seo-crawl' }, redirect: 'manual' });
const toPath = (u) => (u.startsWith(ORIGIN) ? u.slice(ORIGIN.length) || '/' : u);
// one spelling for every address: the sitemap is percent-encoded, the links in a page are read decoded
const dec = (u) => { try { return decodeURI(u); } catch { return u; } };
const enc = (p) => encodeURI(dec(p));

const sm = await get('/sitemap.xml');
if (sm.status !== 200) { console.error(`sitemap.xml → ${sm.status}: run the server with SITE_ENV=production`); process.exit(2); }
const xml = await sm.text();
let locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
const locSet = new Set(locs);
const locDec = new Set(locs.map((l) => dec(toPath(l))));
if (Number.isFinite(MAX)) locs = locs.slice(0, MAX);
console.log(`${locSet.size} URLs in the sitemap, crawling ${locs.length} (${CONC} at a time)`);

const pages = new Map();   // loc → { status, title, meta, h1, hreflang, links, errors, warns }
let done = 0;
const t0 = Date.now();
async function one(loc) {
  const path = toPath(loc);
  const pg = { loc, errors: [], warns: [] };
  pages.set(loc, pg);
  let res, html = '';
  for (let a = 0; a < 3; a++) { try { res = await get(path); html = await res.text(); break; } catch (e) { if (a === 2) { pg.errors.push(`fetch: ${e.message}`); return; } } }
  pg.status = res.status;
  if (res.status !== 200) { pg.errors.push(`status ${res.status}${res.headers.get('location') ? ' → ' + res.headers.get('location') : ''}`); return; }
  const p = parse(html);
  const urlLang = path.split('/')[1];
  pg.title = p.title; pg.meta = p.meta ?? ''; pg.h1 = p.h1; pg.hreflang = p.hreflang;
  // links inside the page (body only, our host)
  pg.links = [...new Set(p.anchors.map((a) => a.href).filter((h) => h && (h.startsWith('/') || h.startsWith(ORIGIN)) && !h.startsWith('//'))
    .map((h) => toPath(h).split('#')[0]).filter((h) => h && !h.startsWith('/api/')))];
  // a link with no words for a reader or a crawler: no text, no aria-label, no image with alt
  pg.emptyAnchors = [...p.body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter((m) => !/\saria-label="[^"]+"|\saria-hidden="true"/.test(m[1])
    && !text(m[2]) && !/<img\b[^>]*\salt="[^"]+"/.test(m[2]) && !/<title>/.test(m[2])).length;

  // ── errors: things Google or our rules treat as wrong ──
  if (p.canonical.length !== 1) pg.errors.push(`canonical: ${p.canonical.length} tags`);
  else if (p.canonical[0] !== loc) pg.errors.push(`canonical ${p.canonical[0]} ≠ loc`);
  if (!/^index, follow/.test(p.robots ?? '')) pg.errors.push(`robots meta «${p.robots}»`);
  if (res.headers.get('x-robots-tag')) pg.errors.push(`X-Robots-Tag ${res.headers.get('x-robots-tag')}`);
  if (LANGS.includes(urlLang) && p.lang.split('-')[0] !== urlLang) pg.errors.push(`<html lang="${p.lang}"> on a /${urlLang}/ page`);
  if (urlLang === 'he' && p.dir !== 'rtl') pg.errors.push('Hebrew page without dir="rtl"');
  if (!p.title) pg.errors.push('title missing');
  if (!p.meta) pg.errors.push('meta description missing');
  if (p.h1.length !== 1) pg.errors.push(`${p.h1.length} H1`);
  else if (!p.h1[0]) pg.errors.push('empty H1');
  if (/\{[a-z]\w*\}|undefined|NaN|\[object Object\]/.test(`${p.title} ${p.meta} ${p.h1.join(' ')}`)) pg.errors.push('placeholder or undefined in title/meta/H1');
  if (Object.keys(p.hreflang).length) {
    if (!p.hreflang['x-default']) pg.errors.push('hreflang without x-default');
    if (p.hreflang[urlLang] && p.hreflang[urlLang] !== loc) pg.errors.push(`hreflang ${urlLang} points elsewhere (${p.hreflang[urlLang]})`);
    if (!p.hreflang[urlLang] && LANGS.includes(urlLang)) pg.errors.push(`hreflang does not list the page itself (${urlLang})`);
  } else pg.warns.push('no hreflang');
  if (p.ld.some((x) => x['@parseError'])) pg.errors.push('JSON-LD does not parse');
  if (CRM.test(html)) pg.errors.push('CRM name in the page (R-005)');
  for (const c of checkCommon(p)) if (!c.startsWith('image alt')) pg.errors.push(c);
  // rule 14 (alts): an image a reader sees needs words; a hidden or decorative one (aria-hidden, the
  // blurred locked photos, the lightbox backdrop) rightly has alt="" and is not counted
  const seen = [...p.body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
    .filter((t) => !/\saria-hidden="true"/.test(t) && !/class="[^"]*\b(gpop__bl|logo|icon)\b/.test(t) && !/^data:/.test(t.match(/\ssrc="([^"]*)"/)?.[1] ?? ''));
  const noAlt = seen.filter((t) => !/\salt="[^"]*\S[^"]*"/.test(t)).length;
  if (noAlt) pg.warns.push(`image alt (rule 14): ${noAlt} visible image(s) without alt`);
  if (p.og.title === undefined) pg.errors.push('og:title missing');
  if (!/<meta property="og:image"/.test(p.head)) pg.warns.push('og:image missing');
  // ── warnings: length and shape (George rule 6: title ≤ 60; Google shows ~155 of a meta) ──
  if (len(p.title) > 60) pg.warns.push(`title ${len(p.title)} chars`);
  if (len(p.title) < 20) pg.warns.push(`title only ${len(p.title)} chars`);
  if (p.meta && len(p.meta) > 160) pg.warns.push(`meta ${len(p.meta)} chars`);
  if (p.meta && len(p.meta) < 70) pg.warns.push(`meta only ${len(p.meta)} chars`);
  if (p.h2.length === 0) pg.warns.push('no H2');
  const words = text(p.body).split(' ').length;
  if (words < 250) pg.warns.push(`thin: ${words} words`);
  if (pg.emptyAnchors) pg.warns.push(`${pg.emptyAnchors} link(s) without text`);
}

// a small pool
const queue = [...locs];
await Promise.all(Array.from({ length: CONC }, async () => {
  while (queue.length) {
    await one(queue.shift());
    if (++done % 250 === 0) console.log(`  ${done}/${locs.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
}));

// ── across pages ──
const ok200 = [...pages.values()].filter((p) => p.status === 200);
const dupes = (key) => {
  const m = new Map();
  for (const p of ok200) { const v = key(p); if (v) (m.get(v) ?? m.set(v, []).get(v)).push(p.loc); }
  return [...m.entries()].filter(([, l]) => l.length > 1);
};
const dTitle = dupes((p) => p.title), dMeta = dupes((p) => p.meta), dH1 = dupes((p) => (p.h1?.[0] ? `${p.loc.split('/')[3]}|${p.h1[0]}` : ''));
for (const [, l] of dTitle) for (const x of l) pages.get(x).warns.push(`same title as ${l.length - 1} other page(s)`);
for (const [, l] of dMeta) for (const x of l) pages.get(x).warns.push(`same meta as ${l.length - 1} other page(s)`);
// hreflang must answer back (Google: «if page X links to Y, Y must link to X»)
for (const p of ok200) for (const [lg, href] of Object.entries(p.hreflang ?? {})) {
  if (lg === 'x-default' || href === p.loc) continue;
  const q = pages.get(href);
  if (!locDec.has(dec(toPath(href)))) p.errors.push(`hreflang ${lg} → not in the sitemap: ${toPath(href)}`);
  else if (q?.status === 200 && q.hreflang && !Object.values(q.hreflang).includes(p.loc)) p.errors.push(`hreflang ${lg} does not answer back: ${toPath(href)}`);
}
// internal links: every distinct target, once
const targets = new Map();
for (const p of ok200) for (const l of p.links ?? []) (targets.get(l) ?? targets.set(l, []).get(l)).push(p.loc);
const unknown = [...targets.keys()].filter((l) => !locDec.has(dec(l)));
console.log(`checking ${unknown.length} linked addresses that are not in the sitemap`);
const linkRes = new Map();
const lq = [...unknown];
await Promise.all(Array.from({ length: CONC }, async () => {
  while (lq.length) { const l = lq.shift(); try { const r = await get(enc(l)); linkRes.set(l, { s: r.status, to: r.headers.get('location') }); await r.arrayBuffer(); } catch (e) { linkRes.set(l, { s: 0 }); } }
}));
const broken = [], redirected = [], notInSitemap = [];
for (const [l, r] of linkRes) {
  if (r.s >= 400 || r.s === 0) broken.push({ link: l, status: r.s, from: targets.get(l).length, example: toPath(targets.get(l)[0]) });
  else if (r.s >= 300) redirected.push({ link: l, status: r.s, to: r.to, from: targets.get(l).length, example: toPath(targets.get(l)[0]) });
  else notInSitemap.push({ link: l, from: targets.get(l).length });
}
for (const b of broken) for (const f of targets.get(b.link)) pages.get(f).errors.push(`broken link ${b.link} (${b.status})`);
for (const b of redirected) for (const f of targets.get(b.link)) pages.get(f).warns.push(`link through a redirect ${b.link}`);

// ── report ──
const all = [...pages.values()];
const tally = (k) => { const m = new Map(); for (const p of all) for (const e of p[k]) { const key = e.replace(/\/[^\s)]*|\d+/g, '#'); m.set(key, (m.get(key) ?? 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const kind = (loc) => { const s = dec(toPath(loc)).split('/'); return s.length <= 2 ? 'home' : /^\d+$/.test(s[3] ?? '') || s[2] === 'property' ? 'property' : s[2] ?? 'home'; };
const byKind = {};
for (const p of all) { const k = kind(p.loc); byKind[k] ??= { pages: 0, withErrors: 0, withWarns: 0 }; byKind[k].pages++; if (p.errors.length) byKind[k].withErrors++; if (p.warns.length) byKind[k].withWarns++; }
console.log(`\n${all.length} pages in ${Math.round((Date.now() - t0) / 1000)} s`);
console.log('\nErrors (count of pages):'); for (const [e, n] of tally('errors')) console.log(`  ${String(n).padStart(5)}  ${e}`);
console.log('\nWarnings (count of pages):'); for (const [e, n] of tally('warns')) console.log(`  ${String(n).padStart(5)}  ${e}`);
console.log(`\nDuplicate titles: ${dTitle.length} groups · metas: ${dMeta.length} · H1 (same language): ${dH1.length}`);
console.log(`Linked, not in the sitemap: broken ${broken.length} · redirect ${redirected.length} · 200 but not in sitemap ${notInSitemap.length}`);
console.log('\nBy page kind:'); for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].pages - a[1].pages)) console.log(`  ${k.padEnd(28)} ${String(v.pages).padStart(5)} pages · ${v.withErrors} with errors · ${v.withWarns} with warnings`);
if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), base: BASE, pages: all, dupes: { title: dTitle, meta: dMeta, h1: dH1 }, broken, redirected, notInSitemap }, null, 1));
const errPages = all.filter((p) => p.errors.length).length;
console.log(errPages ? `\n${errPages} page(s) with errors` : '\nno errors');
process.exit(errPages ? 1 : 0);
