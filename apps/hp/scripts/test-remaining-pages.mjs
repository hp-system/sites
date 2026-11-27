// Acceptance for the remaining live-site pages (George 21/10/2026): pre-published, Greece,
// prices and the members pages under the Guest / Member / Exclusive model. Full SEO checks
// (shared info-seo-check), no counts, live price tables, CTAs, sitemap.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-remaining-pages.mjs
import { readFileSync } from 'node:fs';
import { start, check, failures, checkPage, productionSitemap } from './info-seo-check.mjs';
import { movedTo } from './retired.mjs';

const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
// The phone always comes from brand.contact.phoneText (George 21/10/2026) — never in the page texts.
for (const f of ['pre-published-properties', 'property-for-sale-in-greece', 'halkidiki-property-prices', 'why-register',
  'why-register/buyer', 'why-register/owner', 'vip', 'real-estate-agent']) {
  const src = readFileSync(new URL(`../src/content/pages/en/${f}.md`, import.meta.url), 'utf8');
  check(`${f}: no hard-coded phone`, !/2311|\+30/.test(src.replace(/\s/g, '')), 'phone from brand config');
}
const stop = await start();
try {
  // #375 (2026-11-27): the form opens in a popup from the one button; a guest's page carries no form
  const pre = await checkPage('/en/pre-published-properties', { form: false, types: ['CollectionPage'] });
  if (pre) {
    check('pre-published: sign-in CTA coming back to the form', pre.includes('href="/en/login?next=%2Fen%2Fpre-published-properties%3Fform%3D1"'), 'CTA to /en/login → ?form=1');
    check('pre-published: no «none right now» note (Sergei 2026-11-27)', !/No pre-published properties right now/.test(pre) && !/Pre-published properties are shown to registered members/.test(pre), 'no empty note');
  }

  // D2 (#152): the Greece page moved to the spec URL; the old one answers 301.
  const grMoved = movedTo('/en/property-for-sale-in-greece');
  if (grMoved) {
    const m = await fetch('http://127.0.0.1:4331/en/property-for-sale-in-greece', { redirect: 'manual' });
    check(`Greece: 301 → ${grMoved} (D2)`, m.status === 301 && m.headers.get('location') === grMoved, `${m.status} ${m.headers.get('location')}`);
  }
  const gr = grMoved ? null : await checkPage('/en/property-for-sale-in-greece', { types: ['WebPage', 'FAQPage'] });
  if (gr) {
    check('Greece: no Nea Moudania office', !/office in Nea Moudania/i.test(visible(gr)), 'office = brand address');
    check('Greece: "from €" guide rendered', /class="pw-guide"/.test(gr) && /from €[\d,]+/.test(visible(gr)), 'price guide');
    check('Greece: links to area pages', /\/en\/property-for-sale\/kassandra/.test(gr), 'area links');
    check('Greece: links to the tax article', /taxes-foreigners-properties-greece/.test(gr), 'calculator link');
  }

  const pr = await checkPage('/en/halkidiki-property-prices', { types: ['Dataset'] });
  if (pr) {
    const v = visible(pr);
    check('prices: homes table renders from data', /Homes: median price per m²/.test(v) && /<table[\s>][\s\S]*€[\d,]+/.test(pr), 'table with € values');
    check('prices: no "at least N listings"', !/at least \d+ listings?/i.test(v), 'no minimum-sample number');
    check('prices: note "updated continuously"', /updated continuously/.test(v), 'method note');
  }

  for (const p of ['/en/why-register', '/en/why-register/buyer', '/en/why-register/owner', '/en/vip'].filter((x) => !movedTo(x))) {   // /en/vip → /en/exclusive (batch 1)
    const h = await checkPage(p, { form: p === '/en/vip', types: p === '/en/why-register/buyer' ? ['FAQPage'] : [] });
    if (!h) continue;
    const v = visible(h);
    check(`${p}: no Premium / Business+ tiers`, !/Premium|Business\+/.test(v), 'old tiers dropped');
    check(`${p}: sign-in / register CTA`, /href="\/en\/login"/.test(h), 'CTA to /en/login');
    if (p !== '/en/why-register/owner') check(`${p}: mentions Member and Exclusive`, /member/i.test(v) && /Exclusive/.test(v), 'access model');
  }
  const vipR = await fetch('http://127.0.0.1:4331/en/vip', { redirect: 'manual' });
  check('/en/vip → 301 to Exclusive (batch 1)', vipR.status === 301 && vipR.headers.get('location') === '/en/exclusive', `${vipR.status} ${vipR.headers.get('location')}`);

  const ag = await checkPage('/en/real-estate-agent', { form: true });
  if (ag) {
    const v = visible(ag);
    check('agent: 1 % of the brokerage fee kept', /1 % of the brokerage fee/.test(v), 'offer text');
    check('agent: no number claims', !/30[.,]000|1[.,]100/.test(v), 'claims removed');
  }

  const sm = await productionSitemap();
  for (const p of ['/en/pre-published-properties', '/en/property-for-sale-in-greece', '/en/halkidiki-property-prices',
    '/en/why-register', '/en/why-register/buyer', '/en/why-register/owner', '/en/vip', '/en/real-estate-agent']) {
    if (movedTo(p)) check(`sitemap leaves out the moved ${p}`, !sm.includes(`${p}</loc>`), p);
    else check(`sitemap has ${p}`, sm.includes(`${p}</loc>`), p);
  }
} finally {
  stop();
}
console.log(failures() ? `\n${failures()} FAIL` : '\nall OK');
process.exit(failures() ? 1 : 0);
