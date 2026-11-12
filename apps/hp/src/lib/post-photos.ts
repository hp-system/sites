// Photos for the posts of a spec page (the Sell layout, #193): one per H2 section, each from a different
// listing of the page itself, so a Kassandra page shows Kassandra homes and a land page shows land.
// Only open photos, always watermarked (R-007); never a locked property; alt from the photo's own texts.
import type { MosaicPhoto } from '../components/SpecMosaic.astro';
import { photosOf, isPhotoOpen, marked, markedSrcSet, altOf, focalStyle } from './photos';
import { subName } from './property';
import { municipalityOf } from './gate';
import type { Lang } from './i18n';

type Item = { id: string | number; title?: string; locked?: boolean; attributes?: any };

export function postPhotos(items: Item[], sections: number, lang: string): (MosaicPhoto | null)[] {
  const out: (MosaicPhoto | null)[] = [];
  const used = new Set<string | number>();
  for (let s = 0; s < sections; s++) {
    let hit: MosaicPhoto | null = null;
    for (const p of items) {
      if (p.locked || used.has(p.id)) continue;
      // the cover first (index 0), else the first open photo of the listing
      const ph = photosOf(p.attributes ?? {}).find((x, i) => isPhotoOpen(x, i));
      if (!ph) continue;
      used.add(p.id);
      // #251: the fallback was the CRM's item title («apartment · Πολυχρόνο»): English and a village, which a
      // guest never sees (R-006). Now the type and the municipality in the page language.
      const a = p.attributes ?? {};
      const own = `${subName(a, lang as Lang)} — ${municipalityOf(a, lang as Lang)}`;
      hit = { src: marked(ph.url, 1920), srcset: markedSrcSet(ph.url), alt: altOf(ph, lang, own), style: focalStyle(ph) };
      break;
    }
    out.push(hit);
  }
  return out;
}
