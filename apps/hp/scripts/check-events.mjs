#!/usr/bin/env node
// Event-name guard (B-11, traps T-K17) — part of `pnpm build`.
// `lib/track.ts` EVENTS is the closed list of analytics event names. This check reads every
// .astro/.ts file under src/ and fails the build when
//   · a `data-ev="name"` (or a string literal inside `data-ev={…}`) is not in EVENTS,
//   · a `data-ev={…}` expression has nothing the check can verify (no literal, no `EVENTS.KEY`,
//     no local const built from `EVENTS.KEY`) — a computed name escapes the closed list,
//   · an `EVENTS.KEY` reference does not exist,
//   · a name in EVENTS is used nowhere, or appears twice.
// Run with Node type stripping (package.json passes the flag) to import track.ts.
import { register } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

register(new URL('./ts-hooks.mjs', import.meta.url));
const { EVENTS } = await import(new URL('../src/lib/track.ts', import.meta.url));
const SRC = fileURLToPath(new URL('../src', import.meta.url));
const names = new Set(Object.values(EVENTS));
const used = new Set();
const problems = [];

const walk = (d) => readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

for (const file of walk(SRC).filter((f) => /\.(astro|ts)$/.test(f))) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(SRC, file).replace(/\\/g, '/');
  const line = (i) => src.slice(0, i).split('\n').length;
  const take = (name, at) => (names.has(name) ? used.add(name) : problems.push(`${rel}:${line(at)} "${name}" is not in EVENTS`));
  const takeKey = (key, at) => (key in EVENTS ? used.add(EVENTS[key]) : problems.push(`${rel}:${line(at)} EVENTS.${key} does not exist`));

  for (const m of src.matchAll(/data-ev="([^"]*)"/g)) take(m[1], m.index);
  for (const m of src.matchAll(/data-ev=\{([^}]*)\}/g)) {
    const expr = m[1];
    const lits = [...expr.matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]);
    const keys = [...expr.matchAll(/EVENTS\.([A-Z0-9_]+)/g)].map((x) => x[1]);
    // A local lookup like `CTA_EV[page.cta.to]`: verify the const it reads from.
    const ref = /^\s*([A-Za-z_]\w*)\s*\[/.exec(expr)?.[1];
    const table = ref ? new RegExp(`const ${ref}\\s*=\\s*\\{([^}]*)\\}`).exec(src)?.[1] : null;
    const tableKeys = table ? [...table.matchAll(/EVENTS\.([A-Z0-9_]+)/g)].map((x) => x[1]) : [];
    if (!lits.length && !keys.length && !tableKeys.length) {
      problems.push(`${rel}:${line(m.index)} data-ev={${expr.trim()}} cannot be checked — use EVENTS.KEY or literals`);
    }
    for (const l of lits) take(l, m.index);
    for (const k of [...keys, ...tableKeys]) takeKey(k, m.index);
  }
}

const values = Object.values(EVENTS);
for (const v of values.filter((v, i) => values.indexOf(v) !== i)) problems.push(`EVENTS: "${v}" appears twice`);
for (const v of names) if (!used.has(v)) problems.push(`EVENTS: "${v}" is used nowhere — place it or move it to RESERVED`);

if (!problems.length) {
  console.log(`✅ events: ${names.size} names in EVENTS, all placed, every data-ev in the list.`);
  process.exit(0);
}
console.error('\n🔴 BUILD STOPPED — analytics event names (B-11)\n');
for (const p of problems) console.error(`   ${p}`);
console.error('\n   lib/track.ts EVENTS is the closed list: add the name there, or use an existing one.\n');
process.exit(1);
