// ═══════════════════════════════════════════════════════════════════════════
// THE HOME HERO IS A MESSAGE SLOT (Sergei with George, 2026-11-03).
//
// The first screen is where the company says something to the ~2,000 visitors a day:
// a season, a month, a holiday, a thought (Aristotle was born in Stagira, Halkidiki),
// a call to act. Never properties — they are shown right below.
//
// How it works:
//   · every message has dates (Athens calendar days, both ends included); the first one
//     whose dates cover today and that has a title in the page language is shown;
//   · outside every date range the DEFAULT message is shown (today's photo and texts);
//   · a message with `draft: true` is never shown by date — only in a preview, with
//     `?hero=<id>` on a non-production site (hp.rewize.app, localhost);
//   · the H1 never changes (SEO): it stays «Property in Greece — Halkidiki» and becomes a
//     small line above the message while a message is on;
//   · all 9 languages: a language without a title skips the message (the default shows).
//
// Looks: `photo` (a picture, as today), `video` (a muted loop, MP4 ≤ 3 MB, with a poster
// picture: phones on data saver and visitors with reduced motion get the poster), `plain`
// (words on the dark ground, no picture).
//
// ✏️ To add a message: copy one below, give it a new `id`, dates and texts in 9 languages,
//    open /en?hero=<id> locally to check it, then ship it like any change.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from './i18n';
import { listUrl } from './i18n';
import { HERO_SHOTS, type HeroShot } from './hero';

type L9 = Partial<Record<Lang, string>>;

export type HeroMessage = {
  id: string;
  /** First and last day, YYYY-MM-DD, Athens time. Without dates the message only previews. */
  from?: string;
  to?: string;
  draft?: boolean;
  look: 'photo' | 'video' | 'plain';
  /** `photo` / `video` poster: a scenic picture (not a property: those are shown below). */
  shot?: HeroShot;
  /** `video`: the MP4 file and its poster picture (the poster is the first frame). */
  video?: { mp4: string; poster: string };
  eyebrow?: L9;
  title: L9;
  text?: L9;
  /** One button. `href(lang)` builds the link in the page language. */
  cta?: { label: L9; href: (lang: Lang) => string };
};

/** The message shown when no other one is on: today's hero, unchanged. */
export const DEFAULT_ID = 'default';

