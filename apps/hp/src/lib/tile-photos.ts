// The chosen tile photos (Sergei 2026-11-24): one photo per property type and per area, picked by the type's or the
// area's character from the company's own photos, the same on every page where a tile leads to that list (home
// Collections, the type and area rows of lists, guides and info pages). Clean files (rule 4: not a property card).
// A tile narrowed to one area (e.g. «Seafront» in Kassandra) keeps a photo of a property of that very selection:
// the general photo was taken elsewhere and would promise what the list does not show.
// The area photos live in lib/area-tiles.ts (AREA_PHOTO); the number in each comment is the property photographed.
import { brand } from '../brand/index';
import { specOf } from './seo-pages';
import { facetUrl } from './listing';
import type { Photo } from './photos';
import type { Lang } from './i18n';
import REGISTRY from '../data/page-registry.json';

/** Home Collections keys → photo path. */
export const COLL_PHOTO: Record<string, string> = {
  sea: '/properties/ums_4494/detached-house-aerial-halkidiki-2980294460.jpg',              // 4494
  pool: '/properties/ums_7949/detached-house-pool-halkidiki-2974710903.jpg',               // 7949
  top: '/properties/ums_7010/detached-house-terrace-halkidiki-2974736311.jpg',             // 7010 (Villa Natalia)
  land: '/properties/ums_5105/land-land-aerial-halkidiki-2973811209.jpg',                  // 5105
  houses: '/properties/ums_5171/detached-house-facade-halkidiki-kassandra-2974791374.jpg', // 5171
  maisonettes: '/properties/ums_5273/maisonette-facade-halkidiki-kassandra-2974446704.jpg', // 5273
  apartments: '/properties/ums_8329/apartment-balcony-halkidiki-2982729506.jpg',           // 8329
  business: '/properties/ums_8204/hotel-aerial-halkidiki-2987976803.jpg',                  // 8204, by day
};

/** List facet keys (lib/listing FACETS) → photo path; `spec` = George's page for that type, when it has one. */
const FACET_PHOTO: Record<string, { path: string; spec?: string }> = {
  homes: { path: COLL_PHOTO.houses, spec: 'P04' },
  houses: { path: COLL_PHOTO.houses, spec: 'P04' },
  apartments: { path: COLL_PHOTO.apartments, spec: 'P05' },
  maisonettes: { path: COLL_PHOTO.maisonettes, spec: 'P06' },
  villas: { path: '/properties/ums_7010/detached-house-pool-halkidiki-2974737417.jpg', spec: 'P07' },   // 7010 (Villa Natalia, the whole house)
  land: { path: COLL_PHOTO.land, spec: 'P08' },
  seafront: { path: COLL_PHOTO.sea, spec: 'P09' },
  affordable: { path: '/properties/ums_8568/studio-facade-halkidiki-3054342952.jpg', spec: 'P10' },     // 8568
  hotels: { path: COLL_PHOTO.business },
};

export const photoOf = (path: string): Photo => ({ url: `${brand.web.mediaOrigin}${path}`, alt: null });

const pathOf = (h: string): string => { try { return decodeURI(new URL(h, 'https://x').pathname).replace(/\/$/, ''); } catch { return h; } };

/** The tile's photo: the chosen one when the tile leads to a whole type list, else the one it has. */
export function tilePhoto(href: string, lang: Lang, photo: Photo | null): Photo | null {
  if (!href || href.includes('?')) return photo;   // a filtered list (a type in one area): its own property
  const p = pathOf(href);
  for (const [key, f] of Object.entries(FACET_PHOTO)) {
    const specPath = f.spec ? (specOf(f.spec, lang)?.path ?? ((REGISTRY.pages as any[]).find((r) => r.id === f.spec)?.paths?.[lang] as string | undefined)) : undefined;
    if ((specPath && pathOf(specPath) === p) || pathOf(facetUrl(lang, key)) === p) return photoOf(f.path);
  }
  return photo;
}
