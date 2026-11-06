// Import George's SEO spec (xlsx, 2026-11-05) into page data (#150, plan E-111).
//
//   node scripts/import-seo-spec.mjs <path/to/HP_SEO_build_spec.xlsx>
//
// The xlsx is stored in ssot (docs/70_seo/files/) and is never edited. Corrections go in
// scripts/seo-spec-overrides.json, keyed by page ID and language. Output:
//   src/content/seo/<PageID>/<lang>.json   one file per page and language (sheet 1_Pages)
//   src/data/seo-property-template.json    title/meta/H1/alt patterns per language (sheet 4)
// The import stops with exit 1 when any rule in scripts/seo-spec-rules.mjs fails, and then
// writes nothing. No dependencies: the xlsx (a zip of XML files) is read with node:zlib.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, NOT_BUILT } from './seo-spec-rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ORIGIN = 'https://www.halkidikiproperties.com';

// ── zip ──────────────────────────────────────────────────────────────────────
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('bad zip directory');
    const method = buf.readUInt16LE(off + 10);
    const size = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(raw) : method === 0 ? raw : null);
    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

// ── sheet XML ────────────────────────────────────────────────────────────────
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&');
const tText = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unxml(m[1])).join('');
const colIndex = (ref) => [...ref.replace(/\d+$/, '')].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

