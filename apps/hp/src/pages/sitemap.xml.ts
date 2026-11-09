// ═══════════════════════════════════════════════════════════════════════════
// sitemap.xml
//
// Τι κάνει διαφορετικά από το σημερινό (3.827 URL, φτιαγμένο από desktop
// εργαλείο τρίτου — xml-sitemaps.com):
//   · **hreflang alternates σε ΚΑΘΕ url**. Το σημερινό δηλώνει το namespace
//     `xmlns:xhtml` και μετά δεν το χρησιμοποιεί πουθενά — δηλαδή έξι γλώσσες
//     που η Google δεν ξέρει ότι είναι η ίδια σελίδα.
//   · **αληθινό lastmod**. Στο σημερινό είναι όλα ίδια (ή λείπουν), που είναι
//     χειρότερο από το τίποτα: μαθαίνει τον crawler να το αγνοεί.
//   · **χωρίς priority/changefreq**. Η Google τα αγνοεί ρητά από το 2015· στο
//     σημερινό είναι όλα «1.0/daily», δηλαδή μηδέν πληροφορία σε 3.827 μπλοκ.
//   · **παράγεται από τον κώδικα που σερβίρει τις σελίδες** — άρα δεν μπορεί να
//     ξεμείνει πίσω όπως ένα αρχείο που κάποιος ανεβάζει με το χέρι.
//
// 🔴 Ο ΚΑΝΟΝΑΣ: στο `PAGES` μπαίνει σελίδα ΜΟΝΟ όταν σερβίρει 200 σε ΟΛΕΣ τις
//    `PUBLISHED` γλώσσες. Σήμερα υπάρχει μόνο η αρχική — οι εσωτερικοί σύνδεσμοι
//    δίνουν ακόμα 404, και ένα sitemap που δηλώνει 404 είναι ενεργή ζημιά.
//    Επαλήθευση πριν από κάθε προσθήκη: `node scripts/verify-sitemap.mjs`.
//    → B-20: that script never existed; the check is `node scripts/verify-seo.mjs <base> --mode=production`
//      (every <loc> answers 200, canonical = loc, index).
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { hreflangs, hreflangsBy, propertyUrl, type Lang } from '../lib/i18n';
import { allProperties, refOf } from '../lib/api';
import { facetUrl, FACETS, PAIRS, matches, minLive, type Query } from '../lib/listing';
import { PAGE_KEYS, pageExists, pageLangs, contentUrl } from '../lib/pages';
import { isProd, ORIGIN, BUILD_DAY } from '../lib/seo';
import { AREA_PAGES, areaUrl } from '../content/areas/en';
import { CATEGORIES, allArticles, articleUrl, categoryUrl, inCategory } from '../lib/articles';
import { allInfoPages, infoLastmod } from '../lib/infopages';

export const prerender = false;

type Page = {
  /** Ανεξάρτητο γλώσσας, όπως το `path` του Base.astro. Το prefix το βάζει το hreflangs(). */
  path?: string;
  /**
   * Για σελίδες με ΔΙΑΦΟΡΕΤΙΚΟ slug ανά γλώσσα (η λίστα και τα θέματά της).
   * Το κοινό `hreflangs(path)` κολλάει το ΙΔΙΟ string σε κάθε πρόθεμα και θα
   * παρήγε `/en/ακινητα` — δέκα URL που δίνουν 404, δηλωμένα ως εναλλακτικές
   * μεταξύ τους. Η Google απορρίπτει τότε ΟΛΟΚΛΗΡΟ το σύμπλεγμα.
   */
  pathFor?: (l: Lang) => string;
  /** B-16: only these languages (a content page with its own text in some languages only). */
  langs?: Lang[];
  lastmod: string;
  /** #160 spec rule 10: a listing page (its facet keys) is in the sitemap only when it is
   *  indexable, i.e. it has enough live listings — the same test as the page's robots tag. */
  facetKeys?: string[];
};

