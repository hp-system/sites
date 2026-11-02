// ═══════════════════════════════════════════════════════════════════════════
// «PROPERTY FOR SALE IN HALKIDIKI» cards of the info pages, desktop wave 1 (#105 Sell;
// Services and Company reuse it). One card per municipality, in the order of the area
// pages: the list of that municipality, the area guide (English), a photo.
//
// 🔒 Visibility: only the MUNICIPALITY (public). Never the area / village.
// 🔒 Photos: the cover of a property in that municipality, watermarked (`marked`), picked as
//    the home «by area» tiles pick theirs (#101): a ready cover, visible price, dearest first.
// ═══════════════════════════════════════════════════════════════════════════
import type { SiteProperty } from './api';
import { priceOf, priceVisible } from './api';
import { coverOf, heroReady, marked, markedSrcSetSmall, altOf } from './photos';
import { muniKey } from './gate';
import { FACETS, facetUrl } from './listing';
import { AREA_PAGES, areaUrl } from '../content/areas/en';
import { listUrl, t, type Lang } from './i18n';

export type AreaCard = { key: string; name: string; href: string; guide: string; img: string; srcset: string; alt: string };

export function areaCards(items: SiteProperty[], lang: Lang): AreaCard[] {
  const used = new Set<string | number>();
  const out: AreaCard[] = [];
  for (const p of AREA_PAGES.filter((x) => x.kind === 'municipality')) {
    const facet = FACETS.find((f) => f.q.municipality === p.q.municipality);
    const keep = (a: any) => muniKey(a ?? {}) === p.q.municipality;
    const pool = items.filter((x) => !used.has(x.id) && keep(x.attributes));
    const hit = pool.filter((x) => heroReady(x.attributes) && priceVisible(x.attributes))
      .sort((a, b) => priceOf(b.attributes) - priceOf(a.attributes))[0] ?? pool[0];
    const photo = hit ? coverOf(hit.attributes) : null;
    if (!hit || !photo) continue;
    used.add(hit.id);
    const name = facet?.name[lang] ?? p.name;
    const alt = t(lang, 'home.area_alt', { name });
    out.push({
      key: p.slug, name,
      href: facet ? facetUrl(lang, facet.key) : listUrl(lang),
      guide: lang === 'en' ? areaUrl(p.slug) : '',
      img: marked(photo.url, 800), srcset: markedSrcSetSmall(photo.url), alt: altOf(photo, lang, alt),
    });
  }
  return out;
}
