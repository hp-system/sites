// ═══════════════════════════════════════════════════════════════════════════
// ΕΠΑΛΗΘΕΥΣΗ robots.txt + sitemap.xml + του φύλακα noindex.
//
//   node scripts/verify-seo.mjs [http://localhost:4331]
//
// Ο παραγωγικός host προσομοιώνεται με `x-forwarded-host` — ακριβώς όπως θα τον
// δει η υπηρεσία πίσω από το Cloudflare/nginx. Έτσι ελέγχουμε ΚΑΙ τις δύο
// συμπεριφορές (προεπισκόπηση + παραγωγή) χωρίς να πειραχτεί DNS.
//
// 🔑 Ο έλεγχος που έχει σημασία: **κάθε <loc> του sitemap γυρίζει 200**. Ένα
//    sitemap που δηλώνει 404 δεν είναι ελλιπές, είναι ενεργή ζημιά — και είναι
//    ακριβώς το ρίσκο εδώ, όπου οι εσωτερικοί σύνδεσμοι δεν έχουν χτιστεί ακόμα.
// ═══════════════════════════════════════════════════════════════════════════
// ── Since 2026-10-13 (B-09, traps T-K15; SITE_ENV E-01) ─────────────────────────────────────
// Two explicit modes, because the preview no longer becomes "production" by a header:
//   node scripts/verify-seo.mjs <base> --mode=preview      (default) a SITE_ENV=preview server:
//        robots `Allow: /` + `Disallow: /api/` (NOT `Disallow: /` — the noindex must be readable),
//        no Sitemap line, sitemap 404, X-Robots-Tag on every response, and the same answers when
//        the request claims the production host (that is what SITE_ENV=preview guarantees).
//   node scripts/verify-seo.mjs <base> --mode=production   a SITE_ENV=production server (a local
//        run, later the real domain): no X-Robots-Tag, robots with sitemap and bot blocks, and
//        EVERY <loc> of the sitemap answers 200 with canonical = loc, index, no placeholder.
//        `--max=N` checks only the first N URLs (a quick run; the release run checks all).
// The production host header is sent in production mode too, so a host-based server
// (SITE_ENV unset) is checked the same way.
const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4331').replace(/\/$/, '');
const MODE = args.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'preview';
const MAX = Number(args.find((a) => a.startsWith('--max='))?.split('=')[1] ?? Infinity);
const PROD = 'www.halkidikiproperties.com';
const ORIGIN = `https://${PROD}`;
if (!['preview', 'production'].includes(MODE)) {
  console.error(`unknown --mode=${MODE}`);
  process.exit(2);
}

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  fails++;
  console.log(`  ✗ ${m}`);
};
const check = (cond, m) => (cond ? ok(m) : bad(m));

/** Το `as` κάνει το αίτημα να μοιάζει ότι ήρθε στο παραγωγικό domain. */
const get = (path, as) =>
  fetch(BASE + path, { headers: as ? { 'x-forwarded-host': as } : {}, redirect: 'manual' });
const NOINDEX = /noindex/i;

