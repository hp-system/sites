// The spec pages (#160, plan E-111): George's SEO spec as data, src/content/seo/<ID>/<lang>.json,
// written by scripts/import-seo-spec.mjs and checked by scripts/test-seo-spec.mjs. A template asks
// for its page by URL and renders the spec's title, meta, H1, texts, FAQ and links word for word.
import type { Lang } from './i18n';

export type SpecPage = {
  id: string; lang: Lang; name: string; pageType: string; path: string; canonical: string;
  title: string; meta: string; h1: string; h2: string[]; ogTitle: string;
  intro: string; body: string; faq: { q: string; a: string }[]; faqQuestions: string[];
  schema: string[]; breadcrumb: string[]; heroAlt: string; galleryAltPattern: string;
  anchor: string; anchorVariants: string[];
  linksOut: { anchor: string; href: string }[]; cta: string; editorialLine: string;
  ctaHref?: string;   // own pages (P22+): where the CTA button goes
  /** own pages: a photo after a section, chosen by the photo's own tag (and land / min price) */
  photoThemes?: { after: string; tags: string[]; category?: string; minPrice?: number }[];
  /** own pages: the H2 whose block stands out (black, as the home's fact tiles) */
  standout?: string | string[];   // one H2 or several (Sergei 2026-11-10: «Three ways» black too)
  /** own pages: a fixed photo per post (CC0 stock, public/pages/…/<file>_640w|_960w.webp); wins over photoThemes */
  postPhotos?: { after: string; file: string; alt: string }[];
  /** own pages: the posts whose heading gets a decorative «?» beside it (not part of the heading) */
  questionMarks?: string[];
};

const files = {
  ...import.meta.glob('../content/seo/*/*.json', { eager: true, import: 'default' }),
  // pages outside George's spec (P22+), written from briefs in his format (D-20261106-SS-2)
  ...import.meta.glob('../content/seo-own/*/*.json', { eager: true, import: 'default' }),
} as Record<string, SpecPage>;
const BY_PATH = new Map<string, SpecPage>();
const BY_ID = new Map<string, SpecPage>();
for (const p of Object.values(files)) {
  BY_PATH.set(p.path.toLowerCase(), p);
  BY_ID.set(`${p.id}/${p.lang}`, p);
}

const decode = (u: string): string => { try { return decodeURIComponent(u); } catch { return u; } };

/** The spec page at this URL path (raw or percent-encoded), if George's spec has one. */
export function specByPath(path: string): SpecPage | undefined {
  return BY_PATH.get((decode(path).replace(/\/+$/, '') || '/').toLowerCase());
}

/** The URL of a breadcrumb step named `name` in `lang`: the spec or own page whose own last crumb
 *  carries that name (e.g. «Sell» → /en/sell). Undefined when no page has it. */
export function crumbPath(name: string, lang: Lang): string | undefined {
  for (const p of BY_ID.values()) if (p.lang === lang && p.breadcrumb[p.breadcrumb.length - 1] === name) return p.path;
  return undefined;
}

/** The same page in another language (P03 falls back to the home page in sr/bg/ro). */
export function specOf(id: string, lang: Lang): SpecPage | undefined {
  return BY_ID.get(`${id}/${lang}`) ?? (id === 'P03' ? BY_ID.get(`P01/${lang}`) : undefined);
}

/** The spec's title rule (0_README rule 6): the brand only if the total stays ≤ 60 characters. */
export function specTitle(title: string, brand: string): string {
  return [...`${title} | ${brand}`].length <= 60 ? `${title} | ${brand}` : title;
}

/** Breadcrumb of a spec page: names from the spec, URLs from the spec pages they name. */
export function specCrumbs(p: SpecPage, links: (string | undefined)[]): { name: string; url?: string }[] {
  return p.breadcrumb.map((name, i, a) => ({ name, url: i === a.length - 1 ? p.path : links[i] }));
}

/** The spec body cut at its H2s: [{ h2, html }] (html = what follows the heading). */
export function specSections(body: string): { h2: string; html: string }[] {
  return body.split(/(?=<h2>)/).filter((x) => x.startsWith('<h2>')).map((x) => {
    const m = x.match(/^<h2>([\s\S]*?)<\/h2>([\s\S]*)$/);
    return { h2: m ? m[1] : '', html: m ? m[2].trim() : x };
  });
}

/** URL of a spec page in this language, or `fallback` when the spec has none (SEO audit 08/11:
 *  menus and tiles link the clean spec pages, not filter URLs). */
export function specPathOr(id: string, lang: Lang, fallback: string): string {
  return specOf(id, lang)?.path ?? fallback;
}
/** The spec area page of a municipality (its Greek key, as in the data). Polygyros has none. */
export const MUNI_SPEC: Record<string, string> = {
  'Κασσάνδρα': 'P11', 'Σιθωνία': 'P12', 'Νέα Προποντίδα': 'P13', 'Αριστοτέλης': 'P14',
};

/** The anchor of a section heading (on-page navigator, Sell posts): its words in lower case,
 *  joined by hyphens; letters of every script are kept. */
export function h2Id(h: string): string {
  return h.replace(/<[^>]+>/g, ' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}
