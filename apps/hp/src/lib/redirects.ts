// ═══════════════════════════════════════════════════════════════════════════
// THE REDIRECT ENGINE — old site URLs → the page that now holds the content (#56, v2 #152).
//
// v2 (2026-11-09, plan stage 2) serves the merged table `src/data/redirects.json`, built by
// scripts/build-redirects.mjs from George's sheet + the overrides (D-20261106-SS-1 D7):
//   · 301 rows → 301 to the same-language page (one hop, checked live when the table was built);
//   · 410 rows → 410 Gone (files, the broken row, /currency/*);
//   · pending / review rows → nothing: the URL is served as today until its page exists.
// Then the legacy rules: /rs → /sr; /<lang>/ID123 and /<lang>/…-ID123 → that property's page
// (a property that is gone then answers 410 there, D6). /el/x → /x lives in [...path].astro.
// Last, the English rows of the first engine (content/redirects/*.json, article `old_url`) for
// paths the table does not know. Its non-English 302s to English pages (21/10, made while only
// English existed) are retired, as D7 says: «Always 301, same language, one hop».
// Matching: path only, decoded, NFC, lower case, no trailing slash. The query string is kept.
// ═══════════════════════════════════════════════════════════════════════════
import table from '../data/redirects.json';
import services from '../content/redirects/services.json';
import articlesMap from '../content/redirects/articles.json';
import listings from '../content/redirects/listings.json';
import registry from '../data/page-registry.json';
import { propertyUrl, type Lang } from './i18n';

export type Redirect = { to: string; status: 301 } | { to: null; status: 410 };
type Entry = { from: string; to: string; lang?: string };

export function normPath(p: string): string {
  let s = p;
  try { s = decodeURIComponent(p); } catch { /* keep raw */ }
  s = s.normalize('NFC').toLowerCase().replace(/\/+$/, '');
  return s || '/';
}

const TABLE = new Map<string, Redirect>();
const KNOWN = new Set<string>();   // every path the table mentions, whatever its status
for (const r of (table as { rows: { from: string; to: string | null; status: number | string }[] }).rows) {
  KNOWN.add(r.from);
  if (r.status === 301 && r.to) TABLE.set(r.from, { to: r.to, status: 301 });
  else if (r.status === 410) TABLE.set(r.from, { to: null, status: 410 });
}

// A page of the registry is served, never sent away by an old row (P67: the PEA page is back at its old URL,
// Sergei 2026-11-11; the first engine still maps it to a section of seller services).
const LIVE = new Set<string>();
for (const p of (registry as { pages: { status?: string; paths?: Record<string, string> }[] }).pages) {
  if (p.status === 'dropped') continue;
  for (const path of Object.values(p.paths ?? {})) LIVE.add(normPath(path));
}

const OLD = new Map<string, Redirect>();
function addOld(e: Entry): void {
  if (!e?.from || !e?.to) return;
  const key = normPath(e.from);
  const lang = e.lang ?? key.split('/')[1] ?? '';
  if (lang !== 'en' || KNOWN.has(key) || OLD.has(key) || LIVE.has(key)) return;   // the table decides what it knows; a live page stays
  if (key === normPath(e.to.split('#')[0])) return;              // never a loop
  OLD.set(key, { to: e.to, status: 301 });
}
for (const m of [listings, articlesMap, services] as { redirects: Entry[] }[]) m.redirects.forEach(addOld);
const articleFiles = import.meta.glob('../content/articles/en/**/*.md', { eager: true }) as Record<string, { frontmatter?: Record<string, unknown> }>;
for (const mod of Object.values(articleFiles)) {
  const fm = mod.frontmatter ?? {};
  const oldUrl = String(fm.old_url ?? '').replace(/^https?:\/\/[^/]+/i, '');
  const clean = String(fm.clean_url ?? '');
  if (oldUrl && clean) addOld({ from: oldUrl, to: clean, lang: 'en' });
}
// One hop for the old rows too: a target the table moves again goes straight to its end.
for (const [k, v] of OLD) {
  const next = v.to ? TABLE.get(normPath(v.to.split('#')[0])) : undefined;
  if (next?.status === 301) OLD.set(k, next);
  else if (next?.status === 410) OLD.delete(k);
}

const ID_RULE = /^\/(en|de|sr|bg|el)\/(?:.*-)?id(\d{1,6})$/;   // legacy .htaccess: /<lang>/ID123, /<lang>/<slug>-ID123

/** Where an old URL now lives (301), or that it is gone (410), or null: serve it as it is. */
export function redirectFor(pathname: string): Redirect | null {
  const k = normPath(pathname);
  const hit = TABLE.get(k) ?? OLD.get(k);
  if (hit) return hit;
  const rs = /^\/rs(\/.*)?$/.exec(k);
  if (rs) return { to: '/sr' + (rs[1] ?? ''), status: 301 };
  const id = ID_RULE.exec(k);
  if (id) return { to: propertyUrl(id[1] as Lang, id[2]), status: 301 };
  return null;
}

/** For tests: every source and its answer (table + old English rows). */
export function redirectTable(): [string, Redirect][] {
  return [...TABLE.entries(), ...OLD.entries()];
}
