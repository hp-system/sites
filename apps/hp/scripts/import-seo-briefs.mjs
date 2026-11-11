// Imports the approved briefs of pages outside George's spec (P22+, D-20261106-SS-2) into
// src/content/seo-own/<ID>/<lang>.json, in the same shape as the spec pages, so the site renders
// them like the spec pages (same template, same SEO head, same checker).
//
//   node scripts/import-seo-briefs.mjs            (all batches in scripts/seo-briefs/)
//   node scripts/import-seo-briefs.mjs --draft    (also draft batches: local preview only)
//
// Only pages of a batch with status «approved» are written. The spec's own text rules apply
// (title ≤ 60 before the brand, meta 130–155, intro ≤ 120 words, HTML only p h2 h3 ul li strong,
// H2 outline = the body's H2s, FAQ questions = answers, no counts). Exit 1 writes nothing.
// EN only until stage 5: each other language is written later from the brief with its own keyword.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlProblems, bodyH2, TITLE_MAX, META_MIN, META_MAX, INTRO_MAX_WORDS } from './seo-spec-rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const SITE = 'https://www.halkidikiproperties.com';
const len = (s) => [...(s ?? '')].length;
const words = (h) => (h ?? '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

const DRAFT = process.argv.includes('--draft');
const errors = [];
const out = [];
for (const f of readdirSync(join(HERE, 'seo-briefs')).filter((n) => n.endsWith('.json'))) {
  const batch = JSON.parse(readFileSync(join(HERE, 'seo-briefs', f), 'utf8'));
  // --draft: also a draft batch, to see its texts on the local site before Sergei approves them (never commit that output)
  if (batch.status !== 'approved' && !(DRAFT && batch.status === 'draft')) { console.log(`skip ${f}: status ${batch.status}`); continue; }
  for (const b of batch.pages) {
    if (b.foldedInto) { console.log(`skip ${b.id}: folded into ${b.foldedInto}`); continue; }
    const err = (m) => errors.push(`${f} ${b.id}/${b.lang}: ${m}`);
    const path = b.url.replace(SITE, '');
    if (!/^P(2[2-9]|[3-9]\d)$/.test(b.id)) err('only pages P22+ live here (P01–P21 come from George\'s spec)');
    if (len(b.title) > TITLE_MAX) err(`title ${len(b.title)} > ${TITLE_MAX}`);
    if (/\|\s*Halkidiki Properties\s*$/.test(b.title)) err('title carries the brand; the template appends it (README rule 6)');
    if (len(b.meta) < META_MIN || len(b.meta) > META_MAX) err(`meta ${len(b.meta)} not in ${META_MIN}–${META_MAX}`);
    if (words(b.intro) > INTRO_MAX_WORDS) err(`intro ${words(b.intro)} words > ${INTRO_MAX_WORDS}`);
    const html = [...htmlProblems(b.intro), ...htmlProblems(b.body)];
    if (html.length) err(`HTML not allowed: ${html.join(', ')}`);
    if (JSON.stringify(bodyH2(b.body)) !== JSON.stringify(b.h2)) err('H2 outline ≠ the body\'s H2s');
    for (const t of b.photoThemes ?? []) if (!b.h2.includes(t.after)) err(`photo theme after «${t.after}»: no such H2`);
    for (const h of [b.standout ?? []].flat()) if (!b.h2.includes(h)) err(`standout «${h}»: no such H2`);
    for (const h of b.questionMarks ?? []) if (!b.h2.includes(h)) err(`question mark on «${h}»: no such H2`);
    for (const t of b.postPhotos ?? []) {
      if (!b.h2.includes(t.after)) err(`post photo after «${t.after}»: no such H2`);
      for (const w of [640, 960]) if (!existsSync(join(APP, 'public', `${t.file}_${w}w.webp`))) err(`post photo ${t.file}_${w}w.webp: no such file`);
      if (!t.alt) err(`post photo after «${t.after}»: no alt`);
    }
    if (b.faq.length !== b.faqQuestions.length || b.faq.some((x, i) => x.q !== b.faqQuestions[i])) err('FAQ answers ≠ FAQ questions');
    const text = [b.title, b.meta, b.h1, b.intro, b.body, ...b.faq.map((x) => x.a)].join(' ').replace(/<[^>]+>/g, ' ');
    if (/\b\d{3,}\s+(properties|homes|listings|villas|plots)\b/i.test(text)) err('a property count (README rule 13)');
    out.push({
      id: b.id, lang: b.lang, buildOrder: '', priority: '', name: b.page, pageType: b.pageType, path,
      keyword: b.primaryKeyword, titleFocus: b.titleFocus, title: b.title, meta: b.meta, h1: b.h1, h2: b.h2,
      faqQuestions: b.faqQuestions, faq: b.faq, intro: b.intro, body: b.body, listingFilter: '',
      indexing: 'index', canonical: path, hreflang: [b.lang], schema: b.schema, breadcrumb: b.breadcrumb,
      heroAlt: b.heroAlt, galleryAltPattern: '', ogTitle: b.ogTitle, anchor: b.anchor, anchorVariants: [],
      linksOut: b.linksOut, linkedFrom: b.linkedFrom, cta: b.cta, ctaHref: b.ctaHref ?? '', oldUrls: b.oldUrls,
      words: words(b.intro + b.body + b.faq.map((x) => x.a).join(' ')), editorialLine: b.editorialLine ?? '',
      lawyerCheck: b.lawyerCheck ?? '', source: `brief ${f}`,
      photoThemes: b.photoThemes ?? [], standout: [b.standout ?? []].flat(), postPhotos: b.postPhotos ?? [], questionMarks: b.questionMarks ?? [],
    });
  }
}
if (errors.length) {
  console.error(`FAIL ${errors.length} problem(s); nothing written:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
for (const p of out) {
  const dir = join(APP, 'src/content/seo-own', p.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${p.lang}.json`), JSON.stringify(p, null, 2) + '\n');
}
console.log(`OK ${out.length} own page(s): ${out.map((p) => `${p.id}/${p.lang}`).join(' ')}`);
