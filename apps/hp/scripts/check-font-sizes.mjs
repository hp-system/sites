// Type canon guard (Sergei 2026-11-08, page «HP Type Canon»): every font-size in the HP sources
// must be one of the eight canon tokens (`var(--fs-s-1)` … `var(--fs-s5)`, defined in
// src/styles/tokens.css). Allowed besides: `inherit`, `100%`, `1em`, print sizes in `pt`, and a
// side case marked `canon-exception` on the same line (a word sized to its neighbours, in em).
// Exit 1 lists every offending line. The internal SEO skeleton pages are not the site and are skipped.
// Rejected: a lint warning — three months of per-block sizes (48 values) came from exactly that.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SKIP = [`pages${sep}skeleton`];
const OK = /^(var\(--fs-s(-1|[0-5])\)|inherit|100%|1em|[0-9.]+pt)\s*(!important)?$/;

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(astro|css)$/.test(n)) files.push(p);
  }
};
walk(ROOT);

const bad = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  if (SKIP.some((s) => rel.startsWith(s))) continue;
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('canon-exception')) return;
    for (const m of line.matchAll(/font-size\s*:\s*([^;}"]+)/g)) {
      const v = m[1].trim();
      if (!OK.test(v)) bad.push(`${rel}:${i + 1}  font-size: ${v}`);
    }
  });
}

if (bad.length) {
  console.error(`🔴 ${bad.length} font size(s) outside the type canon — use var(--fs-s-1) … var(--fs-s5):`);
  for (const b of bad) console.error('  ' + b);
  process.exit(1);
}
console.log(`type canon: OK (${files.length} files)`);
