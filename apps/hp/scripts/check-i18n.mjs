#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ΦΥΛΑΚΑΣ ΓΛΩΣΣΩΝ — σταματά το χτίσιμο πριν βγει γλώσσα από τη Google.
//
// 🔴 ΤΙ ΠΡΟΣΤΑΤΕΥΕΙ, ΚΑΙ ΓΙΑΤΙ ΕΙΝΑΙ ΧΕΙΡΟΤΕΡΟ ΑΠ' ΟΣΟ ΦΑΙΝΕΤΑΙ
//
//   const KEYS = Object.keys(T.el);
//   export const PUBLISHED = LANGS.filter(l => KEYS.every(k => T[l]?.[k]));
//
// Η βάση ορίζεται από τα ΕΛΛΗΝΙΚΑ και ΜΕΓΑΛΩΝΕΙ. Άρα δεν είναι «μια κενή
// μετάφραση βγάζει μία γλώσσα». Είναι:
//
//     προσθέτεις ΕΝΑ ελληνικό κείμενο
//       → η βάση γίνεται 223
//       → καμία από τις άλλες 8 δεν το έχει
//       → ΚΑΙ ΟΙ 8 φεύγουν από τα hreflang, την ίδια στιγμή
//
// Ένα κείμενο, οκτώ γλώσσες εκτός Google. Χωρίς σφάλμα, χωρίς ειδοποίηση, και
// ορατό μόνο εβδομάδες αργότερα στα αποτελέσματα αναζήτησης.
// Το περιθώριο είναι ΜΗΔΕΝ — δεν υπάρχει buffer να το απορροφήσει.
//
// ⚠️ ΓΙΑΤΙ ΕΛΕΓΧΟΣ ΧΤΙΣΙΜΑΤΟΣ ΚΑΙ ΟΧΙ ΤΥΠΟΣ TypeScript
//    Ο τύπος θα ήταν ισχυρότερος, αλλά απαιτεί αναδιάρθρωση 2.000 γραμμών
//    λεξικού (τα ελληνικά να ορίζουν το σύνολο κλειδιών με `as const`).
//    Εδώ η ζημιά δεν είναι «λάθος τύπος» — είναι «σιωπηλή δημοσίευση». Το
//    σταμάτημα του χτισίματος τη σταματά εξίσου καλά, σήμερα, χωρίς ρίσκο.
//    ⏭️ Η αναδιάρθρωση παραμένει το σωστό επόμενο βήμα.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';

const FILE = new URL('../src/lib/i18n.ts', import.meta.url);
const src = readFileSync(FILE, 'utf8');

/** Διαβάζει ένα μπλοκ λεξικού και επιστρέφει {γλώσσα → Set(κλειδιά)}. */
function block(decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const end = src.indexOf('\n};', i);
  const body = src.slice(i, end);
  const marks = [];
  const re = /^\s{2}([a-z]{2}):\s*\{/gm;
  let m;
  while ((m = re.exec(body))) marks.push([m[1], m.index]);
  const out = {};
  marks.forEach(([lang, start], n) => {
    const stop = n + 1 < marks.length ? marks[n + 1][1] : body.length;
    out[lang] = new Set(
      [...body.slice(start, stop).matchAll(/'([a-z][a-zA-Z0-9_.]*)':/g)].map((x) => x[1]),
    );
  });
  return out;
}

const T = block('export const T: Record<Lang, Dict> = {');
const U = block('const U: Record<Lang, Dict> = {');

if (!T) {
  // Αν αλλάξει η δομή του αρχείου, ΔΕΝ περνάμε σιωπηλά — ο φύλακας που δεν
  // μπορεί να διαβάσει είναι χειρότερος από τον φύλακα που δεν υπάρχει.
  console.error('🔴 check-i18n: δεν βρήκα το λεξικό `T` στο src/lib/i18n.ts.');
  console.error('   Άλλαξε η δομή του αρχείου; Ο έλεγχος ΔΕΝ έτρεξε.');
  process.exit(1);
}

// Το `U` συγχωνεύεται στο `T` πριν υπολογιστούν τα κλειδιά (i18n.ts) — άρα η
// πραγματική βάση είναι η ένωση των δύο.
const merged = {};
for (const lang of Object.keys(T)) {
  merged[lang] = new Set([...(T[lang] ?? []), ...((U && U[lang]) ?? [])]);
}

const base = merged.el;
if (!base) {
  console.error('🔴 check-i18n: λείπει η βασική γλώσσα (el).');
  process.exit(1);
}

const broken = [];
for (const [lang, keys] of Object.entries(merged)) {
  const missing = [...base].filter((k) => !keys.has(k));
  if (missing.length) broken.push({ lang, missing });
}

if (!broken.length) {
  console.log(`✅ i18n: ${Object.keys(merged).length} γλώσσες × ${base.size} κλειδιά — καμία δεν λείπει.`);
  process.exit(0);
}

console.error('\n🔴 ΤΟ ΧΤΙΣΙΜΟ ΣΤΑΜΑΤΗΣΕ — ΘΑ ΕΒΓΑΙΝΑΝ ΓΛΩΣΣΕΣ ΑΠΟ ΤΗ GOOGLE\n');
console.error(`   Βάση (ελληνικά): ${base.size} κλειδιά`);
for (const { lang, missing } of broken) {
  console.error(`\n   ${lang.toUpperCase()} — λείπουν ${missing.length}:`);
  for (const k of missing.slice(0, 12)) console.error(`     · ${k}`);
  if (missing.length > 12) console.error(`     … και άλλα ${missing.length - 12}`);
}
console.error(
  '\n   Αυτές οι γλώσσες θα έφευγαν από τα hreflang ΧΩΡΙΣ κανένα σφάλμα.\n' +
  '   Συμπλήρωσέ τες στο src/lib/i18n.ts και ξαναδοκίμασε.\n',
);
process.exit(1);
