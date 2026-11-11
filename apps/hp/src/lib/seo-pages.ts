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

/** Spec pages with no template of their own: the router opens them in the plain GuidePage (Sergei 08/11). */
export const GUIDE_IDS = new Set(['P03', 'P19', 'P20', 'P21']);

/**
 * The spec and own pages the router serves from the spec data itself: the guides (GUIDE_IDS) and the own
 * pages P22+ (D-20261106-SS-2), each with its URL per language. The sitemap adds the ones that no content
 * page already lists (SEO crawl 2026-11-11: the guides were live and linked from every page, but missing).
 */
export function servedSpecGroups(): { id: string; at: Map<Lang, string> }[] {
  const groups = new Map<string, Map<Lang, string>>();
  for (const p of BY_ID.values()) {
    if (!GUIDE_IDS.has(p.id) && !(Number(p.id.slice(1)) > 21)) continue;
    (groups.get(p.id) ?? groups.set(p.id, new Map()).get(p.id)!).set(p.lang, p.path);
  }
  return [...groups.entries()].map(([id, at]) => ({ id, at }));
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

/** The FAQ heading of a spec page in every language (as SpecText shows it). */
export const FAQ_H: Record<Lang, string> = {
  en: 'Frequently asked questions', el: 'Συχνές ερωτήσεις', de: 'Häufige Fragen', sr: 'Česta pitanja', bg: 'Често задавани въпроси',
  ro: 'Întrebări frecvente', ru: 'Частые вопросы', tr: 'Sık sorulan sorular', he: 'שאלות נפוצות',
};

/** The three groups of a spec page's links out (properties · areas · guides), in every language. */
export const LINK_GROUPS: Record<Lang, [string, string, string]> = {
  en: ['Properties', 'Areas', 'Guides'], el: ['Ακίνητα', 'Περιοχές', 'Οδηγοί'], de: ['Immobilien', 'Regionen', 'Ratgeber'],
  sr: ['Nekretnine', 'Oblasti', 'Vodiči'], bg: ['Имоти', 'Райони', 'Наръчници'], ro: ['Proprietăți', 'Zone', 'Ghiduri'],
  ru: ['Недвижимость', 'Районы', 'Гиды'], tr: ['Emlak', 'Bölgeler', 'Rehberler'], he: ['נכסים', 'אזורים', 'מדריכים'],
};

/**
 * Which H2 section each link out belongs to (the home rotator, Sergei 08/11; every SEO block since
 * D-20261110-SS-3): the section sharing the most distinctive words with the link's anchor — 2 × words of
 * its heading + 1 × of its text; words found in most sections or most anchors (place name, «sale») do not
 * count; a tie goes to the section with fewer links; no match → the first section. Works in every language.
 * `join`: links that go with the section of the first spec link to page `withId`; `more`: extra guides,
 * by default with the section of the buying guide (P19). Anchors stay word for word.
 */
export function linksBySection(page: SpecPage, opts: { join?: { href: string; text: string; withId: string }[]; more?: { href: string; text: string }[] } = {}): { href: string; text: string }[][] {
  const secs = specSections(page.body);
  const bySec: { href: string; text: string }[][] = secs.map(() => []);
  if (!secs.length) return bySec;
  const words = (x: string) => x.toLowerCase().replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const secWords = secs.map((x) => new Set(words(x.h2 + ' ' + x.html)));
  const common = new Set([...new Set(secWords.flatMap((w) => [...w]))].filter((w) => secWords.filter((sw) => sw.has(w)).length > secs.length / 2));
  const stem = (w: string) => w.slice(0, 5);
  const headStems = secs.map((x) => new Set(words(x.h2).map(stem)));
  const bodyStems = secWords.map((sw) => new Set([...sw].map(stem)));
  const anchorWords = page.linksOut.map((l) => new Set(words(l.anchor).map(stem)));
  const anchorCommon = new Set([...new Set(anchorWords.flatMap((w) => [...w]))].filter((w) => anchorWords.filter((aw) => aw.has(w)).length > anchorWords.length / 3));
  const secOf = (anchor: string, fallback = 0): number => {
    const a = words(anchor).filter((w) => !common.has(w)).map(stem).filter((w) => !anchorCommon.has(w));
    let best = -1, score = 0;
    secs.forEach((_, i) => {
      const n = a.reduce((t, w) => t + (headStems[i].has(w) ? 2 : bodyStems[i].has(w) ? 1 : 0), 0);
      if (n > score || (n === score && n > 0 && bySec[i].length < bySec[best].length)) { score = n; best = i; }
    });
    return best < 0 ? fallback : best;
  };
  let guideSec = 0;
  const secById = new Map<string, number>();
  const pathOf = (href: string) => { try { return new URL(href, 'https://x').pathname; } catch { return href; } };
  page.linksOut.forEach((l) => {
    const k = secOf(l.anchor);
    bySec[k].push({ href: l.href, text: l.anchor });
    const id = specByPath(pathOf(l.href))?.id;
    if (id && !secById.has(id)) secById.set(id, k);
    if (id === 'P19') guideSec = k;
  });
  const have = new Set(page.linksOut.map((l) => { try { return decodeURI(pathOf(l.href)); } catch { return l.href; } }));
  (opts.join ?? []).filter((l) => !have.has(decodeURI(l.href)))
    .forEach((l) => bySec[secById.get(l.withId) ?? secOf(l.text)].push({ href: l.href, text: l.text }));
  (opts.more ?? []).forEach((l) => bySec[secOf(l.text, guideSec)].push(l));
  return bySec;
}

/** A link out that shows as a photo tile: a property list (P02, P04–P18, P58) or an old area page. */
export function isListLink(href: string): boolean {
  let path = href; try { path = decodeURI(new URL(href, 'https://x').pathname); } catch {}
  const n = Number((specByPath(path)?.id ?? '').slice(1));
  return n === 2 || (n >= 4 && n <= 18) || n === 58 || /\/property-for-sale\//.test(path);
}
