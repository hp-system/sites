// ═══════════════════════════════════════════════════════════════════════════
// ARTICLES — /en/articles/{category}/{slug} and the list /en/articles/{category}.
// English only for now (English-first build rule, George 20/10/2026); the content
// lives in src/content/articles/en (copied faithfully from the old site).
//
//  · `all-news` lists EVERY article, as on the old site; the other tabs list their own.
//  · The slug is the clean one: 9 old slugs had ":" in them. Their old URL stays in
//    `old_url` for the 301 engine, which comes at the end of the build.
//  · No count anywhere — no "46 Results" (George 17/10).
// ═══════════════════════════════════════════════════════════════════════════
import { redirectFor } from './redirects';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;

export const ARTICLE_LANG = 'en';
export const ALL = 'all-news';
/** Tabs in the order of the old site. A category without articles still has a page (empty state). */
export const CATEGORIES: { key: string; name: string }[] = [
  { key: 'all-news', name: 'All news' },
  { key: 'business-news', name: 'Business news' },
  { key: 'buyers', name: 'Buyers' },
  { key: 'constructors-news', name: 'Constructors' },
];
export const PER_PAGE = 10;   // 1 featured + 9 in the grid on page 1

export const categoryName = (key: string) =>
  CATEGORIES.find((c) => c.key === key)?.name ?? key;
export const isCategory = (key: string) => CATEGORIES.some((c) => c.key === key);

export const articlesRoot = () => `/${ARTICLE_LANG}/articles`;
export const categoryUrl = (key: string, page = 1) =>
  `${articlesRoot()}/${key}${page > 1 ? `?page=${page}` : ''}`;
export const articleUrl = (a: Article) => `${articlesRoot()}/${a.data.category}/${a.data.slug}`;

/** Newest first — by last update, then publication. */
const stamp = (a: Article) => Date.parse(a.data.updated || a.data.published || '') || 0;

let cache: Article[] | null = null;
export async function allArticles(): Promise<Article[]> {
  if (cache) return cache;
  // The glob loader takes the frontmatter `slug` as the id, so the language comes from the folder.
  const list = await getCollection('articles', (e) => (e.filePath ?? '').includes(`/articles/${ARTICLE_LANG}/`));
  // #152 / D-20261109-SS-2: an article the redirect table folds into a guide is no longer a page —
  // not in lists, not «related», not in the sitemap.
  cache = list.filter((a) => !redirectFor(articleUrl(a))).sort((a, b) => stamp(b) - stamp(a));
  return cache;
}

export async function inCategory(key: string): Promise<Article[]> {
  const all = await allArticles();
  return key === ALL ? all : all.filter((a) => a.data.category === key);
}

export async function findArticle(category: string, slug: string): Promise<Article | null> {
  const s = slug.toLowerCase();
  return (await allArticles()).find((a) => a.data.category === category && a.data.slug === s) ?? null;
}

/** Three related articles: same category first, then the newest others. */
export async function relatedTo(a: Article, n = 3): Promise<Article[]> {
  const all = (await allArticles()).filter((x) => x.id !== a.id);
  const same = all.filter((x) => x.data.category === a.data.category);
  const rest = all.filter((x) => x.data.category !== a.data.category);
  return [...same, ...rest].slice(0, n);
}

/** "12'" → 12. Falls back to ~230 words a minute. */
export function readingMinutes(a: Article): number {
  const m = String(a.data.reading_time ?? '').match(/\d+/);
  if (m) return Number(m[0]);
  const words = (a.body ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export function dateText(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A short excerpt for the list cards: the meta description. */
export const excerptOf = (a: Article) => a.data.description || '';
