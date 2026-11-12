// ═══════════════════════════════════════════════════════════════════════════
// PAGE BLOCKS ABOVE THE SEO TEXT (#275, Sergei 2026-11-12: «такое выводить блоками как на главной Collections и
// Property in Halkidiki … что б ети блоки ишли выше, а потом блок сео с тем что осталось … для всех страниц»).
//
// Two blocks, the home page's Collections and «by area», built for the page they stand on:
//   · categories — a list or guide page: the property types of Halkidiki (the page's own topic left out);
//                  a municipality page: the same types IN that municipality, «from €» there;
//   · areas      — a topic page (seafront, villas …): the five areas for THAT topic, «from €» of the topic
//                  only (the approved pair page where George's sheet has one, else the filtered list, noindex);
//                  any other page: the five area pages with «from €» of the whole area.
// George's links (spec rule 15: exact anchor, exact target): a tile that is one of his links carries his
// anchor as its link text; the links a block shows leave the SEO sections (`consumed`), which keep the rest
// as text links.
// 🔢 Prices only — no counts (George 17/10). 🔒 Photos watermarked; municipality only, never a village.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from './i18n';
import { t } from './i18n';
import { FACETS, PAIRS, facetUrl, paramsOf, matches } from './listing';
import { fromPrice } from './prices';
import { money } from './format';
import { pickCover, buildAreaTiles } from './area-tiles';
import type { Photo } from './photos';

type Item = { id: string; attributes?: any };
type Facet = (typeof FACETS)[number];
export type BlockTile = { href: string; text: string; sub: string; photo: Photo | null; from: number };
export type PageBlocks = { cats: BlockTile[]; areas: BlockTile[]; areasFrom: number; consumed: Set<string> };

const CAT_KEYS = ['homes', 'apartments', 'maisonettes', 'villas', 'seafront', 'land', 'affordable', 'hotels'];
const MUNI_ORDER = ['kassandra', 'sithonia', 'aristotelis', 'propontida', 'polygyros'];   // as the home «by area»

/** The path of a link (decoded, no query): how a link and a tile are matched. */
export const linkPath = (href: string): string => { try { return decodeURI(new URL(href, 'https://x').pathname); } catch { return href; } };

export function pageBlocks(items: Item[], lang: Lang, facetKeys: string[], links: { href: string; text: string }[], self = ''): PageBlocks {
  const used = new Set<string>();
  const facets = facetKeys.map((k) => FACETS.find((x) => x.key === k)).filter(Boolean) as Facet[];
  const muni = facets.find((x) => x.q.municipality);
  const topic = facets.find((x) => !x.q.municipality);
  const isPair = (a: string, b: string) => PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const consumed = new Set<string>();
  // George's link to exactly this address (a filtered list «?muni=» is never his page)
  const anchorFor = (href: string) => (href.includes('?') ? undefined : links.find((l) => linkPath(l.href) === linkPath(href)));
  const tile = (href: string, name: string, q: object): BlockTile | null => {
    const keep = (a: any) => matches({ attributes: a } as any, q as any);
    const from = fromPrice(items as any, keep);
    if (!from) return null;
    const own = anchorFor(href);
    if (own) consumed.add(linkPath(own.href));
    return { href, text: own?.text ?? name, sub: t(lang, 'home.from', { price: money(from, lang) }), photo: pickCover(items, keep, used), from };
  };
  const notSelf = (x: BlockTile | null): x is BlockTile => !!x && linkPath(x.href) !== linkPath(self);

  // ── categories
  const cats = CAT_KEYS.map((k) => FACETS.find((x) => x.key === k)).filter(Boolean).map((c) => {
    if (muni) {
      const href = isPair(muni.key, c!.key) ? facetUrl(lang, muni.key, c!.key) : facetUrl(lang, c!.key) + paramsOf({ municipality: muni.q.municipality } as any);
      return tile(href, c!.name[lang], { ...muni.q, ...c!.q });
    }
    if (topic && c!.key === topic.key) return null;
    return tile(facetUrl(lang, c!.key), c!.name[lang], c!.q);
  }).filter(notSelf);

  // ── areas
  let areas: BlockTile[];
  let wholeFrom = 0;
  if (topic && !muni) {
    areas = MUNI_ORDER.map((k) => FACETS.find((x) => x.key === k)).filter(Boolean).map((m) => {
      const href = isPair(m!.key, topic.key) ? facetUrl(lang, m!.key, topic.key) : facetUrl(lang, topic.key) + paramsOf({ municipality: m!.q.municipality } as any);
      return tile(href, m!.name[lang], { ...m!.q, ...topic.q });
    }).filter(notSelf);
  } else {
    const built = buildAreaTiles(items as any, lang, (f) => pickCover(items, f, used), 5);
    wholeFrom = built.from;
    areas = built.tiles.map((a) => {
      const own = anchorFor(a.href);
      if (own) consumed.add(linkPath(own.href));
      return { href: a.href, text: own?.text ?? a.name, sub: a.fromText, photo: a.photo, from: 0 };
    }).filter((x) => linkPath(x.href) !== linkPath(self));
  }
  const froms = areas.map((a) => a.from).filter(Boolean);
  return { cats, areas, areasFrom: wholeFrom || (froms.length ? Math.min(...froms) : 0), consumed };
}
