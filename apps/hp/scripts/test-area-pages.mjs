// Area and category pages (/en/property-for-sale/{slug}, English only, George 20/10/2026):
// every page answers 200 with one H1, a self canonical, FAQ JSON-LD where it has questions,
// at most six property cards, no count of the catalogue, and never a village inside a card.
// A municipality without data shows the empty state; an unknown slug is 404.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-area-pages.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const N = 287;   // not a number the page texts use ("300 metres from the beach")
const SITE = 'http://127.0.0.1:4331';
const ORIGIN = 'https://hp.rewize.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: N, variety: true });
const villages = [...new Set(stub.items.map((p) => p.attributes.area).filter(Boolean))];
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: ORIGIN },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

const alone = (n) => new RegExp(`(?<![\\d.,\\u00a0\\u202f])${n}(?![\\d.,\\u00a0\\u202f])`);
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

const MUNIS = ['kassandra', 'sithonia', 'aristotelis', 'nea-propontida', 'polygyros'];
const CATS = ['villas', 'apartments', 'maisonettes', 'houses', 'land', 'plots', 'hotels'];

try {
  for (const slug of [...MUNIS, ...CATS]) {
    const path = `/en/property-for-sale/${slug}`;
    const r = await fetch(SITE + path);
    const html = await r.text();
    check(`${path} 200`, r.status === 200, `status ${r.status}`);
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    check(`${path} one H1`, h1s === 1, `${h1s} H1`);
    const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? '';
    check(`${path} canonical = itself`, canon.endsWith(path), canon);
    const hl = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
    check(`${path} hreflang English only`, hl.length > 0 && hl.every((l) => l === 'en' || l === 'x-default'), hl.join(','));
    const hasFaq = /class="faq/.test(html);
    check(`${path} FAQ JSON-LD when there are questions`, !hasFaq || /"@type":"FAQPage"/.test(html), hasFaq ? 'FAQPage' : 'no FAQ');
    const cards = html.match(/<article class="card[\s\S]*?<\/article>/g) ?? [];
    check(`${path} at most 6 cards`, cards.length <= 6, `${cards.length} cards`);
    const leak = villages.find((v) => cards.some((c) => c.includes(v)));
    check(`${path} no village inside a card`, !leak, leak ? `found ${leak}` : 'none');
    check(`${path} no count of the catalogue`, !alone(N).test(visible(html)) && !/"numberOfItems"/.test(html), 'text + JSON-LD');
  }
  const pol = await (await fetch(SITE + '/en/property-for-sale/polygyros')).text();
  check('polygyros (no stub data) shows the empty state', /data-empty/.test(pol), /data-empty/.test(pol) ? 'empty state' : 'no empty state');
  const kas = await (await fetch(SITE + '/en/property-for-sale/kassandra')).text();
  check('kassandra lists villages as general information', /Pefkochori/.test(visible(kas)), 'village chips');
  check('kassandra "Show properties" opens the filtered list', /href="\/en\/properties\?muni=/.test(kas), 'button');
  const bad = await fetch(SITE + '/en/property-for-sale/atlantis');
  check('unknown slug is 404', bad.status === 404, `status ${bad.status}`);
  const el = await fetch(SITE + '/property-for-sale/kassandra');
  check('no Greek copy yet (English only)', el.status === 404, `status ${el.status}`);
} finally {
  site.kill(); stub.close?.();
}
process.exit(fails ? 1 : 0);
