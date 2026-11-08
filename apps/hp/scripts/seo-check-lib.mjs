// SEO checker rules (#153, plan E-111). Pure functions: given the HTML of a page and its spec data
// (src/content/seo/<ID>/<lang>.json), return the list of problems. Used by scripts/seo-check.mjs
// (crawl a running site) and scripts/test-seo-check.mjs (CI). No dependencies.
//
// Sources: George's spec (0_README rules), Google Search Central (ssot seo-google-guidelines),
// our rules (R-006 location, R-010 no counts). Every problem names the rule it breaks.

export const ORIGIN = 'https://www.halkidikiproperties.com';
export const BRAND = 'Halkidiki Properties';
export const OG_LOCALE = { el: 'el_GR', en: 'en_GB', de: 'de_DE', sr: 'sr_RS', bg: 'bg_BG', ro: 'ro_RO', ru: 'ru_RU', tr: 'tr_TR', he: 'he_IL' };

export const decode = (s) => String(s ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const text = (html) => decode(String(html ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s) => text(s).toLowerCase();
const len = (s) => [...s].length;
const decUrl = (u) => { try { return decodeURI(u); } catch { return u; } };

/** The title the spec wants (rule 6): brand appended only if the total stays ≤ 60. */
export const wantTitle = (t) => (len(`${t} | ${BRAND}`) <= 60 ? `${t} | ${BRAND}` : t);

const attr = (tag, name) => decode(tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? '');
const metaBy = (head, key, val) => {
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) if (attr(m[0], key) === val) return attr(m[0], 'content');
  return undefined;
};

/** Parse the parts of a page the checks need. */
export function parse(html) {
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  const body = headEnd > 0 ? html.slice(headEnd) : html;
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const ld = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ld.push(JSON.parse(m[1])); } catch { ld.push({ '@parseError': true }); }
  }
  const flat = ld.flatMap((x) => (Array.isArray(x) ? x : x['@graph'] ?? [x]));
  return {
    head, body, html,
    lang: attr(htmlTag, 'lang'), dir: attr(htmlTag, 'dir'),
    title: decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
    meta: metaBy(head, 'name', 'description'),
    robots: metaBy(head, 'name', 'robots'),
    og: { title: metaBy(head, 'property', 'og:title'), description: metaBy(head, 'property', 'og:description'), locale: metaBy(head, 'property', 'og:locale') },
    canonical: links.filter((l) => attr(l, 'rel') === 'canonical').map((l) => attr(l, 'href')),
    hreflang: Object.fromEntries(links.filter((l) => attr(l, 'rel') === 'alternate' && attr(l, 'hreflang')).map((l) => [attr(l, 'hreflang'), attr(l, 'href')])),
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1])),
    h2: [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1])),
    h3: [...body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => text(m[1])),
    anchors: [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decUrl(attr(`<a ${m[1]}>`, 'href')), text: text(m[2]) })),
    imgs: [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src'), alt: m[0].match(/\salt="([^"]*)"/i)?.[1] })),
    ld: flat,
    types: flat.flatMap((x) => [].concat(x?.['@type'] ?? [])),
  };
}

/** Is `sub` an in-order subsequence of `list`? (the design may add its own H2s around the spec's) */
const inOrder = (sub, list) => { let i = 0; for (const x of list) if (x === sub[i]) i++; return i === sub.length; };

/**
 * Check one spec page. `page` = the spec JSON, `cluster` = the spec JSONs of all languages of the
 * same page ID, `opts.mode` = 'preview' | 'production', `opts.items` = whether the listing shows
 * listings (ItemList is required only then).
 */
