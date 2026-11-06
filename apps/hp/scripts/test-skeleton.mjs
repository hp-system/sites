// Local skeleton (#157): it is visible ONLY with SKELETON=1 outside production, and then every
// registry page (spec pages in every language, P22+ in EN) opens at its real URL with its H1.
// Starts the BUILT site three times (on / off / production+on). Exit 1 on any FAIL.
// Usage (from apps/hp, after `pnpm build`): node scripts/test-skeleton.mjs
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start(port, env) {
  const p = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), EALIDA_API: 'http://127.0.0.1:9', PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, ...env },
  });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/robots.txt`); break; } catch { await sleep(250); } }
  return p;
}
const get = async (port, path) => {
  const r = await fetch(`http://127.0.0.1:${port}${encodeURI(path)}`, { redirect: 'manual' });
  return { status: r.status, html: await r.text() };
};
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const on = await start(4351, { SITE_ENV: 'preview', SKELETON: '1' });
const off = await start(4352, { SITE_ENV: 'preview', SKELETON: '' });
const prod = await start(4353, { SITE_ENV: 'production', SKELETON: '1' });
try {
  // Every registry page opens with its H1.
  const urls = [];
  for (const id of readdirSync('src/content/seo')) for (const f of readdirSync(`src/content/seo/${id}`)) {
    const p = JSON.parse(readFileSync(`src/content/seo/${id}/${f}`, 'utf8'));
    urls.push([`${p.id}/${p.lang}`, p.path, p.h1]);
  }
  for (const p of JSON.parse(readFileSync('src/data/page-registry.json', 'utf8')).pages) if (p.paths) urls.push([`${p.id}/en`, p.paths.en, p.name]);
  const bad = [];
  for (const [k, path, h1] of urls) {
    const { status, html } = await get(4351, path);
    const h = dec(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
    if (status !== 200 || !html.includes('SKELETON') || h !== h1) bad.push(`${k} ${status} ${path}`);
  }
  check(`on: all ${urls.length} registry URLs show their page`, bad.length === 0, bad.slice(0, 6).join(' · '));
  check('on: /skeleton is the map', (await get(4351, '/skeleton')).html.includes('All pages'));
  check('on: unknown path under /skeleton is 404', (await get(4351, '/skeleton/en/nowhere')).status === 404);
  check('on: every skeleton page is noindex', (await get(4351, '/en/properties/homes-for-sale')).html.includes('content="noindex, nofollow"'));

  // Off and production: nothing of the skeleton.
  for (const [port, name] of [[4352, 'off'], [4353, 'production + SKELETON=1']]) {
    check(`${name}: /skeleton is 404`, (await get(port, '/skeleton')).status === 404);
    check(`${name}: /skeleton/en/sell is 404`, (await get(port, '/skeleton/en/sell')).status === 404);
    const { html } = await get(port, '/en/sell');
    check(`${name}: /en/sell is the real page`, !html.includes('SKELETON'));
  }
} finally {
  on.kill(); off.kill(); prod.kill();
}
console.log(fails ? `\n${fails} FAIL` : '\nall OK');
process.exit(fails ? 1 : 0);
