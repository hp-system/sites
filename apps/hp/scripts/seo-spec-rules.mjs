// Rules for George's SEO spec data (#150, plan E-111). Shared by the importer
// (scripts/import-seo-spec.mjs) and the CI test (scripts/test-seo-spec.mjs), so the committed
// JSON in src/content/seo is checked with exactly the rules it was imported with.
//
// Each rule comes from sheet 0_README (meta 130–155 = rule 7, title 60 = rule 6) of the spec or from our own rules (R-006 location,
// R-008 all languages, R-010 no counts). validate() returns a list of error strings.

export const LANGS = ['el', 'en', 'de', 'sr', 'bg', 'ro', 'ru', 'tr', 'he'];
/** Pages that are not built in some languages: the homepage plays their role there. */
export const NOT_BUILT = { P03: ['sr', 'bg', 'ro'] };
/** The only HTML the spec texts may carry: no attributes, no links (links come from the registry). */
export const ALLOWED_TAGS = ['p', 'h2', 'h3', 'ul', 'li', 'strong'];

export const TITLE_MAX = 60;
export const META_MIN = 130;
export const META_MAX = 155;
export const INTRO_MAX_WORDS = 120;
/** schema.org types the spec names (0_README rule 11). */
export const SCHEMA_TYPES = ['Organization', 'RealEstateAgent', 'WebSite', 'CollectionPage', 'ItemList', 'Article', 'BreadcrumbList', 'FAQPage'];

const len = (s) => [...(s ?? '')].length;
const words = (html) => html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Strict allowlist: returns the offending tags/attributes, empty when the HTML is clean. */
export function htmlProblems(html) {
  const bad = [];
  for (const m of (html ?? '').matchAll(/<\s*(\/?)\s*([a-zA-Z0-9-]+)([^>]*)>/g)) {
    const [, , tag, rest] = m;
    if (!ALLOWED_TAGS.includes(tag.toLowerCase())) bad.push(`<${tag}>`);
    else if (rest.trim()) bad.push(`<${tag}${rest}> (attributes)`);
  }
  if (/javascript:|on[a-z]+\s*=|<!--|&lt;\s*script/i.test(html ?? '')) bad.push('script-like content');
  return bad;
}

/** H2 headings of the body, in order. */
export const bodyH2 = (html) => [...(html ?? '').matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));

/** Coordinates such as 40.1234 or 23.45678 — never allowed in public text (R-006). */
const COORD = /(?<![\d.,])\d{1,3}\.\d{4,}(?![\d])/;

export function validate(pages, { knownPaths = new Set(), allowedLinkTargets = [] } = {}) {
  const errors = [];
  const err = (p, msg) => errors.push(`${p.id}/${p.lang}: ${msg}`);
  const byId = new Map();
  for (const p of pages) {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push(p);
  }

  // R-008: every page in every language, except the documented NOT_BUILT cells.
  for (const [id, list] of byId) {
    const have = new Set(list.map((p) => p.lang));
    for (const l of LANGS) {
      const skip = (NOT_BUILT[id] ?? []).includes(l);
      if (!skip && !have.has(l)) errors.push(`${id}: language ${l} missing`);
      if (skip && have.has(l)) errors.push(`${id}: language ${l} must not be built (homepage covers it)`);
    }
  }

  const seen = { title: new Map(), meta: new Map(), path: new Map() };
  for (const p of pages) {
    if (!LANGS.includes(p.lang)) err(p, `unknown language ${p.lang}`);
    if (!p.path?.startsWith('/')) err(p, `path must start with /: ${p.path}`);
    if (!p.title) err(p, 'title missing');
    if (len(p.title) > TITLE_MAX) err(p, `title ${len(p.title)} > ${TITLE_MAX}`);
    if (len(p.meta) < META_MIN || len(p.meta) > META_MAX) err(p, `meta ${len(p.meta)} outside ${META_MIN}–${META_MAX}`);
    if (!p.h1) err(p, 'H1 missing');
    const badSchema = (p.schema ?? []).filter((s) => !SCHEMA_TYPES.includes(s));
    if (!p.schema?.length || badSchema.length) err(p, `schema types unknown or empty: ${JSON.stringify(p.schema)}`);
    for (const k of ['title', 'meta', 'path']) {
      const key = `${p.lang}|${p[k]}`;
      if (seen[k].has(key)) err(p, `${k} duplicates ${seen[k].get(key)}`);
      else seen[k].set(key, p.id);
    }

    for (const f of ['intro', 'body']) {
      const bad = htmlProblems(p[f]);
      if (bad.length) err(p, `${f}: not allowed ${[...new Set(bad)].join(', ')}`);
    }
    if (words(p.intro ?? '') > INTRO_MAX_WORDS) err(p, `intro ${words(p.intro)} words > ${INTRO_MAX_WORDS}`);
    if (!p.intro) err(p, 'intro missing');

    const h2 = bodyH2(p.body);
    if (JSON.stringify(h2) !== JSON.stringify(p.h2)) err(p, `body H2 differ from the outline: ${JSON.stringify(h2)} vs ${JSON.stringify(p.h2)}`);

    if (p.faq.length !== p.faqQuestions.length) err(p, `FAQ answers ${p.faq.length} vs questions ${p.faqQuestions.length}`);
    p.faq.forEach((f, i) => {
      if (f.q !== p.faqQuestions[i]) err(p, `FAQ ${i + 1} question differs from the list`);
      if (!f.a) err(p, `FAQ ${i + 1} answer empty`);
      const bad = htmlProblems(f.a);
      if (bad.length) err(p, `FAQ ${i + 1}: not allowed ${bad.join(', ')}`);
    });

    const all = [p.title, p.meta, p.h1, p.intro, p.body, p.ogTitle, p.heroAlt, ...p.faq.map((f) => f.a)].join(' ');
    if (COORD.test(text(all))) err(p, 'looks like a coordinate');

    for (const l of p.linksOut) {
      if (!l.anchor || !l.href) err(p, `link out incomplete: ${JSON.stringify(l)}`);
      else if (!knownPaths.has(l.href) && !allowedLinkTargets.includes(l.href)) err(p, `link out to an unknown page: ${l.href}`);
    }
  }
  return errors;
}