const PAGES: Page[] = [
  { path: '/', lastmod: BUILD_DAY },

  // ── Η ΛΙΣΤΑ ΚΑΙ ΟΙ ΘΕΜΑΤΙΚΕΣ ΣΕΛΙΔΕΣ ────────────────────────────────────
  // Μπαίνουν ΜΟΝΟ όσες είναι indexable — γυμνή λίστα, ένα θέμα, εγκεκριμένο
  // ζεύγος. Ό,τι έχει παραμέτρους (τιμή, ταξινόμηση, σελίδα >1) δηλώνει
  // `noindex` και δεν έχει θέση εδώ: το sitemap είναι πρόταση προς τη Google,
  // και δεν προτείνουμε σελίδες που της λέμε ταυτόχρονα να αγνοήσει.
  { pathFor: (l) => facetUrl(l), lastmod: BUILD_DAY },
  ...FACETS.map((f) => ({ pathFor: (l: Lang) => facetUrl(l, f.key), lastmod: BUILD_DAY, facetKeys: [f.key] })),
  ...PAIRS.map(([a, b]) => ({ pathFor: (l: Lang) => facetUrl(l, a, b), lastmod: BUILD_DAY, facetKeys: [a, b] })),

  // B-16: the content pages, each only in the languages where it has its own text (English
  // fallbacks under other prefixes carry a canonical to the original and stay out).

  // Area and category pages — English only until the translation phase (George 20/10/2026).
  ...AREA_PAGES.map((p) => ({ pathFor: () => areaUrl(p.slug), langs: ['en'] as Lang[], lastmod: BUILD_DAY })),

];

/**
 * Content pages and info pages. An older content page whose English URL is now served
 * by an info page (or moved to one) keeps only its other languages here.
 */
async function contentPages(): Promise<Page[]> {
  const info = await allInfoPages();
  const keys = PAGE_KEYS.filter(pageExists);
  // contentUrl(k, 'en') already is the info page's URL where one took over (EN_URL, and the
  // same-path pages contact/sell/services): the cluster keeps its English member, and that
  // info page is not listed a second time on its own.
  const covered = new Set(keys.map((k) => contentUrl(k, 'en')));
  const old: Page[] = keys.map((k) => ({ pathFor: (l: Lang) => contentUrl(k, l), langs: pageLangs(k), lastmod: BUILD_DAY }));
  // #94: translations of one info page (same `key`) are one entry with their alternates.
  const own: Page[] = [];
  const done = new Set<string>();
  for (const p of info.filter((x) => !covered.has(x.data.path))) {
    if (p.data.key && done.has(p.data.key)) continue;
    if (p.data.key) done.add(p.data.key);
    const group = p.data.key ? info.filter((x) => x.data.key === p.data.key) : [p];
    // raw paths, as every other entry: the sitemap encodes them once on output
    const at = new Map(group.map((x) => [x.data.lang as Lang, x.data.path]));
    own.push({ pathFor: (l: Lang) => at.get(l) ?? p.data.path, langs: [...at.keys()], lastmod: infoLastmod(p, BUILD_DAY) });
  }
  return [...old, ...own];
}

/** Articles and their category lists — English only for now; list page 2+ is noindex, so left out. */
async function articlePages(): Promise<Page[]> {
  const day = (iso: string) => (Date.parse(iso) ? new Date(iso).toISOString().slice(0, 10) : BUILD_DAY);
  const lists: Page[] = [];
  for (const c of CATEGORIES) {
    if ((await inCategory(c.key)).length) lists.push({ pathFor: () => categoryUrl(c.key), langs: ['en'] as Lang[], lastmod: BUILD_DAY });
  }
  const arts = (await allArticles()).map((a) => ({
    pathFor: () => articleUrl(a), langs: ['en'] as Lang[], lastmod: day(a.data.updated || a.data.published),
  }));
  return [...lists, ...arts];
}

