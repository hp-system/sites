// The «by area» tiles of the home page (#101, Areas.astro): the four municipality pages, each with its
// «from €» (lowest visible asking price, lib/prices.ts) and a watermarked property photo. Shared by the
// home page and the Sell page (Sergei 2026-11-10: «сделай етот блок ровно также как он есть на home»).
// 🔒 Only the MUNICIPALITY (public), never the area / village. No counts (George 17/10).
import type { AreaTile } from '../components/Areas.astro';
import { coverOf, heroReady, type Photo } from './photos';
import { priceOf, priceVisible } from './api';
import { facetUrl, FACETS } from './listing';
import { fromPrice } from './prices';
import { muniKey } from './gate';
import { AREA_PAGES, areaUrl } from '../content/areas/en';
import { money } from './format';
import { t, listUrl, type Lang } from './i18n';
import { specOf } from './seo-pages';
import REGISTRY from '../data/page-registry.json';

type Item = { id: string; attributes?: any };

/** The best photo of a property that passes `f`: the dearest one with a ready hero (as the home picks). */
export function pickCover(items: Item[], f: (a: any) => boolean, used = new Set<string>()): Photo | null {
  const hit = items
    .filter((p) => !used.has(p.id) && f(p.attributes ?? {}) && heroReady(p.attributes) && priceVisible(p.attributes))
    .sort((a, b) => priceOf(b.attributes) - priceOf(a.attributes))[0]
    ?? items.find((p) => !used.has(p.id) && f(p.attributes ?? {}));
  if (hit) used.add(hit.id);
  return hit ? coverOf(hit.attributes) : null;
}

/** The four municipality tiles and the lowest «from» among them. */
export function buildAreaTiles(items: Item[], lang: Lang, pick: (f: (a: any) => boolean) => Photo | null = (f) => pickCover(items, f), max = 4):
  { tiles: AreaTile[]; from: number } {
  const url = listUrl(lang);
  // Sergei 08/11: the spec's area pages P11–P14 where they exist (one URL per area); the old area page /
  // facet stays the fallback (e.g. Polygyros has no spec page).
  const pageOf = (id: string, fallback: string): string =>
    specOf(id, lang)?.path ?? ((REGISTRY.pages as any[]).find((r) => r.id === id)?.paths?.[lang] as string | undefined) ?? fallback;
  const tiles = AREA_PAGES.filter((p) => p.kind === 'municipality')
    .map((p) => {
      const facet = FACETS.find((f) => f.q.municipality === p.q.municipality);
      const keep = (a: any) => muniKey(a) === p.q.municipality;
      const from = fromPrice(items as any, keep);
      const name = facet?.name[lang] ?? p.name;
      return {
        key: p.slug, name, from,
        href: pageOf(({ kassandra: 'P11', sithonia: 'P12', 'nea-propontida': 'P13', aristotelis: 'P14', polygyros: 'P58' } as Record<string, string>)[p.slug] ?? '-',   // #267: Polygyros has its own page (P58) now
          lang === 'en' ? areaUrl(p.slug) : (facet ? facetUrl(lang, facet.key) : url)),
        alt: t(lang, 'home.area_alt', { name }),
        keep,
      };
    })
    .filter((x) => x.from > 0)
    .slice(0, max)
    .map(({ keep, ...x }) => ({ ...x, fromText: t(lang, 'home.from', { price: money(x.from, lang) }), photo: pick(keep) }));
  return { tiles, from: tiles.length ? Math.min(...tiles.map((x) => x.from)) : 0 };
}
