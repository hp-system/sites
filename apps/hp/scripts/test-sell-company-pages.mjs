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
  // #105 desktop redesign, wave 1 (approved by George 2026-11-02): the Sell page only.
  check('/en/sell wave 1 layout', sell.includes('class="info w1"'), 'main.w1');
  const hero = sell.match(/<picture class="w1-top__img[\s\S]*?<\/picture>/)?.[0] ?? '';
  check('/en/sell desktop hero: watermarked 800w + 1920w', hero.includes('_800w.jpg 800w') && hero.includes('_1920w.jpg 1920w') && hero.includes('media="(min-width: 1024px)"'), hero ? 'picture' : 'missing');
  check('/en/sell desktop hero: phones load nothing', /<img src="data:image\/gif/.test(hero), 'placeholder img');
  const rail = sell.match(/<ul class="cards ir-rail"[\s\S]*?<\/ul>/)?.[0] ?? '';
  check('/en/sell all 8 cards in the row HTML', (rail.match(/<li/g) ?? []).length === 8, `${(rail.match(/<li/g) ?? []).length} cards`);
  check('/en/sell row dashes (3 pages)', (sell.match(/data-irail-dash="w1Cards"[\s\S]*?<\/div>/)?.[0].match(/<button/g) ?? []).length === 3, 'dashes');
  const rel = sell.match(/id="w1Rel"[\s\S]*?<\/section>/)?.[0] ?? '';
  check('/en/sell Related row: 5 cards with links', (rel.match(/class="pc"/g) ?? []).length === 5 && rel.includes('href="/en/assignment-order"'), 'related');
  // The area row needs listings with photos per municipality (checked on live data, #105); with the stub it may be absent.
  const area = rel.includes('id="w1Area"');
  check('/en/sell area row (when listed): municipality guides + H2', !area || (/>Property for sale in Halkidiki<\/h2>/.test(rel) && /href="\/en\/property-for-sale\/(kassandra|sithonia|aristotelis|nea-propontida|polygyros)"/.test(rel)), area ? 'about the area' : 'no area cards in the stub');
  check('/en/sell area photos watermarked', [...rel.matchAll(/<img [^>]*src="(https?:[^"]+)"/g)].every((m) => /_(400|800|1920)w\./.test(m[1])), 'marked');
  check('/en/sell dark form: wave 1, picker, consent', /class="iform iform--w1"/.test(sell) && /data-w1/.test(sell) && sell.includes('data-cc="GR"') && sell.includes('name="first"') && sell.includes('name="last"'), 'form');
  check('/en/sell H2 «Get to know how we sell.» + Related', sell.includes('Get to know how we sell.') && />Related<\/h2>/.test(sell), 'h2');
  check('/en/sell back to top', sell.includes('id="w1Top"'), 'button');
  check('/en/contact keeps the old layout', !(pages['/en/contact'] ?? '').includes('class="info w1"') && !(pages['/en/contact'] ?? '').includes('class="iform iform--w1"'), 'unchanged');

  const about = pages['/en/about-us'] ?? '';
  const kids = ['/en/about-us/values', '/en/about-us/our-story', '/en/about-us/philosophy', '/en/about-us/company-social-responsibility', '/en/our-partners', '/en/careers'];
  check('/en/about-us links its pages', kids.every((s) => about.includes(`href="${s}"`)), 'cards');
  // #107 desktop redesign, wave 1 (approved by George 2026-11-02): every block in the HTML, George's texts,
  // George's / watermarked pictures only, one H1; phones keep George's page (its classes stay).
  check('/en/about-us wave 1 company layout', about.includes('class="info w1 w1-co"') && about.includes('class="w1-d co"'), 'main.w1-co');
  check('/en/about-us one H1', (about.match(/<h1[\s>]/g) ?? []).length === 1, 'h1');
  check('/en/about-us values: 8 of George\'s, all in the HTML', (about.match(/class="co-sx/g) ?? []).length === 8 && about.includes('Human relationships mean everything to us.'), 'values');
  check('/en/about-us people + quote', about.includes('They are the people who make the companies and not the other way around.'), 'people');
  check('/en/about-us story: 5 periods, last open', (about.match(/class="co-acb"/g) ?? []).length === 5 && about.includes('The journey begins') && /id="coEraB4"[^>]*aria-expanded="true"|aria-expanded="true"[^>]*id="coEraB4"/.test(about), 'story');
  check('/en/about-us partner logos named', (about.match(/<img src="\/pages\/our-partners\/[^"]+" alt="[^"]+ logo/g) ?? []).length >= 15, 'logos');
  check('/en/about-us doors: careers + contact', /class="co-door[^"]*" href="\/en\/careers"/.test(about) && /class="co-door[^"]*" href="\/en\/contact"/.test(about), 'doors');
  check('/en/about-us H2s of the blocks', ["Our company&#39;s core values", '>Our people<', '>Our story<', '>Partners we work with<'].every((s) => about.includes(s)), 'h2');
  check('/en/about-us no prototype images', !about.includes('/_blob/'), 'no /_blob/');
  check('/en/about-us Villa Natalia photo watermarked', about.includes('/pages/construction/villa-natalia-7010-wm.jpg'), 'wm');
  check('/en/about-us phones: George\'s text and cards kept', about.includes('making our company the most reliable for investors') && about.includes('info-grid w1-m'), 'w1-m');
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
