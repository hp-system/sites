// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY PAGE SEO — George's spec, sheet 4 «Property_page_template» (05/11/2026), plan portion 5.
// Sergei 2026-11-11: «Таблица Джорджа» replaces the old-site titles (#88).
//
//   title  «{Type} for sale in {Municipality}, Halkidiki – {sqm} m²»
//   meta   «{Type} of {sqm} m² for sale in {Municipality}, Halkidiki, Greece. {Feature 1}, {feature 2}.
//           Price €{price}. See photos and book a viewing.»
//   H1     «{Type} for sale in {Municipality}, Halkidiki»
//   alt    «{Type} in {Municipality}, Halkidiki – {room/view}»   (the cover photo)
//   links  → type page · → municipality page · → P02 · → P03 (P01 in sr/bg/ro) · → 4 similar properties
//
// The patterns are read from `src/data/seo-property-template.json` (imported from the spec), so a
// change of the sheet changes the pages. Each language names its placeholders in its own words; the
// table below says which value each one takes. A placeholder written lower-case takes its value
// lower-case (Turkish «{tip}», English «{feature 2}»), except in German, where nouns keep their capital.
//
// Grammar the patterns cannot carry (Sergei 2026-11-11, «падежи»): Greek «στην {Δήμος}» and «στον Δήμο
// {Δήμος}», Russian «в {Муниципалитет}» need the place in its own case; the phrases are replaced whole.
// A value that is missing removes its part (no area: no «– … m²»; a hidden price: «Price on request.»).
// ═══════════════════════════════════════════════════════════════════════════
import tpl from '../data/seo-property-template.json';
import type { Lang } from './i18n';

type Role = 'type' | 'sqm' | 'muni' | 'f1' | 'f2' | 'price' | 'view';
const ROLE: Record<Lang, Record<string, Role>> = {
  el: { 'Τύπος': 'type', 'τ.μ.': 'sqm', 'Δήμος': 'muni', 'Χαρακτηριστικό 1': 'f1', 'Χαρακτηριστικό 2': 'f2', 'τιμή': 'price', 'χώρος/θέα': 'view' },
  en: { Type: 'type', sqm: 'sqm', Municipality: 'muni', 'Feature 1': 'f1', 'feature 2': 'f2', price: 'price', 'room/view': 'view' },
  de: { Typ: 'type', qm: 'sqm', Gemeinde: 'muni', 'Merkmal 1': 'f1', 'Merkmal 2': 'f2', Preis: 'price', 'Raum/Aussicht': 'view' },
  sr: { Tip: 'type', m2: 'sqm', 'Opština': 'muni', 'Karakteristika 1': 'f1', 'karakteristika 2': 'f2', cena: 'price', 'prostorija/pogled': 'view' },
  bg: { 'Тип': 'type', 'м2': 'sqm', 'Община': 'muni', 'Характеристика 1': 'f1', 'характеристика 2': 'f2', 'цена': 'price', 'помещение/изглед': 'view' },
  ro: { Tip: 'type', mp: 'sqm', Municipiu: 'muni', 'Caracteristică 1': 'f1', 'caracteristică 2': 'f2', 'preț': 'price', 'cameră/priveliște': 'view' },
  ru: { 'Тип': 'type', 'м2': 'sqm', 'Муниципалитет': 'muni', 'Особенность 1': 'f1', 'особенность 2': 'f2', 'цена': 'price', 'комната/вид': 'view' },
  tr: { tip: 'type', m2: 'sqm', Belediye: 'muni', 'Özellik 1': 'f1', 'özellik 2': 'f2', fiyat: 'price', 'oda/manzara': 'view' },
  he: { 'סוג': 'type', 'מ"ר': 'sqm', 'עירייה': 'muni', 'מאפיין 1': 'f1', 'מאפיין 2': 'f2', 'מחיר': 'price', 'חדר/נוף': 'view' },
};

/** Greek: «στην Κασσάνδρα» (place) and «Δήμο Κασσάνδρας» (genitive); Russian: «в Кассандре». Keys: facet keys. */
const EL_IN: Record<string, string> = { kassandra: 'στην Κασσάνδρα', sithonia: 'στη Σιθωνία', propontida: 'στη Νέα Προποντίδα', aristotelis: 'στον Δήμο Αριστοτέλη', polygyros: 'στον Πολύγυρο' };
const EL_GEN: Record<string, string> = { kassandra: 'Κασσάνδρας', sithonia: 'Σιθωνίας', propontida: 'Νέας Προποντίδας', aristotelis: 'Αριστοτέλη', polygyros: 'Πολυγύρου' };
const RU_IN: Record<string, string> = { kassandra: 'в Кассандре', sithonia: 'в Ситонии', propontida: 'в Неа Пропонтиде', aristotelis: 'в Аристотелисе', polygyros: 'в Полигиросе' };