function readSheets(files) {
  const xml = (n) => files.get(n)?.toString('utf8');
  const shared = [...(xml('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => tText(m[1]));
  const rels = new Map([...xml('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => [m[0].match(/Id="([^"]+)"/)[1], m[0].match(/Target="([^"]+)"/)[1]]));
  const sheets = {};
  for (const m of xml('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = unxml(m[0].match(/name="([^"]+)"/)[1]);
    let target = rels.get(m[0].match(/r:id="([^"]+)"/)[1]).replace(/^\//, '');
    if (!target.startsWith('xl/')) target = 'xl/' + target;
    const rows = [];
    for (const r of xml(target).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]; const inner = c[2] ?? '';
        const ref = attrs.match(/r="([A-Z]+\d+)"/)[1];
        const type = attrs.match(/t="([^"]+)"/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        row[colIndex(ref)] = type === 'inlineStr' ? tText(inner) : type === 's' ? shared[+v] : v != null ? unxml(v) : '';
      }
      rows.push(Array.from(row, (x) => x ?? ''));
    }
    const [head, ...body] = rows;
    sheets[name] = body.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
  }
  return sheets;
}

// ── fields ───────────────────────────────────────────────────────────────────
const lines = (s) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
const toPath = (u) => {
  const s = (u ?? '').trim().replace(/^self:\s*/, '');
  if (!s.startsWith(ORIGIN)) return s;
  return decodeURIComponent(s.slice(ORIGIN.length)) || '/';
};
const stripPrefix = (s, p) => s.replace(new RegExp(`^${p}:\\s*`, 'i'), '');

function parseFaq(s) {
  const out = [];
  for (const block of (s ?? '').split(/\n\s*\n/)) {
    const q = block.match(/^Q:\s*(.+)$/m)?.[1]?.trim();
    const a = block.match(/^A:\s*([\s\S]+)$/m)?.[1]?.trim();
    if (q || a) out.push({ q: q ?? '', a: a ?? '' });
  }
  return out;
}

function page(r) {
  return {
    id: r['Page ID'],
    lang: r['Lang'],
    buildOrder: Number(r['Build order']) || null,
    priority: r['Priority'],
    name: r['Page'],
    pageType: r['Page type'],
    path: toPath(r['URL (absolute)']),
    keyword: {
      primary: r['Primary keyword'],
      volume: Number(r['Primary vol/month']) || 0,
      secondary: lines(r['Secondary keywords (vol/month)']),
      otherGeography: lines(r['Other-geography variants (vol/month)']),
    },
    titleFocus: r['Title focus'],
    title: r['Title tag (≤60, brand appended by template if it fits)'],
    meta: r['Meta description'],
    h1: r['H1'],
    h2: lines(r['H2 outline']).map((x) => stripPrefix(x, 'H2')),
    faqQuestions: lines(r['FAQ questions (FAQPage schema)']).map((x) => stripPrefix(x, 'Q')),
    faq: parseFaq(r['TEXT: FAQ answers']),
    intro: r['TEXT: intro (HTML, between H1 and grid)'],
    body: r['TEXT: body (HTML, below grid)'],
    listingFilter: r['Listing filter / data'],
    indexing: r['Indexing rule'],
    canonical: toPath(r['Canonical']),
    hreflang: r['hreflang cluster'],
    // «A + B (note), C, D not needed» → [A, B, C]: notes in brackets dropped, «not needed» items dropped.
    schema: r['Schema.org'].replace(/\(.*?\)/g, '').split(/[+,]/).map((x) => x.trim()).filter((x) => x && !/not needed/i.test(x)),
    breadcrumb: r['Breadcrumb'].split('>').map((x) => x.trim()).filter(Boolean),
    heroAlt: r['Hero image alt'],
    galleryAltPattern: r['Listing/gallery image alt pattern'],
    ogTitle: r['OG title'],
    anchor: r['Anchor text when linking TO this page (exact)'],
    anchorVariants: lines(r['Anchor variants']),
    linksOut: lines(r['Links OUT from this page (exact anchor → URL)']).map((x) => {
      const [anchor, url] = x.split('→').map((y) => y.trim());
      return { anchor, href: toPath(url) };
    }),
    linkedFrom: lines(r['Linked FROM (pages)']).map((x) => x.split(/\s+/)[0]),
    cta: r['Main CTA'],
    oldUrls: lines(r['Old URLs to 301 here']).map((x) => {
      const m = x.match(/^(\S+)(?:\s+\((\d+)\s+clicks?\))?/);
      return { path: m?.[1] ?? x, clicks: Number(m?.[2] ?? 0) };
    }),
    words: Number(r['Words']) || 0,
    editorialLine: r['Editorial line'],
    lawyerCheck: r['Lawyer check before publishing'],
  };
}

function applyOverrides(p, overrides) {
  const o = overrides[`${p.id}/${p.lang}`];
  // Keys starting with «_» are the reason for the override, kept in the overrides file only.
  return o ? { ...p, ...Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_'))) } : p;
}

// ── main ─────────────────────────────────────────────────────────────────────
const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Usage: node scripts/import-seo-spec.mjs <path/to/spec.xlsx>');
  process.exit(2);
}
const sheets = readSheets(unzip(readFileSync(file)));
const overridesFile = join(HERE, 'seo-spec-overrides.json');
const overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, 'utf8')) : {};

const rows = sheets['1_Pages'] ?? [];
const pages = rows
  .filter((r) => !(NOT_BUILT[r['Page ID']] ?? []).includes(r['Lang']))
  .map(page)
  .map((p) => applyOverrides(p, overrides.pages ?? {}));
const knownPaths = new Set(pages.map((p) => p.path));
const errors = validate(pages, { knownPaths, allowedLinkTargets: overrides.allowedLinkTargets ?? [] });
if (errors.length) {
  console.error(`FAIL ${errors.length} problem(s); nothing written:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

for (const p of pages) {
  const dir = join(APP, 'src/content/seo', p.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${p.lang}.json`), JSON.stringify(p, null, 2) + '\n');
}
const tpl = (sheets['4_Property_page_template'] ?? []).map((r) => ({
  lang: r['Lang'], title: r['Title pattern'], meta: r['Meta pattern'], h1: r['H1 pattern'],
  imageAlt: r['Image alt pattern'], links: r['Links every property page must carry'],
}));
mkdirSync(join(APP, 'src/data'), { recursive: true });
writeFileSync(join(APP, 'src/data/seo-property-template.json'), JSON.stringify(tpl, null, 2) + '\n');
console.log(`OK ${pages.length} pages (${new Set(pages.map((p) => p.id)).size} page types), property template for ${tpl.length} languages`);
