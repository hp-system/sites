// No public property counts (George 17/10): the catalogue size and the per-municipality
// numbers must not appear in titles, meta descriptions, JSON-LD, visible text, the mobile
// menu, the filter button or /api/count. Starts the stub API (127.0.0.1:4339, 300 properties)
// and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-no-counts.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const N = 300;
const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: N, variety: true });
const muniCounts = Object.values(stub.items.reduce((acc, p) => {
  const m = p.attributes.municipality; if (m) acc[m] = (acc[m] ?? 0) + 1; return acc;
}, {}));
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

// A number standing alone — not part of a price (300.000), an id (10300) or a decimal.
const alone = (n) => new RegExp(`(?<![\\d.,\\u00a0\\u202f])${n}(?![\\d.,\\u00a0\\u202f])`);
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const head = (html) => [
  ...(html.match(/<title>[^<]*<\/title>/g) ?? []),
  ...[...html.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:description|og:title|twitter:description|twitter:title)"[^>]*>/g)].map((m) => m[0]),
].join(' ');

try {
  for (const path of ['/', '/en', '/bg', '/sr', '/en/properties', '/en/property/10011']) {
    const html = await (await fetch(SITE + path)).text();
    check(`${path} title/meta without the catalogue size`, !alone(N).test(head(html)), head(html).slice(0, 160));
    check(`${path} no numberOfItems = catalogue`, !new RegExp(`"numberOfItems":\\s*${N}\\b`).test(html), 'JSON-LD');
    check(`${path} visible text without the catalogue size`, !alone(N).test(visible(html)), 'body text');
    const menu = (html.match(/<nav class="mm__body"[\s\S]*?<\/nav>/) ?? [''])[0];
    const hit = muniCounts.find((c) => alone(c).test(visible(menu)));
    check(`${path} mobile menu without per-municipality counts`, menu === '' || hit === undefined, hit ? `found ${hit}` : 'clean');
  }
  const c = await (await fetch(SITE + '/api/count')).json();
  check('/api/count publishes no number', !('total' in c) && typeof c.any === 'boolean', JSON.stringify(c));
  const none = await (await fetch(SITE + '/api/count?price_min=999000000')).json();
  check('/api/count says when nothing matches', none.any === false, JSON.stringify(none));
} finally {
  site.kill(); stub.server.close();
}
process.exit(fails ? 1 : 0);
