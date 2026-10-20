// Shared SEO checks for the info pages (legal, sell, company, services) — George 20/10/2026:
// "full seo optimized". Used by test-legal-pages / test-sell-company-pages / test-services-pages.
// Starts the stub API (127.0.0.1:4339) and the BUILT site (127.0.0.1:4331).
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

export const SITE = 'http://127.0.0.1:4331';
const N = 287;
let fails = 0;
export const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
export const failures = () => fails;

export async function start() {
  const stub = await startStub({ port: 4339, n: N, variety: true });
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  return () => { site.kill(); stub.close?.(); };
}

const alone = (n) => new RegExp(`(?<![\\d.,\\u00a0\\u202f])${n}(?![\\d.,\\u00a0\\u202f])`);
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const attr = (html, re) => ((html.match(re) ?? [])[1] ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

/** All SEO checks for one page. `opts.form` = a contact form is expected; `opts.types` = JSON-LD types expected. */
export async function checkPage(path, opts = {}) {
  const r = await fetch(SITE + path, { redirect: 'manual' });
  const html = await r.text();
  check(`${path} 200`, r.status === 200, `status ${r.status}`);
  if (r.status !== 200) return;
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  check(`${path} one H1`, h1s === 1, `${h1s} H1`);
  const title = attr(html, /<title>([^<]*)<\/title>/);
  check(`${path} title ≤ 60`, title.length > 10 && title.length <= 60, `${title.length}: ${title}`);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  check(`${path} description 140–160`, desc.length >= 140 && desc.length <= 160, `${desc.length}`);
  const canon = attr(html, /<link rel="canonical" href="([^"]+)"/);
  check(`${path} canonical = itself`, decodeURI(canon).endsWith(path), canon);
  const langs = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
  check(`${path} hreflang en + x-default only`, langs.includes('en') && langs.includes('x-default') && langs.length === 2, langs.join(','));
  const og = attr(html, /<meta property="og:image" content="([^"]+)"/);
  check(`${path} og:image`, /^https?:\/\//.test(og), og || 'missing');
  check(`${path} twitter:image`, /<meta name="twitter:image" content="https?:/.test(html), 'twitter:image');
  const lds = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
  const types = lds.flat().filter(Boolean).map((x) => x['@type']);
  check(`${path} JSON-LD BreadcrumbList`, types.includes('BreadcrumbList'), types.join(','));
  for (const t of opts.types ?? []) check(`${path} JSON-LD ${t}`, types.includes(t), types.join(','));
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((i) => !/\balt="[^"]+"/.test(i));
  check(`${path} every img has alt`, noAlt.length === 0, `${imgs.length} img, ${noAlt.length} without alt`);
  const noSize = imgs.filter((i) => !(/\bwidth="\d+"/.test(i) && /\bheight="\d+"/.test(i)));
  check(`${path} every img has width/height`, noSize.length === 0, `${noSize.length} without size`);
  check(`${path} no catalogue count`, !alone(N).test(visible(html)), 'no standalone total');
  check(`${path} h2 present`, /<h2[\s>]/.test(html) || opts.allowNoH2, 'H2 hierarchy');
  if (opts.form) check(`${path} contact form`, /class="iform__f"/.test(html) && /terms-of-services/.test(html) && /privacy-policy/.test(html), 'form + consent links');
  return html;
}

export async function checkRedirect(from, to) {
  const r = await fetch(SITE + from, { redirect: 'manual' });
  const loc = r.headers.get('location') ?? '';
  check(`${from} → 301 ${to}`, r.status === 301 && loc.endsWith(to), `${r.status} ${loc}`);
}

/** The sitemap exists only in production: a second, production instance on :4332 (after start()). */
export async function productionSitemap() {
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4332', EALIDA_API: 'http://127.0.0.1:4339/api', SITE_ENV: 'production', PUBLIC_ORIGIN: 'https://www.halkidikiproperties.com' },
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:4332/robots.txt'); break; } catch { await sleep(250); } }
    return await (await fetch('http://127.0.0.1:4332/sitemap.xml')).text();
  } finally {
    site.kill();
  }
}
