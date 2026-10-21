// Property map and Exclusive content (#53, George 21/10/2026: "circle around the village").
// Guest: no coordinates, no map, no exclusive data in the HTML. Member: circle around the CRM's
// moved point, no address/video/documents/history. Exclusive: exact point + those four.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-property-map.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 60, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
const get = async (tok) => (await fetch(SITE + '/en/property/10008', { headers: tok ? { cookie: `member_token=${tok}` } : {} })).text();

const SECRET = [/40\.12/, /23\.65/, /Odos Stub/, /stubVID01/, /tour\.example\.com/, /10008-topographic/, /480,000|480\.000/];
try {
  const g = await get('');
  const leak = SECRET.filter((re) => re.test(g));
  check('guest: no point, address, video, documents or history in the HTML', leak.length === 0, leak.join(' ') || 'clean');
  check('guest: no map element, lock shown', !g.includes('id="pmap"') && g.includes('maplock'), 'lock');

  const m = await get('stub-token');
  check('member: map with a circle', /id="pmap"[^>]*data-r="2000"/.test(m) && !/data-exact="1"/.test(m), 'circle');
  check('member: moved point rounded to 3 decimals', /data-lat="40\.131"/.test(m) && /data-lng="23\.649"/.test(m), (m.match(/data-lat="[^"]*" data-lng="[^"]*"/) || ['none'])[0]);
  check('member: never the exact point', !/40\.1234|23\.6543/.test(m), 'absent');
  check('member: no exclusive section', !m.includes('id="xcl-h"') && !/Odos Stub|stubVID01|topographic|480,000/.test(m), 'absent');
  check('member: caption says inside the circle', m.includes('The property is inside the circle.'), 'caption');

  const x = await get('stub-exclusive');
  check('exclusive: exact point with pin', /data-lat="40\.123456"/.test(x) && /data-exact="1"/.test(x), 'exact');
  check('exclusive: open-in-maps link', /google\.com\/maps\/search\/\?api=1&(?:amp;)?query=40\.123456,23\.654321/.test(x), 'link');
  check('exclusive: address', x.includes('Odos Stub 7, 63077'), 'address');
  check('exclusive: video embedded (no-cookie)', x.includes('https://www.youtube-nocookie.com/embed/stubVID01') && x.includes('https://tour.example.com/10008'), 'video + tour');
  check('exclusive: documents', x.includes('Topographic plan'), 'docs');
  check('exclusive: price history newest first', /2026-03-15[\s\S]*450,000[\s\S]*2025-06-01[\s\S]*480,000/.test(x), 'history');
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
