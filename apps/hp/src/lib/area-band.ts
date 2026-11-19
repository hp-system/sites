// The photo under the glass of «About <municipality>» on the property page: one chosen landscape per
// municipality (Sergei 2026-11-16: «Свои фото районов» — the automatic pick put a house front under Polygyros).
// Picked by Sergei from the CRM's own property photos (contact sheet K2 · S1 · N7 · A6 · P5). Each photo belongs
// to a published property: when that property leaves the guest feed, the page falls back to the automatic pick,
// so a photo of an unpublished property is never shown. Shown watermarked, like every property photo (rule 4).
import { brand } from '../brand/index';

const M = brand.web.mediaOrigin;   // the media host comes from the brand (test-brand: no company literal outside src/brand)
export type BandShot = { ref: string; url: string };

export const AREA_BAND: Record<string, BandShot> = {
  'Κασσάνδρα': { ref: '7765', url: `${M}/properties/ums_7765/land-beach-view-halkidiki-2987287969.jpg` },     // K2: beach and pine forest from the air
  'Σιθωνία': { ref: '8440', url: `${M}/properties/ums_8440/land-beach-view-halkidiki-2973770266.jpg` },       // S1: sandy bay, green hills
  'Νέα Προποντίδα': { ref: '6583', url: `${M}/properties/ums_6583/plot-sea-view-halkidiki-2974768837.jpg` },  // N7: the long gulf from above
  'Αριστοτέλης': { ref: '6043', url: `${M}/properties/ums_6043/land-aerial-halkidiki-2986647334.jpg` },      // A6: bay, village and pier
  'Πολύγυρος': { ref: '7793', url: `${M}/properties/ums_7793/plot-mountain-view-halkidiki-2987321273.jpg` },  // P5: the town under the mountains
};

/** The chosen photo of a municipality, only while its property is still published (`live` = the guest refs). */
export function areaBandShot(muni: string, live: Set<string>): BandShot | null {
  const s = AREA_BAND[muni];
  return s && live.has(s.ref) ? s : null;
}
