// Videos back where the live site had them (#62, George 21/10/2026). Each page embeds its
// YouTube video once, through youtube-nocookie, lazily, with a title; the widget refuses bad ids.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-videos.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';
import { videoHtml } from '../src/lib/remark-widgets.mjs';
import { movedTo } from './retired.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

// Live page (www.halkidikiproperties.com, checked 21/10/2026) → its YouTube id.
const PAGES = {
  '/en/about-us/our-story': 'MhOQuMDk5i8',
  '/en/about-us/philosophy': 'BnF39QUXjCE',
  '/en/about-us/values': 'aBn0M24Lm4E',
  '/en/why-register/owner': 'FNnOjtkpciA',
  '/en/why-register/buyer': 'lcJbuRY1zDY',
  '/en/our-partners': 'Z6n9wPcgEm4',
  '/en/vip': 'VHyRa_g-M3A',
  '/en/articles/all-news/home-decorating-tips-to-impress-buyers': '4_BhuM0PImg',
};

const stub = await startStub({ port: 4339, n: 20 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

try {
  for (const [p, id] of Object.entries(PAGES).filter(([p]) => !movedTo(p))) {   // D-20261109-SS-2: folded articles are no longer pages
    const r = await fetch(SITE + p);
    const h = await r.text();
    const n = h.split(`youtube-nocookie.com/embed/${id}`).length - 1;
    const ok = r.status === 200 && n === 1 && /<iframe(?=[^>]*loading="lazy")(?=[^>]*title="[^"]+")[^>]*>/.test(h) && !h.includes('widget: video');
    check(`${p} embeds ${id}`, ok, `status ${r.status}, ${n} embed(s)`);
  }
  check('widget refuses a bad id', videoHtml('javascript:alert(1)') === null && videoHtml('') === null, 'null');
  check('widget escapes the title', videoHtml('MhOQuMDk5i8 | a "b" <c>')?.includes('title="a &quot;b&quot; &lt;c&gt;"'), 'escaped');
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
