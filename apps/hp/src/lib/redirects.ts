// ═══════════════════════════════════════════════════════════════════════════
// THE 301 ENGINE — old site URLs → the page that now holds the content (#56).
//
// George (20/10/2026): keep a live URL only if it is SEO-friendly and has value; otherwise a
// clean URL + 301. The maps were written first (content/redirects/*.json, article `old_url`);
// this file only reads them. Every visible English page is the goal of 21/10/2026, so:
//   · English sources → 301 (the target is the final English page);
//   · other languages → 302 for now: their pages come with the translations, and a permanent
//     redirect to English would be cached by browsers and search engines.
// Matching: path only, decoded, lower case, no trailing slash. The query string is kept.
// ═══════════════════════════════════════════════════════════════════════════
import services from '../content/redirects/services.json';
import articlesMap from '../content/redirects/articles.json';
import listings from '../content/redirects/listings.json';

type Entry = { from: string; to: string; lang?: string };

export function normPath(p: string): string {
  let s = p;
  try { s = decodeURIComponent(p); } catch { /* keep raw */ }
  s = s.toLowerCase().replace(/\/+$/, '');
  return s || '/';
}

const TABLE = new Map<string, { to: string; status: 301 | 302 }>();

function add(e: Entry): void {
  if (!e?.from || !e?.to) return;
  const key = normPath(e.from);
  if (key === normPath(e.to.split('#')[0])) return;           // never a loop
  if (TABLE.has(key)) return;                                  // first map wins (explicit before derived)
  const lang = e.lang ?? key.split('/')[1] ?? '';
  TABLE.set(key, { to: e.to, status: lang === 'en' ? 301 : 302 });
}

for (const m of [listings, articlesMap, services] as { redirects: Entry[] }[]) m.redirects.forEach(add);

// Articles: the old site's URL (often with ':' in the slug) → the clean URL (#22).
const articleFiles = import.meta.glob('../content/articles/en/**/*.md', { eager: true }) as Record<string, { frontmatter?: Record<string, unknown> }>;
for (const mod of Object.values(articleFiles)) {
  const fm = mod.frontmatter ?? {};
  const oldUrl = String(fm.old_url ?? '').replace(/^https?:\/\/[^/]+/i, '');
  const clean = String(fm.clean_url ?? '');
  if (oldUrl && clean) add({ from: oldUrl, to: clean, lang: 'en' });
}

/** Where an old URL now lives, or null. */
export function redirectFor(pathname: string): { to: string; status: 301 | 302 } | null {
  return TABLE.get(normPath(pathname)) ?? null;
}

/** For tests: every source and target. */
export function redirectTable(): [string, { to: string; status: 301 | 302 }][] {
  return [...TABLE.entries()];
}
