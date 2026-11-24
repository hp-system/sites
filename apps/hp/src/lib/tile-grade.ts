// One even look for the tile photos (Collections, by area) — Sergei 2026-11-24, #361.
// The photos were taken in different light: a single filter only made them all a little paler and kept their
// differences. So each photo gets its own correction toward one target (measured on the photo itself: mean
// saturation → ~0.42, mean luminance → ~0.53), never darker (brightness ≥ 1), the coldest ones warmed a touch;
// then one shared tone over all of them (styles/kit.css). On hover a photo shows its own colours again.
// Keys are the Collections keys and the area slugs; a tile without an entry gets only the shared tone.
// Values: [saturate, brightness, sepia]. Measured 2026-11-24 on the chosen photos (scratch tool, not shipped);
// the four sea areas then made livelier (Sergei: «бледноваты»).
const GRADE: Record<string, [number, number, number]> = {
  sea: [0.85, 1.03, 0], pool: [1.11, 1.12, 0], top: [1.2, 1.0, 0], land: [0.88, 1.06, 0],
  houses: [1.2, 1.12, 0], maisonettes: [1.09, 1.07, 0], apartments: [1.2, 1.0, 0], business: [0.98, 1.03, 0],
  kassandra: [1.08, 1.05, 0.02], sithonia: [0.8, 1.08, 0.06], aristotelis: [0.85, 1.0, 0.03],
  'nea-propontida': [0.88, 1.0, 0.04], polygyros: [0.92, 1.04, 0],
};
/** The inline style that carries a tile's own correction (`--tile-grade`, read by styles/kit.css). */
export function tileGrade(key: string): string | undefined {
  const g = GRADE[key];
  return g ? `--tile-grade: saturate(${g[0]}) brightness(${g[1]}) sepia(${g[2]})` : undefined;
}

// The same correction found by the photo itself (the kit tiles of lists, guides and info pages carry no key):
// the chosen photos are known by path, so a tile showing one of them gets that photo's correction anywhere.
import { COLL_PHOTO } from './tile-photos';
import { AREA_PHOTO } from './area-tiles';
const BY_PATH = new Map<string, string>([
  ...Object.entries(COLL_PHOTO).map(([k, p]) => [p, k] as [string, string]),
  ...Object.entries(AREA_PHOTO).map(([k, p]) => [p, k] as [string, string]),
]);
/** The correction for a tile by its photo (chosen photos only; others get only the shared tone). */
export function tileGradeFor(photo: { url: string } | null | undefined): string | undefined {
  if (!photo?.url) return undefined;
  for (const [p, k] of BY_PATH) if (photo.url.endsWith(p)) return tileGrade(k);
  return undefined;
}
