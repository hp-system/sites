// George's answers of 21/10/2026: unsupported claims removed (foreign offices, FIABCI, HRADF
// "administrator"), FAQ costs on the 2026 rules (3.09 %), privacy/terms without other sites,
// WhatsApp/Viber on the mobile +30 698 834 5888 (wa.me without "00"), CV by e-mail on careers,
// and enough text on the pages that were thin. Usage (from apps/hp, after `pnpm build`):
//   node scripts/test-morning-fixes.mjs
import { start, checkPage, check, failures, SITE } from './info-seo-check.mjs';

const visibleText = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const mainWords = (html) => {
  const m = html.match(/<main[\s\S]*?<\/main>/);
  const art = (m ? m[0] : html).match(/<article[\s\S]*?<\/article>/);
  return visibleText(art ? art[0] : (m ? m[0] : html)).split(' ').filter(Boolean).length;
};

const stop = await start();
try {
  const get = async (p) => { const r = await fetch(SITE + p); return r.status === 200 ? r.text() : ''; };
  const all = ['/en/about-us', '/en/about-us/our-story', '/en/services', '/en/services/investor-services',
    '/en/privacy-policy', '/en/terms-of-services', '/en/faq', '/en/contact', '/en/careers'];
  const pages = {};
  for (const p of all) pages[p] = await get(p);

  const claims = /Belgrade|Moscow|FIABCI|privileged administrator/i;
  for (const p of all) check(`${p} no foreign offices / FIABCI / HRADF-administrator claim`, pages[p] && !claims.test(visibleText(pages[p])), pages[p] ? 'clean' : 'page missing');
  check('FAQ uses the 2026 transfer tax 3.09 %', /3\.09\s?%/.test(pages['/en/faq']), '3.09 %');
  check('FAQ no 9–12 % estimate', !/9\s?% and 12\s?%/.test(pages['/en/faq']), 'old estimate gone');
  check('FAQ links the tax article', pages['/en/faq'].includes('/en/articles/business-news/taxes-foreigners-properties-greece'), 'link');
  for (const p of ['/en/privacy-policy', '/en/terms-of-services']) check(`${p} no .ru / GreekProperties.gr`, pages[p] && !/HalkidikiProperties\.ru|GreekProperties\.gr/i.test(pages[p]), 'only halkidikiproperties.com');

  const contact = pages['/en/contact'];
  check('contact WhatsApp on the mobile', contact.includes('https://wa.me/306988345888'), 'wa.me/306988345888');
  check('contact Viber on the mobile', /viber:\/\/chat\?number=%2B306988345888/.test(contact), 'viber link');
  check('contact shows the mobile', contact.includes('+30 698 834 5888'), 'mobile text');
  for (const p of ['/en/contact', '/en/services', '/en/property-for-sale/kassandra', '/en/articles/business-news/taxes-foreigners-properties-greece']) {
    const h = p in pages ? pages[p] : await get(p);
    check(`${p} no wa.me/00`, h && !/wa\.me\/00/.test(h), 'no 00 prefix');
  }
  check('careers asks for the CV by e-mail', pages['/en/careers'].includes('mailto:gtsigaras@halkidikiproperties.gr'), 'mailto');
  const job = await get('/en/careers/bulgarian-speaker');
  check('job page asks for the CV by e-mail', job.includes('mailto:gtsigaras@halkidikiproperties.gr'), 'mailto');

  // Pages that were thin now carry enough text (SEO checks run on each).
  const thin = ['/en/contact', '/en/careers', '/en/our-partners', '/en/services', '/en/construction', '/en/book-an-online-appointment',
    '/en/sell/advertise-your-property-worldwide', '/en/sell/real-time-visits', '/en/sell/the-future-of-real-estate'];
  for (const p of thin) {
    const h = await checkPage(p, { allowNoH2: false });
    const w = h ? mainWords(h) : 0;
    check(`${p} ≥ 250 words`, w >= 250, `${w} words`);
  }
} finally {
  await stop();
}
process.exit(failures() ? 1 : 0);
