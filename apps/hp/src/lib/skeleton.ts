// Local skeleton of every registry page (#157, plan E-111 stage 2 preview).
//
// On ONLY when SKELETON=1 and the site is not in production (the middleware checks both).
// Then every page of src/data/page-registry.json opens at its real URL as a wireframe built
// from the spec data (src/content/seo), and /skeleton is the map of all pages. Nothing here
// is used by the real templates; it shows the structure before the design exists (R-009).
import registry from '../data/page-registry.json';

export type SeoPage = {
  id: string; lang: string; name: string; pageType: string; path: string; priority: string;
  keyword: { primary: string; volume: number; secondary: string[] };
  title: string; meta: string; h1: string; h2: string[]; faq: { q: string; a: string }[];
  intro: string; body: string; listingFilter: string; indexing: string; canonical: string;
  schema: string[]; breadcrumb: string[]; heroAlt: string; ogTitle: string; anchor: string;
  linksOut: { anchor: string; href: string }[]; linkedFrom: string[]; cta: string;
  oldUrls: { path: string; clicks: number }[]; words: number; editorialLine: string;
};
export type RegPage = {
  id: string; name: string; source: 'spec' | 'page'; template: string;
  menu: { section: string; order: number } | null; parent?: string; footer: boolean;
  status: string; paths?: Record<string, string>; note?: string;
};

const files = import.meta.glob('../content/seo/*/*.json', { eager: true, import: 'default' }) as Record<string, SeoPage>;
const SEO = new Map<string, SeoPage>();
for (const p of Object.values(files)) SEO.set(`${p.id}/${p.lang}`, p);

export const PAGES = (registry.pages as RegPage[]).filter((p) => p.status !== 'dropped');   // D-20261109-SS-4
export const SECTIONS = registry.sections as string[];
export const SECTION_LABEL: Record<string, string> = {
  buy: 'Buy', sell: 'Sell', halkidiki: 'Halkidiki', services: 'Services', about: 'About us', exclusive: 'Exclusive', contact: 'Contact',
};
export const LANGS = ['en', 'el', 'de', 'sr', 'bg', 'ro', 'ru', 'tr', 'he'];

export const skeletonOn = (): boolean => process.env.SKELETON === '1';

export const seoOf = (id: string, lang: string): SeoPage | undefined => SEO.get(`${id}/${lang}`);
export const langsOf = (id: string): string[] => LANGS.filter((l) => SEO.has(`${id}/${l}`));

/** URL of a page in a language; P22+ fall back to EN until the languages stage. */
export function pathOf(id: string, lang: string): string | undefined {
  const r = PAGES.find((p) => p.id === id);
  if (!r) return undefined;
  if (r.source === 'spec') return (seoOf(id, lang) ?? (id === 'P03' ? seoOf('P01', lang) : undefined) ?? seoOf(id, 'en'))?.path;
  return r.paths?.[lang] ?? r.paths?.en;
}

const BY_PATH = new Map<string, { id: string; lang: string }>();
for (const p of SEO.values()) BY_PATH.set(p.path.toLowerCase(), { id: p.id, lang: p.lang });
for (const r of PAGES) for (const [lang, path] of Object.entries(r.paths ?? {})) BY_PATH.set(path.toLowerCase(), { id: r.id, lang });

export function findByPath(pathname: string): { id: string; lang: string } | undefined {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* keep */ }
  return BY_PATH.get((p.replace(/\/+$/, '') || '/').toLowerCase());
}

export const children = (id: string): RegPage[] => PAGES.filter((p) => p.parent === id);
export const menuOf = (section: string): RegPage[] =>
  PAGES.filter((p) => p.menu?.section === section).sort((a, b) => a.menu!.order - b.menu!.order);
export const footerPages = (): RegPage[] => PAGES.filter((p) => p.footer);

/** The spec's title rule (0_README rule 6): the brand only when the total stays ≤ 60. */
export const fullTitle = (title: string, brand: string): string =>
  [...`${title} | ${brand}`].length <= 60 ? `${title} | ${brand}` : title;

/** JSON for a <script> tag: no «</» can close it early. */
export const ldJson = (x: unknown): string => JSON.stringify(x).replace(/</g, '\\u003c');
