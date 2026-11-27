// Services pages (English, old site's URLs — George 20/10/2026): SEO checks on the hub, the four
// section pages, full property management and /en/construction; every sub-service is an H2 with
// its old slug as id; the redirect map (src/content/redirects/services.json) covers the five
// languages and points at pages and anchors that exist; the new site's earlier paths 301.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-services-pages.mjs
import { readFileSync } from 'node:fs';
import { start, checkPage, checkRedirect, check, failures, productionSitemap, SITE } from './info-seo-check.mjs';

const SECTIONS = ['buyer-services', 'seller-services', 'investor-services', 'construction-services'];
const lds = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).flat().filter(Boolean);

let map = { redirects: [] };
try { map = JSON.parse(readFileSync('src/content/redirects/services.json', 'utf8')); } catch { /* checked below */ }
const rows = map.redirects ?? [];

const stop = await start();
try {
  const pages = {};
  pages['/en/services'] = await checkPage('/en/services', { types: ['CollectionPage'] });
  // #375 (2026-11-27): seller and construction services open their form in a popup (a guest's page has no form)
  const POP = ['seller-services', 'construction-services'];
  for (const s of SECTIONS) pages[`/en/services/${s}`] = await checkPage(`/en/services/${s}`, { types: ['Service'], form: !POP.includes(s) });
  const fpm = '/en/services/buyer-services/full-property-management';
  pages[fpm] = await checkPage(fpm, { types: ['Service'], form: false });   // #375: the form in a popup
  // #340 (2026-11-23): construction projects merged into construction services — /en/construction is a 301

  // Hub → sections.
  const hub = pages['/en/services'] ?? '';
  for (const s of SECTIONS.map((x) => `/en/services/${x}`)) check(`/en/services links ${s}`, hub.includes(`href="${s}"`), 'card');

  // #106 desktop hub: every role panel, door and question is in the HTML (switching only shows / hides);
  // the panel photos are the service pages' watermarked heroes; phones keep George's page.
  const panels = [...hub.matchAll(/role="tabpanel"/g)].length;
  // 6 since the own brief P35 (2026-11-11): property management got its own panel; 5 since #340 (projects merged)
  check('/en/services hub: 5 role panels in the HTML', panels === 5, `${panels}`);
  check('/en/services hub: one H1', (hub.match(/<h1[\s>]/g) ?? []).length === 1, 'h1');
  for (const id of ['ums_4761/land-sea-view-halkidiki-2986326863', 'ums_4494/detached-house-aerial-halkidiki-2980294460']) {
    check(`/en/services hub photo ${id}`, hub.includes(`${id}_800w.jpg 800w`) && hub.includes(`${id}_1920w.jpg 1920w`), 'srcset');
  }
  check('/en/services hub: no prototype images', !hub.includes('/_blob/'), 'no /_blob/');
  for (const s of ['/en/book-an-online-appointment', '/en/add-your-property', '/en/services/buyer-services/full-property-management', '/en/faq']) {
    check(`/en/services hub links ${s}`, hub.includes(`href="${s}"`), 'door / faq');
  }
  const qs = (hub.match(/<details class="k-faq__q/g) ?? []).length;   // kit FAQ list (#186)
  // the brief's FAQ (P35) replaced George's 20+ questions here; his FAQ page stays linked
  check('/en/services hub: the FAQ questions of the brief in the HTML', qs >= 5, `${qs}`);
  check('/en/services hub: window form posts through the shared form', hub.includes('id="svcPop"') && hub.includes('data-in-pop'), 'dialog');
  // since the own brief (2026-11-11) the hub is the page on phones too (svc--m); George's phone layout would repeat it
  check('/en/services phones: the hub (svc--m), no second copy of the links', hub.includes('svc--m') && !hub.includes('info-grid w1-m'), 'svc--m');

  // Section pages: one H2 per sub-service with the old slug as id, a jump list, the offer catalogue.
  for (const s of SECTIONS) {
    const html = pages[`/en/services/${s}`] ?? '';
    // since the own briefs (batch 4, 2026-11-11) a section page is built of posts with ids and a side menu (data-pn-to)
    const brief = html.includes('class="pn');
    const ids = brief ? [...html.matchAll(/<article id="([^"]+)"/g)].map((m) => m[1]) : [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    const jump = brief ? [...html.matchAll(/data-pn-to="([^"]+)"/g)].map((m) => m[1]) : [...html.matchAll(/<a href="#([^"]+)"/g)].map((m) => m[1]);
    check(`/en/services/${s} sections with ids`, ids.length >= (brief ? 5 : 3), `${ids.length} ids`);
    check(`/en/services/${s} ${brief ? 'side menu' : 'jump list'} → every section`, jump.length > 0 && jump.every((j) => ids.includes(j)), `${jump.length} links`);
    const svc = lds(html).find((x) => x['@type'] === 'Service');
    const n = svc?.hasOfferCatalog?.itemListElement?.length ?? 0;
    check(`/en/services/${s} Service.hasOfferCatalog`, n >= 3, `${n} offers`);
  }
  check('construction services carry the Design & construction block (#340)', (pages['/en/services/construction-services'] ?? '').includes('class="cx'), 'block');
  check('buyer services link full property management', (pages['/en/services/buyer-services'] ?? '').includes(`href="${fpm}"`), 'link');
  check('no "more than 70" / "20 countries" claim', !/more than 70|more than 20 countries/i.test(pages['/en/services/seller-services'] ?? ''), 'seller services');

  // Redirect map: 5 languages, every target exists, every anchor is an H2 id on its page.
  const langs = new Set(rows.map((r) => r.lang));
  check('services.json: 5 languages', ['en', 'el', 'de', 'sr', 'bg'].every((l) => langs.has(l)), [...langs].join(','));
  check('services.json: all old service URLs', rows.length >= 240, `${rows.length} rows`);
  check('services.json: 301', map.status === 301, String(map.status));
  check('services.json: from ≠ to, unique', rows.every((r) => r.from !== r.to) && new Set(rows.map((r) => r.from)).size === rows.length, 'unique');
  const targets = {};
  for (const r of rows) {
    const [path, anchor] = r.to.split('#');
    if (!(path in targets)) {
      const res = await fetch(SITE + path);
      targets[path] = res.status === 200 ? await res.text() : '';
    }
    if (!targets[path]) { check(`map target ${path}`, false, 'not 200'); continue; }
    // a page rebuilt on its own brief merged the old sub-sections: an old #anchor lands at the top of the page (accepted)
    if (anchor && !targets[path].includes('class="pn') && !targets[path].includes(`id="${anchor}"`)) check(`map anchor ${r.to}`, false, `from ${r.from}`);
  }
  check('services.json: targets 200 + anchors exist', Object.values(targets).every(Boolean), `${Object.keys(targets).length} pages`);

  // The new site's earlier paths move to the old site's URLs.
  await checkRedirect('/en/services/buyers', '/en/services/buyer-services');
  await checkRedirect('/en/services/owners', '/en/services/seller-services');
  await checkRedirect('/en/services/investors', '/en/services/investor-services');
  await checkRedirect('/en/services/developers', '/en/services/construction-services');
  await checkRedirect('/en/projects', '/en/services/construction-services');
  await checkRedirect('/en/construction', '/en/services/construction-services');

  // English footer links the new URLs directly.
  const home = await (await fetch(SITE + '/en')).text();
  check('/en footer → section URLs', home.includes('href="/en/services/buyer-services"') && !home.includes('href="/en/services/buyers"'), 'footer');

  const sm = await productionSitemap();
  for (const p of ['/en/services', '/en/services/construction-services', fpm]) check(`sitemap ${p}`, sm.includes(`${p}</loc>`), 'loc');
  check('sitemap without /en/services/buyers', !/\/en\/services\/buyers<\/loc>/.test(sm), 'moved');
} finally {
  stop();
}
process.exit(failures() ? 1 : 0);