/**
 * ΟΙ ΚΑΡΤΕΛΕΣ ΤΩΝ ΑΚΙΝΗΤΩΝ — Ο ΚΥΡΙΟΣ ΟΓΚΟΣ, ΚΑΙ ΕΛΕΙΠΕ ΟΛΟΚΛΗΡΟΣ.
 *
 * 🪤 ΓΙΑΤΙ ΟΧΙ ΤΟ `GET /site/sitemap` ΤΟΥ API, ΠΟΥ ΕΙΝΑΙ ΦΤΙΑΓΜΕΝΟ ΓΙ' ΑΥΤΟ.
 *    Μετρήθηκε: επιστρέφει **773** αναγνωριστικά ενώ δημόσια είναι **525**. Τα 248
 *    της διαφοράς δεν σερβίρονται — θα δηλώναμε στη Google 248 × 9 γλώσσες = **2.232
 *    διευθύνσεις που γυρίζουν 404**. Το ίδιο αρχείο γράφτηκε για να ΜΗΝ το κάνει αυτό.
 *    ⇒ Πηγή αλήθειας είναι ό,τι **σερβίρει** το site, δηλαδή το `allProperties`, που
 *    έχει ήδη μέσα και το φίλτρο των δοκιμαστικών (`isRealProperty`).
 *
 * 📅 ΤΟ `lastmod` ΕΙΝΑΙ ΑΛΗΘΙΝΟ, ΑΝΑ ΑΚΙΝΗΤΟ. Ίδια ημερομηνία παντού είναι ακριβώς το
 *    ελάττωμα που περιγράφει η κορυφή αυτού του αρχείου: η Google μαθαίνει να μην την
 *    εμπιστεύεται και σταματά να ξαναπερνά όταν αλλάζει κάτι στ' αλήθεια.
 */
async function propertyPages(): Promise<Page[]> {
  try {
    const items = await allProperties();
    return items.map((it) => {
      const id = refOf(it);
      const upd = it.updatedAt ?? it.createdAt ?? '';
      const day = /^\d{4}-\d{2}-\d{2}/.test(upd) ? upd.slice(0, 10) : BUILD_DAY;
      return { pathFor: (l: Lang) => propertyUrl(l, id), lastmod: day };
    });
  } catch {
    // Το API κάτω ⇒ sitemap ΧΩΡΙΣ ακίνητα, όχι sitemap με σφάλμα. Οι στατικές
    // σελίδες είναι πάντα σωστές· η επόμενη ανάκτηση θα τις ξαναφέρει.
    return [];
  }
}

/** Τα URL περιέχουν ελληνικά/κυριλλικά slugs — χωρίς αυτό βγαίνει άκυρο XML. */
const loc = (path: string) => ORIGIN + encodeURI(path);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function urlBlock(page: Page): string {
  const alts = page.pathFor ? hreflangsBy(page.pathFor, page.langs) : hreflangs(page.path ?? '/');
  // Κάθε γλωσσική εκδοχή είναι δικό της <url> και παραθέτει ΟΛΟΚΛΗΡΟ το σύνολο
  // των εναλλακτικών, τον εαυτό της συμπεριλαμβανομένου — έτσι το απαιτεί το
  // πρότυπο· μισό σύμπλεγμα = απορρίπτεται ολόκληρο.
  const links = alts
    .map((a) => `    <xhtml:link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(loc(a.href))}" />`)
    .join('\n');

  return alts
    .filter((a) => a.lang !== 'x-default') // το x-default είναι δείκτης, όχι σελίδα
    .map(
      (a) => `  <url>
    <loc>${esc(loc(a.href))}</loc>
    <lastmod>${page.lastmod}</lastmod>
${links}
  </url>`,
    )
    .join('\n');
}

/** #160: drop the listing pages below the spec's threshold (anonymous set, no country rule, as on
 *  the page). If the CRM cannot be reached, the facet pages stay as they are. */
async function liveFacets(pages: Page[]): Promise<Page[]> {
  let items: Awaited<ReturnType<typeof allProperties>>;
  try { items = await allProperties(); } catch { return pages; }
  return pages.filter((p) => {
    if (!p.facetKeys) return true;
    const q: Query = Object.assign({}, ...p.facetKeys.map((k) => FACETS.find((f) => f.key === k)?.q ?? {}));
    return items.filter((it) => matches(it, q)).length >= minLive(p.facetKeys);
  });
}

export const GET: APIRoute = async ({ request, url }) => {
  // Σε προεπισκόπηση δεν υπάρχει sitemap — όχι κρυμμένο, ανύπαρκτο.
  if (!isProd(request, url)) return new Response(null, { status: 404 });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...(await liveFacets(PAGES)), ...(await contentPages()), ...(await articlePages()), ...(await propertyPages())].map(urlBlock).join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
