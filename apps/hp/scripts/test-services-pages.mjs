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
  for (const s of SECTIONS) pages[`/en/services/${s}`] = await checkPage(`/en/services/${s}`, { types: ['Service'], form: true });
  const fpm = '/en/services/buyer-services/full-property-management';
  pages[fpm] = await checkPage(fpm, { types: ['Service'], form: true });
  pages['/en/construction'] = await checkPage('/en/construction', { types: ['CollectionPage'], form: true });

  // Hub → sections and projects.
  const hub = pages['/en/services'] ?? '';
  for (const s of [...SECTIONS.map((x) => `/en/services/${x}`), '/en/construction']) check(`/en/services links ${s}`, hub.includes(`href="${s}"`), 'card');

  // Section pages: one H2 per sub-service with the old slug as id, a jump list, the offer catalogue.
  for (const s of SECTIONS) {
    const html = pages[`/en/services/${s}`] ?? '';
    const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    const jump = [...html.matchAll(/<a href="#([^"]+)"/g)].map((m) => m[1]);
    check(`/en/services/${s} sections with ids`, ids.length >= 3, `${ids.length} H2 ids`);
    check(`/en/services/${s} jump list → every section`, jump.length > 0 && jump.every((j) => ids.includes(j)), `${jump.length} links`);
    const svc = lds(html).find((x) => x['@type'] === 'Service');
    const n = svc?.hasOfferCatalog?.itemListElement?.length ?? 0;
    check(`/en/services/${s} Service.hasOfferCatalog`, n >= 3, `${n} offers`);
  }
  check('construction services link the projects', (pages['/en/services/construction-services'] ?? '').includes('href="/en/construction"'), 'link');
  check('buyer services link full property management', (pages['/en/services/buyer-services'] ?? '').includes(`href="${fpm}"`), 'link');
  check('/en/construction gallery', ((pages['/en/construction'] ?? '').match(/<figure>/g) ?? []).length >= 8, 'figures');
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
    if (anchor && !targets[path].includes(`id="${anchor}"`)) check(`map anchor ${r.to}`, false, `from ${r.from}`);
  }
  check('services.json: targets 200 + anchors exist', Object.values(targets).every(Boolean), `${Object.keys(targets).length} pages`);

  // The new site's earlier paths move to the old site's URLs.
  await checkRedirect('/en/services/buyers', '/en/services/buyer-services');
  await checkRedirect('/en/services/owners', '/en/services/seller-services');
  await checkRedirect('/en/services/investors', '/en/services/investor-services');
  await checkRedirect('/en/services/developers', '/en/services/construction-services');
  await checkRedirect('/en/projects', '/en/construction');

  // English footer links the new URLs directly.
  const home = await (await fetch(SITE + '/en')).text();
  check('/en footer → section URLs', home.includes('href="/en/services/buyer-services"') && !home.includes('href="/en/services/buyers"'), 'footer');

  const sm = await productionSitemap();
  for (const p of ['/en/services', '/en/services/construction-services', fpm, '/en/construction']) check(`sitemap ${p}`, sm.includes(`${p}</loc>`), 'loc');
  check('sitemap without /en/services/buyers', !/\/en\/services\/buyers<\/loc>/.test(sm), 'moved');
} finally {
  stop();
}
process.exit(failures() ? 1 : 0);