if (MODE === 'preview') {
  // ── 1. Προεπισκόπηση: τίποτα δεν πρέπει να είναι ευρετηριάσιμο ──────────────
  const runs = [['as the preview host', undefined], [`claiming the production host (${PROD}) — SITE_ENV=preview`, PROD]];
  for (const [label, as] of runs) {
    console.log(`\n▸ Preview, ${label}`);
    const r = await get('/robots.txt', as);
    const body = await r.text();
    check(r.status === 200, `robots.txt → ${r.status}`);
    check(/^Allow:\s*\/\s*$/m.test(body) && /^Disallow:\s*\/api\/\s*$/m.test(body),
      'robots.txt: Allow: / + Disallow: /api/ (crawlers must be able to read the noindex)');
    check(!/^Disallow:\s*\/\s*$/m.test(body), 'robots.txt does not block the whole site');
    check(!body.includes('Sitemap:'), 'no Sitemap line');
    check(NOINDEX.test(r.headers.get('x-robots-tag') ?? ''), `robots.txt X-Robots-Tag: ${r.headers.get('x-robots-tag')}`);

    const s = await get('/sitemap.xml', as);
    check(s.status === 404, `sitemap.xml → ${s.status} (expected 404)`);

    const h = await get('/', as);
    const html = await h.text();
    check(NOINDEX.test(h.headers.get('x-robots-tag') ?? ''), `home X-Robots-Tag: ${h.headers.get('x-robots-tag')}`);
    check(/name="robots" content="noindex, nofollow"/.test(html), 'home meta robots noindex, nofollow');

    const nf = await get('/zz-verify-seo-not-found', as);
    check(nf.status === 404 && NOINDEX.test(nf.headers.get('x-robots-tag') ?? ''),
      `404 page → ${nf.status}, X-Robots-Tag ${nf.headers.get('x-robots-tag')}`);
    const api = await get('/api/count', as);
    check(NOINDEX.test(api.headers.get('x-robots-tag') ?? ''), `/api/count X-Robots-Tag: ${api.headers.get('x-robots-tag')}`);
  }
} else {
  // ── 2. Παραγωγή ────────────────────────────────────────────────────────────
  console.log('\n▸ Production (x-forwarded-host: ' + PROD + ')');
  const r = await get('/robots.txt', PROD);
  const robots = await r.text();
  check(!r.headers.get('x-robots-tag'), `robots.txt without X-Robots-Tag (${r.headers.get('x-robots-tag') ?? 'none'})`);
  check(/^User-agent: \*\nAllow: \//m.test(robots), 'robots.txt επιτρέπει τα πάντα');
  check(robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`), 'δηλώνει το sitemap');
  check(robots.includes('Disallow: /api/'), 'κλείνει τα /api/');
  for (const b of ['MJ12bot', 'SemrushBot', 'PetalBot', 'Baiduspider', 'Mediatoolkitbot'])
    check(new RegExp(`User-agent: ${b}\\nDisallow: /`).test(robots), `αποκλείει ${b}`);
  for (const g of ['Googlebot', 'AhrefsBot', 'Bingbot'])
    check(!new RegExp(`User-agent: ${g}\\s*\\nDisallow: /`).test(robots), `ΔΕΝ αποκλείει ${g}`);

  const h = await get('/', PROD);
  const home = await h.text();
  check(!h.headers.get('x-robots-tag'), `home without X-Robots-Tag (${h.headers.get('x-robots-tag') ?? 'none'})`);
  check(/name="robots" content="index, follow/.test(home), 'home meta robots index, follow');

  const sm = await get('/sitemap.xml', PROD);
  const xml = await sm.text();
  check(sm.status === 200, `sitemap.xml → ${sm.status}`);
  check(xml.startsWith('<?xml'), 'έγκυρη δήλωση XML');

  let locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const alts = [...xml.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));
  console.log(`  · ${locs.length} URL, ${alts.length} δηλώσεις hreflang`);
  check(locs.length > 0, 'το sitemap δεν είναι άδειο');
  check(new Set(locs).size === locs.length, 'κανένα διπλό <loc>');
  check(alts.some((a) => a.lang === 'x-default'), 'υπάρχει x-default');

  // Αμοιβαιότητα: κάθε href του hreflang πρέπει να υπάρχει και ως <loc>.
  const locSet = new Set(locs);
  const orphans = [...new Set(alts.map((a) => a.href))].filter(
    (x) => !locSet.has(x) && !alts.some((a) => a.lang === 'x-default' && a.href === x),
  );
  check(orphans.length === 0, `κάθε hreflang δείχνει σε URL του sitemap${orphans.length ? ` — ορφανά: ${orphans.slice(0, 5)}` : ''}`);
  if (Number.isFinite(MAX)) {
    console.log(`  · --max=${MAX}: only the first ${Math.min(MAX, locs.length)} of ${locs.length} URLs are fetched`);
    locs = locs.slice(0, MAX);
  }

  // ── 3. Το κρίσιμο: ζει πράγματι κάθε URL; ──────────────────────────────────
  console.log('\n▸ Ζωντανός έλεγχος κάθε URL του sitemap');
  let passed = 0;
  for (const l of locs) {
    const path = l.replace(ORIGIN, '') || '/';
    const res = await get(path, PROD);
    const html = res.ok ? await res.text() : '';
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const indexed = /name="robots" content="index, follow/.test(html);
    // Αγέμιστο placeholder («{n}») που έφτασε ως το SERP — σιωπηλό και ντροπιαστικό.
    const holes = [...html.matchAll(/<(?:title|h1)[^>]*>[^<]*(\{[a-z]\w*\})/gi)].map((m) => m[1]);
    const metaHole = html.match(/<meta name="description" content="[^"]*(\{[a-z]\w*\})/i)?.[1];
    if (res.status !== 200) bad(`${path} → ${res.status}`);
    else if (canon !== l) bad(`${path} → canonical «${canon}» ≠ loc «${l}»`);
    else if (!indexed) bad(`${path} → δεν εκπέμπει index`);
    else if (holes.length || metaHole) bad(`${path} → αγέμιστο placeholder ${holes.join(',') || metaHole}`);
    else passed++;
  }
  ok(`${passed}/${locs.length} URLs → 200 · canonical = loc · index · no placeholder`);
}

console.log(fails === 0 ? `\n✅ ΟΛΑ ΠΕΡΑΣΑΝ (${MODE})\n` : `\n❌ ${fails} ΑΠΟΤΥΧΙΕΣ (${MODE})\n`);
process.exit(fails === 0 ? 0 : 1);
