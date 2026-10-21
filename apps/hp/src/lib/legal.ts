// Where the privacy policy lives in each language (#94, George 21/10/2026). el/de/sr/bg keep the
// old site's URLs (no redirects needed); the others are new. Every privacy link on the site —
// cookie banner, forms, call-me panels, login — goes through `privacyPath`, so a visitor reads
// the policy in the language of the page. scripts/test-legal-pages.mjs checks each path serves.
import type { Lang } from './i18n';

export const PRIVACY_PATH: Record<Lang, string> = {
  en: '/en/privacy-policy',
  el: '/πολιτικη-απορρητου',
  de: '/de/datenschutzpolitik',
  sr: '/sr/pravila-o-privatnosti',
  bg: '/bg/политика-за-поверителност',
  ro: '/ro/politica-de-confidentialitate',
  tr: '/tr/gizlilik-politikasi',
  he: '/he/mediniyut-pratiyut',
  ru: '/ru/politika-konfidencialnosti',
};

/** The policy in the page language, percent-encoded so it is safe in any href. */
export const privacyPath = (lang: Lang) => encodeURI(PRIVACY_PATH[lang] ?? PRIVACY_PATH.en);