export function checkSpecPage(html, page, cluster, opts = {}) {
  const p = parse(html);
  const out = [];
  const bad = (rule, msg) => out.push(`${rule}: ${msg}`);
  const abs = (path) => ORIGIN + path;

  // Head (rules 3, 5, 6, 7, 21)
  if (p.title !== wantTitle(page.title)) bad('title (rule 6)', `«${p.title}» ≠ «${wantTitle(page.title)}»`);
  if (p.meta !== page.meta) bad('meta (rule 7)', `«${p.meta ?? '—'}» ≠ spec`);
  if (p.canonical.length !== 1 || decUrl(p.canonical[0]) !== abs(page.canonical || page.path)) bad('canonical (rule 4)', `${p.canonical.map(decUrl).join(' ') || '—'} ≠ ${abs(page.canonical || page.path)}`);
  for (const c of cluster) if (decUrl(p.hreflang[c.lang] ?? '') !== abs(c.path)) bad('hreflang (rule 5)', `${c.lang} → ${decUrl(p.hreflang[c.lang] ?? '—')} ≠ ${abs(c.path)}`);
  const en = cluster.find((c) => c.lang === 'en');
  if (en && decUrl(p.hreflang['x-default'] ?? '') !== abs(en.path)) bad('hreflang x-default (rule 5)', decUrl(p.hreflang['x-default'] ?? '—'));
  const extra = Object.keys(p.hreflang).filter((l) => l !== 'x-default' && !cluster.some((c) => c.lang === l));
  if (extra.length) bad('hreflang (rule 5)', `languages outside the cluster: ${extra.join(' ')}`);
  if (p.lang !== page.lang) bad('html lang (rule 5)', `${p.lang || '—'} ≠ ${page.lang}`);
  if (page.lang === 'he' && p.dir !== 'rtl') bad('html dir (rule 5)', 'Hebrew page is not dir="rtl"');
  if (opts.mode === 'preview' && !/noindex/.test(p.robots ?? '') ) bad('robots (preview must be noindex)', p.robots ?? '—');
  if (p.og.title !== page.ogTitle) bad('og:title (rule 21)', `«${p.og.title ?? '—'}»`);
  if (p.og.description !== page.meta) bad('og:description (rule 21)', `«${p.og.description ?? '—'}»`);
  if (p.og.locale !== OG_LOCALE[page.lang]) bad('og:locale (rule 21)', `${p.og.locale ?? '—'} ≠ ${OG_LOCALE[page.lang]}`);

  // Headings and texts (rules 8, 9)
  if (p.h1.length !== 1) bad('one H1 (rule 8)', `${p.h1.length} H1`);
  else if (p.h1[0] !== page.h1) bad('H1 (rule 8)', `«${p.h1[0]}» ≠ «${page.h1}»`);
  if (!inOrder(page.h2, p.h2)) bad('H2 outline (rule 8)', `missing or out of order: ${page.h2.filter((h) => !p.h2.includes(h)).join(' | ') || 'order'}`);
  const body = norm(p.body);
  if (!body.includes(norm(page.intro))) bad('intro text (rule 9)', 'differs from the spec');
  if (!body.includes(norm(page.body))) bad('body text (rule 9)', 'differs from the spec');
  for (const f of page.faq) {
    if (!p.h3.includes(f.q)) bad('FAQ question as H3 (rule 8)', f.q);
    if (!body.includes(norm(f.a))) bad('FAQ answer in the HTML (rule 8)', f.q);
  }
  // Each block must be found AFTER the previous one (the same words may also appear earlier, e.g. in the meta).
  let pos = body.indexOf(norm(page.h1));
  for (const [name, s] of [['intro', page.intro], ['body', page.body], ['FAQ', page.faq[0]?.a]]) {
    if (!s || pos < 0) break;
    const next = body.indexOf(norm(s).slice(0, 60), pos + 1);
    if (next < 0) { bad('layout order (rule 9)', `${name} not after the previous block (H1 → intro → grid → body → FAQ)`); break; }
    pos = next;
  }
  if (['P19', 'P20', 'P21'].includes(page.id) && page.editorialLine && !body.includes(norm(page.editorialLine))) bad('editorial line (rule 1)', 'not shown');

  // Internal links (rule 15): every spec link, exact anchor, real <a href>
  for (const l of page.linksOut) {
    if (!p.anchors.some((a) => a.href === l.href && a.text === l.anchor)) bad('link out (rule 15)', `«${l.anchor}» → ${l.href}`);
  }

  // Structured data (rule 11; Google: markup must match the page)
  if (p.ld.some((x) => x['@parseError'])) bad('JSON-LD', 'does not parse');
  for (const t of page.schema) {
    if (t === 'ItemList' && !opts.items) continue;
    if (!p.types.includes(t)) bad(`schema ${t} (rule 11)`, 'missing');
  }
  const bc = p.ld.find((x) => [].concat(x['@type']).includes('BreadcrumbList'));
  if (bc) {
    const items = bc.itemListElement ?? [];
    if (items.map((i) => i.name).join(' > ') !== page.breadcrumb.join(' > ')) bad('breadcrumb (rule 15)', `${items.map((i) => i.name).join(' > ')} ≠ ${page.breadcrumb.join(' > ')}`);
    items.forEach((it, i) => { if (i < items.length - 1 && !it.item) bad('breadcrumb item URL (Google)', it.name); });
  }
  const faqLd = p.ld.find((x) => [].concat(x['@type']).includes('FAQPage'));
  if (faqLd && (faqLd.mainEntity ?? []).length !== page.faq.length) bad('FAQPage = visible FAQ (Google)', `${(faqLd.mainEntity ?? []).length} ≠ ${page.faq.length}`);

  out.push(...checkCommon(p));
  return out;
}

/** Checks for every page, spec or not. */
export function checkCommon(p) {
  const out = [];
  const t = text(p.body);
  if (/(?<![\d.,])\d{1,3}\.\d{4,}(?![\d.])/.test(t.replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, ''))) out.push('location (R-006): coordinate-like number in the text');
  if (/"(latitude|longitude)"\s*:/.test(p.html) || /"geo"\s*:/.test(p.html)) out.push('location (R-006): geo coordinates in the markup');
  const noAlt = p.imgs.filter((i) => i.alt === undefined || (i.alt.trim() === '' && !/logo|icon|sprite/i.test(i.src)));
  if (noAlt.length) out.push(`image alt (rule 14): ${noAlt.length} image(s) without alt`);
  if (p.anchors.some((a) => /^javascript:/i.test(a.href))) out.push('links (Google): javascript: link');
  if (!p.title) out.push('title: missing');
  return out;
}
