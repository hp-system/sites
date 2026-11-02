// The site's forms and links send long parameter names (category, subcategory, municipality,
// sea_access, bedrooms). Each must filter the listing exactly like its short name, and must
// actually narrow the result. Starts the stub API (127.0.0.1:4339) and the BUILT site
// (127.0.0.1:4331). Exit 1 on any FAIL. Usage (from apps/hp, after `pnpm build`):
//   node scripts/test-filter-params.mjs
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const SITE = 'http://127.0.0.1:4331';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };

const stub = await startStub({ port: 4339, n: 300, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '4331', EALIDA_API: stub.base, SITE_ENV: 'preview', PUBLIC_ORIGIN: 'https://hp.rewize.app' },
});
for (let i = 0; i < 40; i++) { try { await fetch(SITE + '/robots.txt'); break; } catch { await sleep(250); } }

// The ordered list of property links on one results page (48 per page).
const refs = async (qs) => {
  const html = await (await fetch(`${SITE}/en/properties?per=48&${qs}`)).text();
  return [...html.matchAll(/href="[^"]*\/en\/property\/([^"/?#]+)"/g)].map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i).join(',');
};

try {
  const all = await refs('');
  const pairs = [
    ['bedrooms=4', 'beds=4'],
    ['sea_access=front', 'sea=front'],
    ['subcategory=maisonette', 'type=maisonette'],
    ['municipality=' + encodeURIComponent('Κασσάνδρα'), 'muni=' + encodeURIComponent('Κασσάνδρα')],
  ];
  for (const [long, short] of pairs) {
    const a = await refs(long), b = await refs(short);
    check(`${long} = ${short}`, a === b, a === b ? 'same results' : 'results differ');
    check(`${long} narrows the list`, a !== all, a !== all ? 'filtered' : 'returned the whole catalogue');
  }
  const land = await refs('category=land');
  check('category=land narrows the list', land !== all, land !== all ? 'filtered' : 'returned the whole catalogue');
  const junk = await refs('subcategory=castle&bedrooms=abc');
  check('unknown values are ignored', junk === all, junk === all ? 'whole catalogue' : 'filtered on junk');
  // Multi-select of the desktop filter row (Sergei 02/11): a repeated parameter = any of the values.
  const K = 'muni=' + encodeURIComponent('Κασσάνδρα'), S = 'muni=' + encodeURIComponent('Σιθωνία');
  const ks = await refs(`${K}&${S}`), k = await refs(K), s1 = await refs(S);
  check('muni=A&muni=B is neither A nor B alone', ks !== k && ks !== s1 && ks !== all, 'union');
  const swap = await refs(`${S}&${K}`);
  check('value order does not matter', swap === ks, swap === ks ? 'same results' : 'results differ');
  const b25 = await refs('bed=2&bed=5'), b2 = await refs('bed=2');
  check('bed=2&bed=5 differs from bed=2 and from all', b25 !== b2 && b25 !== all && b2 !== all, 'exact bedrooms');
  const html = await (await fetch(`${SITE}/en/properties?${K}&${S}`)).text();
  check('multi-value URL stays out of the index', /<meta name="robots" content="noindex/.test(html), 'noindex');
  // A facet page keeps its own filter (Object.assign used to copy `undefined` over it).
  const facetHtml = await (await fetch(`${SITE}/en/properties/kassandra?per=48`)).text();
  const facet = [...facetHtml.matchAll(/href="[^"]*\/en\/property\/([^"/?#]+)"/g)].map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i).join(',');
  check('facet page /kassandra = ?muni=Κασσάνδρα', facet === k, facet === k ? 'same results' : 'results differ');
} finally {
  site.kill(); stub.close?.();
}
process.exit(fails ? 1 : 0);
