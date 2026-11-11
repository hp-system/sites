// Property pages follow George's spec, sheet 4 (Sergei 2026-11-11 «Таблица Джорджа»): title, meta, H1 and
// the cover alt from the patterns; the four links with their exact anchors (type page, municipality page,
// P02, P03 or P01); at least four similar properties. Stub data (variety): property 10014 is an apartment in
// Aristotelis, 64 m², 5 bedrooms, «nearby» the sea, €114,000; property 10012 is a plot in Kassandra.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-property-seo.mjs
import { readFileSync } from 'node:fs';
import { start, check, failures, SITE } from './info-seo-check.mjs';

const spec = (id, lang) => JSON.parse(readFileSync(new URL(`../src/content/seo/${id}/${lang}.json`, import.meta.url), 'utf8'));
const get = async (p) => { const r = await fetch(SITE + encodeURI(p)); return r.status === 200 ? r.text() : ''; };
const g = (h, re) => (h.match(re) ?? [])[1] ?? '';
const dec = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const anchors = (h) => [...h.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [decodeURI(m[1].replace(/^https?:\/\/[^/]+/, '')), dec(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())]);

const stop = await start();
try {
  const en = await get('/en/property/10014');
  check('10014 loads', !!en, 'page');
  check('10014 title (sheet 4)', dec(g(en, /<title>([^<]*)/)) === 'Apartment for sale in Aristotelis, Halkidiki – 64 m²', g(en, /<title>([^<]*)/));
  check('10014 H1 (sheet 4)', g(en, /<h1[^>]*>([^<]*)/) === 'Apartment for sale in Aristotelis, Halkidiki', g(en, /<h1[^>]*>([^<]*)/));
  const meta = dec(g(en, /name="description" content="([^"]*)"/));
  check('10014 meta (sheet 4), ≤ 160', meta.startsWith('Apartment of 64 m² for sale in Aristotelis, Halkidiki, Greece.') && meta.includes('5 bedrooms')
    && meta.includes('Price €114,000.') && meta.endsWith('See photos and book a viewing.') && [...meta].length <= 160, meta);
  // the stub has no photos: the cover alt is checked when the property has a photo of its own (without one, the
  // page shares the home's photo with that photo's alt — Base default since the SEO crawl of 2026-11-11)
  const ogAlt = dec(g(en, /og:image:alt" content="([^"]*)"/));
  check('10014 cover alt (sheet 4)', !/class="cell"/.test(en) || ogAlt.startsWith('Apartment in Aristotelis, Halkidiki'), ogAlt || 'no share image (stub)');
  const a = anchors(en);
  for (const id of ['P05', 'P14', 'P02', 'P03']) {
    const sp = spec(id, 'en');
    check(`10014 link → ${id} with its exact anchor «${sp.anchor}»`, a.some(([h, t]) => h === sp.path && t === sp.anchor), sp.path);
  }
  const similar = new Set(a.filter(([h]) => /^\/en\/property\/\d+$/.test(h) && !h.endsWith('/10014')).map(([h]) => h));
  check('10014 at least four similar properties', similar.size >= 4, `${similar.size}`);

  const land = await get('/en/property/10012');
  check('10012 (plot) link → P08 land with its exact anchor', anchors(land).some(([h, t]) => h === spec('P08', 'en').path && t === spec('P08', 'en').anchor), 'P08');
  check('10012 (plot) link → P11 Kassandra with its exact anchor', anchors(land).some(([h, t]) => h === spec('P11', 'en').path && t === spec('P11', 'en').anchor), 'P11');

  // Greek: the place in its case («στον Δήμο Αριστοτέλη»), never «στην Αριστοτέλης»
  const elPath = g(en, /hreflang="el" href="([^"]+)"/).replace(/^https?:\/\/[^/]+/, '');
  const el = await get(decodeURI(elPath));
  check('10014 el H1 with the place in its case', g(el, /<h1[^>]*>([^<]*)/).includes('στον Δήμο Αριστοτέλη') && !el.includes('στην Αριστοτέλης'), g(el, /<h1[^>]*>([^<]*)/));
  check('10014 el meta «στον Δήμο Αριστοτέλη»', dec(g(el, /name="description" content="([^"]*)"/)).includes('στον Δήμο Αριστοτέλη,'), 'genitive');
  // Russian: «в Аристотелисе», «5 спален»
  const ruPath = g(en, /hreflang="ru" href="([^"]+)"/).replace(/^https?:\/\/[^/]+/, '');
  const ru = dec(g(await get(decodeURI(ruPath)), /name="description" content="([^"]*)"/));
  check('10014 ru meta «в Аристотелисе», «5 спален»', ru.includes('в Аристотелисе') && ru.includes('5 спален'), ru);
  // P01 instead of P03 in Serbian
  const srPath = g(en, /hreflang="sr" href="([^"]+)"/).replace(/^https?:\/\/[^/]+/, '');
  const sr = await get(decodeURI(srPath));
  const p01 = spec('P01', 'sr');
  check('10014 sr link → P01 (no P03 in sr) with its exact anchor', anchors(sr).some(([h, t]) => h === decodeURI(p01.path) && t === p01.anchor), p01.anchor);
} finally {
  stop();
}
if (failures()) { console.log(`\n${failures()} FAIL`); process.exit(1); }
console.log('\nALL OK');
process.exit(0);