export const HERO_MESSAGES: HeroMessage[] = [
  // ── Example 1 (draft, for George): Aristotle — words on the dark ground ──
  {
    id: 'aristotle',
    draft: true,
    look: 'plain',
    eyebrow: {
      en: 'Stagira, Halkidiki · 384 BC', el: 'Στάγειρα, Χαλκιδική · 384 π.Χ.', de: 'Stagira, Chalkidiki · 384 v. Chr.',
      he: 'סטגירה, חלקידיקי · 384 לפנה״ס', ro: 'Stagira, Halkidiki · 384 î.Hr.', ru: 'Стагира, Халкидики · 384 г. до н. э.',
      sr: 'Stagira, Halkidiki · 384. p. n. e.', tr: 'Stagira, Halkidiki · MÖ 384', bg: 'Стагира, Халкидики · 384 г. пр. Хр.',
    },
    title: {
      en: 'Aristotle was born here.', el: 'Εδώ γεννήθηκε ο Αριστοτέλης.', de: 'Hier wurde Aristoteles geboren.',
      he: 'כאן נולד אריסטו.', ro: 'Aici s-a născut Aristotel.', ru: 'Здесь родился Аристотель.',
      sr: 'Ovde je rođen Aristotel.', tr: 'Aristoteles burada doğdu.', bg: 'Тук е роден Аристотел.',
    },
    text: {
      en: 'Twenty-four centuries later, the same hills, the same sea.',
      el: 'Είκοσι τέσσερις αιώνες μετά, οι ίδιοι λόφοι, η ίδια θάλασσα.',
      de: 'Vierundzwanzig Jahrhunderte später: dieselben Hügel, dasselbe Meer.',
      he: 'עשרים וארבע מאות שנה אחר כך, אותן גבעות, אותו ים.',
      ro: 'Douăzeci și patru de secole mai târziu, aceleași dealuri, aceeași mare.',
      ru: 'Двадцать четыре века спустя — те же холмы, то же море.',
      sr: 'Dvadeset četiri veka kasnije, ista brda, isto more.',
      tr: 'Yirmi dört yüzyıl sonra, aynı tepeler, aynı deniz.',
      bg: 'Двадесет и четири века по-късно — същите хълмове, същото море.',
    },
    cta: {
      label: {
        en: 'Properties in Aristotelis', el: 'Ακίνητα στον Αριστοτέλη', de: 'Immobilien in Aristotelis',
        he: 'נכסים באריסטוטליס', ro: 'Proprietăți în Aristotelis', ru: 'Недвижимость в Аристотелисе',
        sr: 'Nekretnine u Aristotelisu', tr: 'Aristotelis’te gayrimenkuller', bg: 'Имоти в Аристотелис',
      },
      href: (lang) => `${listUrl(lang)}?muni=${encodeURIComponent('Αριστοτέλης')}`,
    },
  },
  // ── Example 2 (draft, for George): a season — the photo, a call to act ──
  {
    id: 'summer',
    draft: true,
    look: 'photo',
    shot: HERO_SHOTS[0],
    eyebrow: {
      en: 'Summer 2027', el: 'Καλοκαίρι 2027', de: 'Sommer 2027', he: 'קיץ 2027', ro: 'Vara 2027',
      ru: 'Лето 2027', sr: 'Leto 2027', tr: 'Yaz 2027', bg: 'Лято 2027',
    },
    title: {
      en: 'Next summer starts here.', el: 'Το επόμενο καλοκαίρι ξεκινά εδώ.', de: 'Der nächste Sommer beginnt hier.',
      he: 'הקיץ הבא מתחיל כאן.', ro: 'Vara viitoare începe aici.', ru: 'Следующее лето начинается здесь.',
      sr: 'Sledeće leto počinje ovde.', tr: 'Gelecek yaz burada başlıyor.', bg: 'Следващото лято започва тук.',
    },
    text: {
      en: 'Homes a short walk from the sea, chosen one by one.',
      el: 'Σπίτια λίγα βήματα από τη θάλασσα, διαλεγμένα ένα ένα.',
      de: 'Häuser wenige Schritte vom Meer, eines nach dem anderen ausgewählt.',
      he: 'בתים במרחק הליכה קצר מהים, שנבחרו אחד אחד.',
      ro: 'Case la câțiva pași de mare, alese una câte una.',
      ru: 'Дома в нескольких шагах от моря, отобранные по одному.',
      sr: 'Kuće na nekoliko koraka od mora, birane jedna po jedna.',
      tr: 'Denize birkaç adım mesafede, tek tek seçilmiş evler.',
      bg: 'Къщи на няколко крачки от морето, подбрани една по една.',
    },
    cta: {
      label: {
        en: 'Walk to the sea', el: 'Με τα πόδια στη θάλασσα', de: 'Zu Fuß zum Meer', he: 'הליכה לים',
        ro: 'Pe jos până la mare', ru: 'Пешком до моря', sr: 'Pešice do mora', tr: 'Denize yürüme mesafesi', bg: 'Пеша до морето',
      },
      href: (lang) => `${listUrl(lang)}?sea=walking`,
    },
  },
];

/** Today's date in Athens as YYYY-MM-DD (the server may run in another zone). */
function athensDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * The message for this page view, or null for the default hero.
 * `preview` is the `?hero=` value, honoured only off production.
 */
export function heroMessage(lang: Lang, now = new Date(), preview?: string | null): HeroMessage | null {
  const has = (m: HeroMessage) => !!m.title[lang];
  if (preview) {
    if (preview === DEFAULT_ID) return null;
    const m = HERO_MESSAGES.find((x) => x.id === preview);
    if (m && has(m)) return m;
  }
  const day = athensDay(now);
  return HERO_MESSAGES.find((m) => !m.draft && m.from && m.to && m.from <= day && day <= m.to && has(m)) ?? null;
}