export type PropertySeoInput = {
  lang: Lang;
  type: string;           // the type in the page language («Field», «Μονοκατοικία»)
  muniKey?: string;       // the facet key of the municipality (kassandra, sithonia, …)
  muni: string;           // the municipality in the page language
  sqm: string;            // already formatted for the language («8,000»), '' when unknown
  features: string[];     // up to two, in the page language
  price: string;          // formatted number («880,000»), '' when the price is not shown
  priceRequest: string;   // «Price on request» in the page language
  view?: string;          // for the alt: the room or view of the photo, '' when unknown
};

const lowerFirst = (s: string, lang: Lang) => (s ? s.charAt(0).toLocaleLowerCase(lang) + s.slice(1) : s);

function fill(pattern: string, x: PropertySeoInput): string {
  let s = pattern;
  const roles = ROLE[x.lang];
  const ph = (role: Role) => Object.entries(roles).find(([, r]) => r === role)?.[0];
  const at = (role: Role) => `{${ph(role)}}`;
  // phrases with a case the pattern cannot carry
  if (x.lang === 'el' && x.muniKey && EL_IN[x.muniKey]) {
    s = s.replaceAll(`στην ${at('muni')}`, EL_IN[x.muniKey]).replaceAll(`στον Δήμο ${at('muni')}`, `στον Δήμο ${EL_GEN[x.muniKey]}`);
  }
  if (x.lang === 'ru' && x.muniKey && RU_IN[x.muniKey]) s = s.replaceAll(`в ${at('muni')}`, RU_IN[x.muniKey]);
  // missing values remove their part
  if (!x.sqm) s = s.replace(new RegExp(`\\s*(?:[–,]\\s*)?(?:of |mit |od |de |של )?${esc(at('sqm'))}\\s*\\S+`, 'g'), '');
  if (!x.features[0]) s = s.replace(new RegExp(`\\s*${esc(at('f1'))},\\s*${esc(at('f2'))}\\.`), '');
  else if (!x.features[1]) s = s.replace(new RegExp(`,\\s*${esc(at('f2'))}`), '');
  if (!x.price) s = s.replace(new RegExp(`[^.]*€${esc(at('price'))}\\.`), ` ${x.priceRequest}.`);
  if (!x.view) s = s.replace(new RegExp(`\\s*–\\s*${esc(at('view'))}`), '');
  const val: Record<Role, string> = { type: x.type, sqm: x.sqm, muni: x.muni, f1: x.features[0] ?? '', f2: x.features[1] ?? '', price: x.price, view: x.view ?? '' };
  s = s.replace(/\{([^}]+)\}/g, (m, name: string) => {
    const role = roles[name];
    if (!role) return m;
    const v = val[role];
    const lower = name.charAt(0) !== name.charAt(0).toLocaleUpperCase(x.lang) && x.lang !== 'de';
    return lower ? lowerFirst(v, x.lang) : v;
  });
  return s.replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}
function esc(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** «N bedrooms» in the page language. Russian and Serbian have a third form for 5 and more («6 спален»,
 *  «6 spavaćih soba»), which the one-or-many strings of the list cannot carry. */
const BEDS_MANY: Partial<Record<Lang, string>> = { ru: '{n} спален', sr: '{n} spavaćih soba' };
export function bedsText(n: number, lang: Lang, one: string, few: string): string {
  const form = new Intl.PluralRules(lang).select(n);
  if (n === 1 || (form === 'one' && BEDS_MANY[lang])) return one.replace(/1/, String(n));   // ru/sr: 21 спальня
  const many = BEDS_MANY[lang];
  return (many && (form === 'many' || (lang === 'sr' && form === 'other')) ? many : few).replace('{n}', String(n));
}

export type PropertySeo = { title: string; meta: string; h1: string; alt: string };

/** The four texts of a property page in its language, from George's patterns. */
export function propertySeo(x: PropertySeoInput): PropertySeo {
  const row = (tpl as { lang: string; title: string; meta: string; h1: string; imageAlt: string }[]).find((r) => r.lang === x.lang)
    ?? (tpl as { lang: string; title: string; meta: string; h1: string; imageAlt: string }[]).find((r) => r.lang === 'en')!;
  // the meta stays within 155 characters (spec rule 7) by dropping the features from the end, never the price
  let meta = fill(row.meta, x);
  for (let n = x.features.length - 1; n >= 0 && [...meta].length > 155; n--) meta = fill(row.meta, { ...x, features: x.features.slice(0, n) });
  return { title: fill(row.title, x), meta, h1: fill(row.h1, x), alt: fill(row.imageAlt, x) };
}
