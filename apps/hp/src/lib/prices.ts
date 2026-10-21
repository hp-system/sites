// ═══════════════════════════════════════════════════════════════════════════
// PRICE GUIDES — computed live from the listings the site already loads.
//
//   · /en/halkidiki-property-prices: median asking €/m² by municipality and by
//     area/village (areas are public as general information — George 20/10/2026)
//   · /en/property-for-sale-in-greece: "from €" by type and by municipality
//
// 🔢 NO COUNTS (George 17/10/2026): a group is shown only when it has enough
//    listings to be meaningful (MIN_SAMPLE), but that number is never printed.
// ═══════════════════════════════════════════════════════════════════════════
import type { Attrs, SiteProperty } from './api';
import { priceOf, priceVisible } from './api';
import { muniKey, municipalityOf } from './gate';
import { catKey } from './listing';
import type { Lang } from './i18n';

/** Fewer listings than this → the group is hidden (internal rule, never shown). */
const MIN_SAMPLE = 5;

const isLand = (a: Attrs) => catKey(a) === 'land';
const isHome = (a: Attrs) => catKey(a) === 'residency';
const areaName = (a: Attrs, lang: Lang) => {
  const i = a.area_i18n;
  return String((typeof i === 'object' && i ? i[lang] || i.en : '') || a.area || '').trim();
};
/** Floor area for homes, plot size for land. */
const sizeOf = (a: Attrs) => {
  const v = Number(isLand(a) ? (a.land_sq_meters ?? a.sqm) : (a.res_sq_meters ?? a.sqm));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const round = (n: number, step: number) => Math.round(n / step) * step;

export type PriceRow = {
  key: string;
  name: string;
  /** Median asking price per m² (floor area for homes, plot for land). */
  perSqm: number;
  low: number;
  high: number;
  /** Median asking price (homes) or median plot size in m² (land). */
  typical: number;
  areas: { name: string; perSqm: number }[];
};

function rows(items: SiteProperty[], keep: (a: Attrs) => boolean, lang: Lang, land: boolean): PriceRow[] {
  const byMuni = new Map<string, Attrs[]>();
  for (const p of items) {
    const a = p.attributes ?? {};
    if (!keep(a) || !priceVisible(a)) continue;
    const price = priceOf(a), size = sizeOf(a);
    if (!(price > 0) || !(size > 0)) continue;
    const k = muniKey(a);
    if (!k) continue;
    byMuni.set(k, [...(byMuni.get(k) ?? []), a]);
  }
  const out: PriceRow[] = [];
  for (const [key, list] of byMuni) {
    if (list.length < MIN_SAMPLE) continue;
    const per = list.map((a) => priceOf(a) / sizeOf(a)).sort((x, y) => x - y);
    const typ = list.map((a) => (land ? sizeOf(a) : priceOf(a))).sort((x, y) => x - y);
    const byArea = new Map<string, number[]>();
    for (const a of list) {
      const n = areaName(a, lang);
      if (n) byArea.set(n, [...(byArea.get(n) ?? []), priceOf(a) / sizeOf(a)]);
    }
    const areas = [...byArea]
      .filter(([, v]) => v.length >= MIN_SAMPLE)
      .map(([name, v]) => ({ name, perSqm: round(quantile(v.sort((x, y) => x - y), 0.5), land ? 1 : 10) }))
      .sort((x, y) => x.name.localeCompare(y.name, lang));
    out.push({
      key,
      name: municipalityOf(list[0], lang) || key,
      perSqm: round(quantile(per, 0.5), land ? 1 : 10),
      low: round(quantile(per, 0.25), land ? 1 : 10),
      high: round(quantile(per, 0.75), land ? 1 : 10),
      typical: round(quantile(typ, 0.5), land ? 10 : 1000),
      areas,
    });
  }
  return out.sort((x, y) => x.name.localeCompare(y.name, lang));
}

export function priceTables(items: SiteProperty[], lang: Lang): { homes: PriceRow[]; land: PriceRow[] } {
  return { homes: rows(items, isHome, lang, false), land: rows(items, isLand, lang, true) };
}

/** Lowest visible asking price (rounded down to €1,000) for the listings that pass `keep`. */
export function fromPrice(items: SiteProperty[], keep: (a: Attrs) => boolean): number {
  const prices = items
    .map((p) => p.attributes ?? {})
    .filter((a) => keep(a) && priceVisible(a))
    .map((a) => priceOf(a))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.floor(Math.min(...prices) / 1000) * 1000 : 0;
}

const sub = (a: Attrs) => String(a.subcategory ?? '').toLowerCase();
/** The "from €" guide by property type (Greece page). */
export const TYPE_GUIDE: { label: string; text: string; keep: (a: Attrs) => boolean }[] = [
  { label: 'Houses', text: 'Detached houses and houses in complexes', keep: (a) => isHome(a) && /detached|house/.test(sub(a)) },
  { label: 'Maisonettes', text: 'Two-level homes, often a short walk from the beach', keep: (a) => isHome(a) && /maisonette/.test(sub(a)) },
  { label: 'Apartments', text: 'The most affordable way into Halkidiki', keep: (a) => isHome(a) && /apartment|studio/.test(sub(a)) },
  { label: 'Land & plots', text: 'Building plots and land with views', keep: isLand },
];

/** Pre-published properties — the CRM has no such flag yet; this is where it plugs in. */
export function isPrePublished(a: Attrs): boolean {
  return a.pre_published === true || a.pre_published === 'true' || a.publicationState === 'pre_published';
}
