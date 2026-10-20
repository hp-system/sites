// Cookie consent + measurement (Consent Mode v2, GTM). Starts the stub API and the BUILT site
// twice: as preview and as production. Checks that
//   · GTM never loads on the preview, nor on a non-production host with SITE_ENV=production,
//   · GTM loads on the production host, AFTER the consent defaults ("denied"),
//   · the only blocking script in <head> is the inline consent snippet (SEO / Core Web Vitals),
//   · the banner is a hidden dialog OUTSIDE <main>, and the footer has "Cookie settings",
//   · every analytics event name sent to GA4 has no ":", lead forms report after 200 only.
// Exit 1 on any FAIL. Usage (from apps/hp, after `pnpm build`): node scripts/test-consent.mjs
import { spawn } from 'node:child_process';
import vm from 'node:vm';
import { startStub } from './stub-api.mjs';

const PORT = 4371;
const SITE = `http://127.0.0.1:${PORT}`;
const PROD_HOST = 'www.halkidikiproperties.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 60, variety: true });
async function withSite(env, fn) {
  const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT), EALIDA_API: stub.base, SITE_ENV: env, PUBLIC_ORIGIN: 'https://hp.rewize.app' },
  });
  for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }
  try { await fn(); } finally { site.kill(); await sleep(300); }
}
const get = async (path, host) => (await fetch(SITE + path, { headers: host ? { 'x-forwarded-host': host } : {} })).text();
const head = (html) => html.slice(0, html.indexOf('</head>'));

// Scripts in <head> that block rendering: everything except JSON-LD, modules, async/defer
// and the one inline consent snippet.
function blockingHeadScripts(html) {
  return [...head(html).matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]).filter((attrs) =>
    !/type="application\/ld\+json"/.test(attrs) && !/type="module"/.test(attrs)
    && !/\basync\b/.test(attrs) && !/\bdefer\b/.test(attrs) && !/id="consent-default"/.test(attrs));
}

try {
  await withSite('preview', async () => {
    for (const p of ['/', '/en', '/en/property-for-sale/kassandra']) {
      const html = await get(p, PROD_HOST);
      check(`preview ${p}: no GTM`, !/googletagmanager|GTM-[A-Z0-9]+/.test(html), /googletagmanager/.test(html) ? 'GTM found' : 'none');
      check(`preview ${p}: consent defaults`, /id="consent-default"/.test(html) && /'consent','default'/.test(html), 'inline snippet');
    }
  });

  await withSite('production', async () => {
    const other = await get('/en', 'hp.rewize.app');
    check('production on hp.rewize.app: no GTM', !/googletagmanager/.test(other), /googletagmanager/.test(other) ? 'GTM found' : 'none');

    const html = await get('/en', PROD_HOST);
    const iDef = html.indexOf("'consent','default'");
    const iGtm = html.indexOf('googletagmanager.com/gtm.js');
    check('production host: GTM loads', iGtm > -1 && /GTM-TF5K9FH/.test(html), iGtm > -1 ? 'loader present' : 'missing');
    check('consent default before GTM', iDef > -1 && iDef < iGtm, `default at ${iDef}, gtm at ${iGtm}`);
    for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']) {
      check(`default ${k} denied`, new RegExp(`${k}:'denied'`).test(html), k);
    }
    check('GTM loader is async', /j\.async=true/.test(html), 'async script element');

    for (const p of ['/', '/en', '/en/property-for-sale/kassandra', '/en/properties']) {
      const page = await get(p, PROD_HOST);
      const blocking = blockingHeadScripts(page);
      check(`${p}: no render-blocking script in <head>`, blocking.length === 0, blocking.length ? blocking.join(' | ') : 'only the consent snippet');
      const iBanner = page.indexOf('id="cc"');
      const iMainEnd = page.lastIndexOf('</main>');
      check(`${p}: banner is a hidden dialog`, /<div id="cc"[^>]*role="dialog"[^>]*hidden/.test(page), 'role=dialog, hidden');
      check(`${p}: banner outside <main>`, iBanner > -1 && (iMainEnd === -1 || iBanner > iMainEnd), `banner at ${iBanner}, </main> at ${iMainEnd}`);
      check(`${p}: footer "Cookie settings"`, /data-cookie-settings/.test(page), 'link present');
    }

    // Event names: run the tracking snippet in a sandbox and map every known name.
    const snippet = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('__track')) ?? '';
    const known = JSON.parse(/var KNOWN = (\[[^\]]*\])/.exec(snippet)?.[1] ?? '[]');
    const win = { dataLayer: [] };
    vm.runInNewContext(snippet, { window: win, document: { addEventListener() {} }, location: { pathname: '/', hostname: 'x' }, console });
    const bad = known.map((n) => win.__evName(n)).filter((n) => n.includes(':'));
    check('GA4 event names without ":"', known.length > 10 && bad.length === 0, bad.length ? bad.join(', ') : `${known.length} names mapped`);
    check('call → click_to_call', win.__evName('call:header') === 'click_to_call', win.__evName('call:header'));
    check('lead form → property_inquiry', win.__evName('lead:form_submit') === 'property_inquiry', win.__evName('lead:form_submit'));
    win.__track('call:footer');
    const last = win.dataLayer[win.dataLayer.length - 1] ?? {};
    check('event carries link_location', last.event === 'click_to_call' && last.link_location === 'footer', JSON.stringify(last));

    // Lead forms report after the server answered 200, not on submit.
    const list = await get('/en/properties', PROD_HOST);
    const href = /href="(\/en\/property\/[^"]+)"/.exec(list)?.[1];
    const prop = href ? await get(href, PROD_HOST) : '';
    check('inquiry form deferred', /id="qf"[^>]*data-ev-defer/.test(prop), href ?? 'no property page');
    check('viewing form deferred', /id="tf"[^>]*data-ev="lead:tour_submit"[^>]*data-ev-defer/.test(prop), 'tf');
  });
} finally {
  stub.close?.();
}
process.exit(fails ? 1 : 0);
