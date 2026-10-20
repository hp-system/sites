// Sell + company pages (English, old site's URLs — George 20/10/2026): SEO checks on each page,
// forms where the old site had them, no count / "No.1" claims, and the 301s from the new site's
// earlier paths (/en/about, /en/partners) and the duplicate /en/sell/work-with-us-exclusively.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-sell-company-pages.mjs
import { start, checkPage, checkRedirect, check, failures, productionSitemap, SITE } from './info-seo-check.mjs';

const SELL = ['/en/sell/advertise-your-property-worldwide', '/en/sell/real-time-visits', '/en/sell/the-future-of-real-estate'];
const SELL_FORM = ['/en/sell/assign-to-halkidiki-real-estate', '/en/sell/make-purchase-easy', '/en/sell/secret-portfolio',
  '/en/sell/why-halkidiki-properties', '/en/work-with-us-exclusively', '/en/add-your-property'];
const ABOUT = ['/en/about-us', '/en/about-us/values', '/en/about-us/our-story', '/en/about-us/philosophy',
  '/en/about-us/company-social-responsibility'];
// Claims George asked to drop: visit / buyer counts and "number one".
const CLAIMS = [/No\.?\s?1\b/i, /number one/i, /#1\b/, /1\.000 daily/i, /daily visits/i, /monthly visits/i, /30\.000/, /25\.000/,
  /2000 customers/i, /1\.000\.000/, /more than 100 (portals|websites)/i, /100\+/];
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
const types = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).flat().filter(Boolean);

const stop = await start();
try {
  const pages = {};
  pages['/en/sell'] = await checkPage('/en/sell', { types: ['CollectionPage'], form: true });
  for (const p of SELL) pages[p] = await checkPage(p, { types: [p.includes('future') ? 'WebPage' : 'Service'] });
  for (const p of SELL_FORM) pages[p] = await checkPage(p, { types: [p.includes('why-') ? 'WebPage' : 'Service'], form: true });
  for (const p of ABOUT) pages[p] = await checkPage(p, { types: ['AboutPage'] });
  pages['/en/our-partners'] = await checkPage('/en/our-partners', { types: ['CollectionPage'] });
  pages['/en/careers'] = await checkPage('/en/careers', { types: ['CollectionPage'] });
  pages['/en/careers/bulgarian-speaker'] = await checkPage('/en/careers/bulgarian-speaker', { types: ['WebPage'], form: true });
  pages['/en/contact'] = await checkPage('/en/contact', { types: ['ContactPage'], form: true });
  pages['/en/book-an-online-appointment'] = await checkPage('/en/book-an-online-appointment', { types: ['Service'], form: true });

  for (const [p, html] of Object.entries(pages)) {
    if (!html) continue;
    const hit = CLAIMS.find((re) => re.test(visible(html)) || re.test((html.match(/<meta name="description" content="[^"]*"/) ?? [''])[0]));
    check(`${p} no count / No.1 claim`, !hit, hit ? String(hit) : 'clean');
    const lds = types(html);
    const bc = lds.find((x) => x['@type'] === 'BreadcrumbList');
    check(`${p} breadcrumb ends at the page`, bc?.itemListElement?.at(-1)?.item?.endsWith(p), bc?.itemListElement?.at(-1)?.item ?? '');
  }

  // Hubs link every page below them.
  const sell = pages['/en/sell'] ?? '';
  const subs = [...SELL, ...SELL_FORM.filter((p) => p.startsWith('/en/sell/')), '/en/work-with-us-exclusively'];
  check('/en/sell links its 8 pages', subs.every((s) => sell.includes(`href="${s}"`)), subs.filter((s) => !sell.includes(`href="${s}"`)).join(',') || 'all');
  const about = pages['/en/about-us'] ?? '';
  const kids = ['/en/about-us/values', '/en/about-us/our-story', '/en/about-us/philosophy', '/en/about-us/company-social-responsibility', '/en/our-partners', '/en/careers'];
  check('/en/about-us links its pages', kids.every((s) => about.includes(`href="${s}"`)), 'cards');
  check('/en/careers links the job', (pages['/en/careers'] ?? '').includes('href="/en/careers/bulgarian-speaker"'), 'job card');

  // Contact: the brand's address (Neo Rysio), phone and e-mail; ContactPage carries the organisation.
  const c = pages['/en/contact'] ?? '';
  check('/en/contact shows the Neo Rysio office', /Neo Rysio/.test(c) && !/Moudania/i.test(c), 'address');
  check('/en/contact phone + e-mail', /href="tel:\+30/.test(c) && /href="mailto:/.test(c), 'tel + mailto');
  const cp = types(c).find((x) => x['@type'] === 'ContactPage');
  check('/en/contact ContactPage → RealEstateAgent', cp?.mainEntity?.['@type'] === 'RealEstateAgent', cp?.mainEntity?.['@type'] ?? 'missing');

  // Partner logos carry the partner's name.
  const logos = [...(pages['/en/our-partners'] ?? '').matchAll(/<img[^>]+alt="([^"]+) logo/g)].length;
  check('/en/our-partners logos named', logos >= 15, `${logos} named logos`);

  // The new site's earlier paths move to the old site's URLs.
  await checkRedirect('/en/about', '/en/about-us');
  await checkRedirect('/en/partners', '/en/our-partners');
  await checkRedirect('/en/sell/work-with-us-exclusively', '/en/work-with-us-exclusively');

  // English menus link /en/about-us directly (no redirect hop).
  const home = await (await fetch(SITE + '/en')).text();
  check('/en menu links /en/about-us', home.includes('href="/en/about-us"') && !home.includes('href="/en/about"'), 'header/footer');

  // Sitemap (production only) lists the pages; the moved paths are gone.
  const sm = await productionSitemap();
  for (const p of ['/en/sell', '/en/about-us', '/en/contact', '/en/our-partners', '/en/careers/bulgarian-speaker']) {
    check(`sitemap ${p}`, sm.includes(`${p}</loc>`), 'loc');
  }
  check('sitemap without /en/about and /en/partners', !/\/en\/about<\/loc>/.test(sm) && !/\/en\/partners<\/loc>/.test(sm), 'moved');
} finally {
  stop();
}
process.exit(failures() ? 1 : 0);
