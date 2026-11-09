// AI Act labels (#49, George 21/10/2026): every article names a human reviewer with editorial
// responsibility (visible + schema.org editor); the privacy policy explains the use of AI.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-ai-labels.mjs
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { startStub } from './stub-api.mjs';
import { movedTo } from './retired.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const urls = walk('src/content/articles/en').filter((f) => f.endsWith('.md'))
  .map((f) => (readFileSync(f, 'utf8').match(/^clean_url:\s*['"]?([^'"\n]+)/m) || [])[1]).filter(Boolean)
  .filter((u) => !movedTo(u));   // D-20261109-SS-2: articles folded into the guides are no longer pages

const stub = await startStub({ port: 4339, n: 30 });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

try {
  let bad = [];
  for (const u of urls) {
    const html = await (await fetch(SITE + u)).text();
    const visible = /Reviewed by <b[^>]*>George Tsigaras<\/b>/.test(html);
    const ld = /"editor":\{"@type":"Person","name":"George Tsigaras"/.test(html);
    if (!visible || !ld) bad.push(`${u} (${visible ? '' : 'no byline '}${ld ? '' : 'no schema'})`);
  }
  check(`all ${urls.length} articles name the reviewer (visible + schema editor)`, urls.length > 0 && bad.length === 0, bad.slice(0, 3).join(', ') || 'all');
  const priv = await (await fetch(SITE + '/en/privacy-policy')).text();
  check('privacy policy has the AI section', /Use of artificial intelligence \(AI\)/.test(priv) && /processors/.test(priv), 'section 4.1');
} finally {
  site.kill(); stub.server?.close?.();
}
console.log(fails ? `${fails} FAIL` : 'ALL OK');
process.exit(fails ? 1 : 0);
