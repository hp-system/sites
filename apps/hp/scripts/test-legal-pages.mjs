// Legal pages (English, old site's URLs — George 20/10/2026): SEO checks on each page,
// FAQPage JSON-LD on /en/faq, Terms/Privacy linked from the login page.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-legal-pages.mjs
import { start, checkPage, check, failures, SITE } from './info-seo-check.mjs';

const stop = await start();
try {
  for (const p of ['/en/terms-of-services', '/en/privacy-policy', '/en/collaboration-order', '/en/indication-order', '/en/assignment-order']) {
    await checkPage(p, { types: ['WebPage'] });
  }
  const faq = await checkPage('/en/faq', { types: ['FAQPage'] });
  if (faq) check('/en/faq has its questions', (faq.match(/<details/g) ?? []).length >= 10, `${(faq.match(/<details/g) ?? []).length} questions`);
  const login = await (await fetch(SITE + '/en/login')).text();
  check('login links Terms + Privacy', /href="\/en\/terms-of-services"/.test(login) && /href="\/en\/privacy-policy"/.test(login), 'links');
} finally {
  stop();
}
process.exit(failures() ? 1 : 0);
