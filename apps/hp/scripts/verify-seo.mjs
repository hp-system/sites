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
const BASE = (process.argv[2] ?? 'http://localhost:4331').replace(/\/$/, '');
const PROD = 'www.halkidikiproperties.com';
const ORIGIN = `https://${PROD}`;

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

// ── 1. Προεπισκόπηση: τίποτα δεν πρέπει να είναι ευρετηριάσιμο ──────────────
console.log('\n▸ Ως προεπισκόπηση (ο host που τρέχει τώρα)');
{
  const r = await get('/robots.txt');
  const body = await r.text();
  check(r.status === 200, `robots.txt → ${r.status}`);
  check(/^\s*Disallow:\s*\/\s*$/m.test(body), 'robots.txt λέει Disallow: /');
  check(!body.includes('Sitemap:'), 'δεν διαφημίζει sitemap');

  const s = await get('/sitemap.xml');
  check(s.status === 404, `sitemap.xml → ${s.status} (αναμενόμενο 404)`);

  const h = await get('/');
  const html = await h.text();
  check(/name="robots" content="noindex, nofollow"/.test(html), 'η αρχική εκπέμπει noindex');
}

// ── 2. Παραγωγή ────────────────────────────────────────────────────────────
console.log('\n▸ Ως παραγωγή (x-forwarded-host: ' + PROD + ')');
const r = await get('/robots.txt', PROD);
const robots = await r.text();
check(/^User-agent: \*\nAllow: \//m.test(robots), 'robots.txt επιτρέπει τα πάντα');
check(robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`), 'δηλώνει το sitemap');
check(robots.includes('Disallow: /api/'), 'κλείνει τα /api/');
for (const b of ['MJ12bot', 'SemrushBot', 'PetalBot', 'Baiduspider', 'Mediatoolkitbot'])
  check(new RegExp(`User-agent: ${b}\\nDisallow: /`).test(robots), `αποκλείει ${b}`);
for (const g of ['Googlebot', 'AhrefsBot', 'Bingbot'])
  check(!new RegExp(`User-agent: ${g}\\s*\\nDisallow: /`).test(robots), `ΔΕΝ αποκλείει ${g}`);

const sm = await get('/sitemap.xml', PROD);
const xml = await sm.text();
check(sm.status === 200, `sitemap.xml → ${sm.status}`);
check(xml.startsWith('<?xml'), 'έγκυρη δήλωση XML');

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const alts = [...xml.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));
console.log(`  · ${locs.length} URL, ${alts.length} δηλώσεις hreflang`);
check(locs.length > 0, 'το sitemap δεν είναι άδειο');
check(new Set(locs).size === locs.length, 'κανένα διπλό <loc>');
check(alts.some((a) => a.lang === 'x-default'), 'υπάρχει x-default');

// Αμοιβαιότητα: κάθε href του hreflang πρέπει να υπάρχει και ως <loc>.
const locSet = new Set(locs);
const orphans = [...new Set(alts.map((a) => a.href))].filter(
  (h) => !locSet.has(h) && !alts.some((a) => a.lang === 'x-default' && a.href === h),
);
check(orphans.length === 0, `κάθε hreflang δείχνει σε URL του sitemap${orphans.length ? ` — ορφανά: ${orphans}` : ''}`);

// ── 3. Το κρίσιμο: ζει πράγματι κάθε URL; ──────────────────────────────────
console.log('\n▸ Ζωντανός έλεγχος κάθε URL του sitemap');
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
  else ok(`${path} → 200 · canonical ταιριάζει · index · χωρίς placeholder`);
}

console.log(fails === 0 ? '\n✅ ΟΛΑ ΠΕΡΑΣΑΝ\n' : `\n❌ ${fails} ΑΠΟΤΥΧΙΕΣ\n`);
process.exit(fails === 0 ? 0 : 1);
