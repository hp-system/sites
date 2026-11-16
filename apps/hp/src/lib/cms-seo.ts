// SEO overrides from the CRM CMS (sites#307, Sergei 2026-11-16: the full site ↔ CRM connection).
// The office edits a page's SEO in the CRM («Site CMS» → pages → SEO) and the CRM serves the published values at
// GET /site/seo?site=hp as `{ pages: { '<path>': { '<lang>': { title, description, noindex, ogTitle, … } } } }`.
// What we take: title, description, og/twitter title, description and image, and an EXTRA noindex. What we never take:
// the canonical (one slip in the admin would move a page out of Google) and an «index» over our own noindex.
// Read once every 5 minutes, 2 s at most; the CRM down or the CMS empty (as on 2026-11-16) → our own values.
import { brand } from '../brand/index';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
const TTL = 300_000;

export type CmsSeo = {
  title?: string; description?: string; noindex?: boolean;
  ogTitle?: string; ogDescription?: string; ogImage?: string;
};
type Pages = Record<string, Record<string, CmsSeo>>;

let cache: { at: number; pages: Pages } | null = null;
let inflight: Promise<Pages> | null = null;

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

async function load(): Promise<Pages> {
  if (cache && Date.now() - cache.at < TTL) return cache.pages;
  if (inflight) return inflight;
  inflight = fetch(`${API}/site/seo?site=${brand.key}`, { signal: AbortSignal.timeout(2000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: any) => {
      const pages: Pages = j && typeof j.pages === 'object' && j.pages ? j.pages : {};
      cache = { at: Date.now(), pages };
      return pages;
    })
    .catch(() => cache?.pages ?? {})
    .finally(() => { inflight = null; });
  return inflight;
}

/** The CMS's values for this page and language, cleaned; null when it has none. */
export async function cmsSeo(pathname: string, lang: string): Promise<CmsSeo | null> {
  const pages = await load();
  if (!Object.keys(pages).length) return null;
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* as it is */ }
  p = p.replace(/\/+$/, '') || '/';
  // the CMS keys a page by its path, with or without the language prefix
  const noLang = p.replace(new RegExp(`^/${lang}(?=/|$)`), '') || '/';
  const hit = pages[p]?.[lang] ?? pages[noLang]?.[lang];
  if (!hit || typeof hit !== 'object') return null;
  const img = str(hit.ogImage, 500);
  return {
    title: str(hit.title, 120), description: str(hit.description, 320), noindex: hit.noindex === true,
    ogTitle: str(hit.ogTitle, 120), ogDescription: str(hit.ogDescription, 320),
    ogImage: img && /^https:\/\//.test(img) ? img : undefined,
  };
}
