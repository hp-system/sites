// ═══════════════════════════════════════════════════════════════════════════
// INFO PAGES — legal, sell, company and services pages, English first
// (George 20/10/2026). The text is the old site's, copied faithfully into
// src/content/pages/en/*.md; the URL is the old site's URL (`path`), so these
// pages need no redirect. Page texts live in files — no CMS (George 20/10).
// ═══════════════════════════════════════════════════════════════════════════
import { getCollection, type CollectionEntry } from 'astro:content';

export type InfoPage = CollectionEntry<'pages'>;

let cache: InfoPage[] | null = null;
export async function allInfoPages(): Promise<InfoPage[]> {
  if (cache) return cache;
  cache = await getCollection('pages');
  return cache;
}

/** The page published at this path (e.g. `/en/privacy-policy`), or null. */
export async function findInfoPage(path: string): Promise<InfoPage | null> {
  const p = path.toLowerCase().replace(/\/+$/, '');
  return (await allInfoPages()).find((x) => x.data.path === p) ?? null;
}

/** Day stamp for the sitemap: the page's own date, else the build day. */
export const infoLastmod = (pg: InfoPage, fallback: string) => (pg.data.updated || fallback).slice(0, 10);

/**
 * The new site's own earlier paths → the old site's URLs (301). Used only when the
 * target page exists, so a move goes live together with its page.
 */
export const EN_MOVED: Record<string, string> = {
  about: '/en/about-us',
  partners: '/en/our-partners',
  'services/buyers': '/en/services/buyer-services',
  'services/owners': '/en/services/seller-services',
  'services/investors': '/en/services/investor-services',
  'services/developers': '/en/services/construction-services',
  projects: '/en/construction',
  // The old site had the same text twice; one URL keeps it (open question for George).
  'sell/work-with-us-exclusively': '/en/work-with-us-exclusively',
};
