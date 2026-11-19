// Service pages carry a large hero photo of our own (watermarked _1920w + _800w srcset), approved
// by George 21/10/2026. Each page: the hero image with the expected property id and alt text,
// width/height set, fetchpriority="high", and og:image = the hero. Usage (from apps/hp, after
// `pnpm build`): node scripts/test-service-heroes.mjs
import { start, checkPage, check, failures, SITE } from './info-seo-check.mjs';

const HEROES = {
  '/en/services/buyer-services': 'ums_4761/land-sea-view-halkidiki-2986326863',
  '/en/services/seller-services': 'ums_4494/detached-house-aerial-halkidiki-2980294460',
  '/en/services/investor-services': 'ums_8535/land-beach-view-halkidiki-2973826451',
  '/en/services/construction-services': 'ums_7985/detached-house-facade-halkidiki-2982420238',
  '/en/services/buyer-services/full-property-management': 'ums_4494/detached-house-garden-halkidiki-2980293835',
  // /en/construction: no top picture since 2026-11-19 (Sergei «убери сверху картинку»): the form band opens the page
};

const stop = await start();
try {
  for (const [path, id] of Object.entries(HEROES)) {
    const html = await checkPage(path);
    if (!html) { check(`${path} loads`, false, 'page missing'); continue; }
    const fig = html.match(/<figure class="wrap info-hero"[\s\S]*?<\/figure>/);
    // a page on the kit (wave1) carries its hero in the top's picture (desktop source with the srcset)
    const pic = fig ? null : html.match(/<picture class="w1-top__img[\s\S]*?<\/picture>/);
    const img = fig ? fig[0].match(/<img [^>]*>/)?.[0] ?? '' : pic ? pic[0] : '';
    check(`${path} hero is ${id}`, img.includes(`${id}_1920w.jpg`), img ? 'hero found' : 'no hero');
    check(`${path} hero srcset 800w + 1920w`, img.includes(`${id}_800w.jpg 800w`) && img.includes(`${id}_1920w.jpg 1920w`), 'srcset');
    check(`${path} hero size and priority`, /width="1920"/.test(img) && /height="1280"/.test(img) && /fetchpriority="high"/.test(img), 'width/height/fetchpriority');
    const alt = img.match(/alt="([^"]*)"/)?.[1] ?? '';
    check(`${path} hero alt text`, alt.length >= 20, alt || 'empty');
    const og = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';
    check(`${path} og:image = hero`, og.includes(`${id}_1920w.jpg`), og || 'none');
  }
} finally {
  await stop();
}
process.exit(failures() ? 1 : 0);
