// ═══════════════════════════════════════════════════════════════════════════
// COOKIE CONSENT + MEASUREMENT (Consent Mode v2, D-140, Q-054/Q-055).
//
// · Every page gets ONE small inline script at the top of <head>: consent defaults
//   (everything "denied") and, if the visitor already chose, the stored choice. It is the
//   only blocking script in <head> and runs in microseconds.
// · GTM loads ONLY when SITE_ENV=production AND the request comes to the brand's production
//   host — never on the preview (hp.rewize.app), so test traffic never reaches the reports.
//   The loader is async and runs after the defaults are set.
// · The banner (components/CookieConsent.astro) is a fixed overlay outside <main>: it takes
//   no space in the page (no layout shift) and never hides the content from crawlers.
// ═══════════════════════════════════════════════════════════════════════════
import { brand } from '../brand/index';
import type { Lang } from './i18n';
import { SITE_MODE, PROD_HOSTS, requestHost } from './seo';

export const CONSENT_COOKIE = brand.analytics.consentCookie;
/** Consent lasts 180 days, then the banner asks again. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

/** Measurement only on the real site: explicit production AND the production host. */
export function analyticsOn(request: Request, url: URL): boolean {
  return SITE_MODE === 'production'
    && !!brand.analytics.gtmId
    && PROD_HOSTS.includes(requestHost(request, url));
}

/**
 * The inline <head> script. Cookie value: "v1.a{0|1}.m{0|1}" (analytics, marketing).
 * With `gtmId` it also starts the async GTM loader — after the defaults, never before.
 */
export function consentHeadScript(gtmId: string | null): string {
  const defaults = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;`
    + `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`
    + `gtag('set','ads_data_redaction',true);`
    + `(function(){var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(!m)return;var v=decodeURIComponent(m[1]),a=v.indexOf('.a1')>-1,k=v.indexOf('.m1')>-1;`
    + `gtag('consent','update',{analytics_storage:a?'granted':'denied',ad_storage:k?'granted':'denied',ad_user_data:k?'granted':'denied',ad_personalization:k?'granted':'denied'});})();`;
  const gtm = gtmId
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`
    : '';
  return defaults + gtm;
}

/**
 * Banner texts in all 9 languages (#91 — until then the banner was English everywhere).
 * Greek speaks in the singular. The policy link opens the policy in the page language (#94).
 */
export type ConsentText = {
  title: string;
  body: string;
  privacy: string;
  accept: string;
  reject: string;
  settings: string;
  save: string;
  analytics: string;
  analyticsHint: string;
  marketing: string;
  marketingHint: string;
  necessary: string;
  necessaryHint: string;
  footerLink: string;
};
const TEXT: Record<Lang, ConsentText> = {
  en: {
    title: 'Cookies',
    body: 'We use cookies to see how the site is used and to show you relevant ads. Analytics and marketing cookies are set only if you agree.',
    privacy: 'Privacy policy',
    accept: 'Accept all',
    reject: 'Reject all',
    settings: 'Settings',
    save: 'Save choices',
    analytics: 'Analytics',
    analyticsHint: 'Anonymous visit statistics that help us improve the site.',
    marketing: 'Marketing',
    marketingHint: 'Ads that match your search, on other websites.',
    necessary: 'Necessary',
    necessaryHint: 'Needed for the site to work. Always on.',
    footerLink: 'Cookie settings',
  },
  el: {
    title: 'Cookies',
    body: 'Χρησιμοποιούμε cookies για να βλέπουμε πώς χρησιμοποιείται το site και για να σου δείχνουμε σχετικές διαφημίσεις. Τα cookies στατιστικών και διαφήμισης μπαίνουν μόνο αν συμφωνήσεις.',
    privacy: 'Πολιτική απορρήτου',
    accept: 'Αποδοχή όλων',
    reject: 'Απόρριψη όλων',
    settings: 'Ρυθμίσεις',
    save: 'Αποθήκευση επιλογών',
    analytics: 'Στατιστικά',
    analyticsHint: 'Ανώνυμα στατιστικά επισκέψεων που μας βοηθούν να βελτιώνουμε το site.',
    marketing: 'Διαφήμιση',
    marketingHint: 'Διαφημίσεις σχετικές με την αναζήτησή σου, σε άλλα sites.',
    necessary: 'Απαραίτητα',
    necessaryHint: 'Χρειάζονται για να λειτουργεί το site. Πάντα ενεργά.',
    footerLink: 'Ρυθμίσεις cookies',
  },
  bg: {
    title: 'Бисквитки',
    body: 'Използваме бисквитки, за да виждаме как се използва сайтът и да ви показваме подходящи реклами. Бисквитките за анализ и маркетинг се задават само ако се съгласите.',
    privacy: 'Политика за поверителност',
    accept: 'Приемам всички',
    reject: 'Отказвам всички',
    settings: 'Настройки',
    save: 'Запази избора',
    analytics: 'Анализ',
    analyticsHint: 'Анонимна статистика за посещенията, която ни помага да подобряваме сайта.',
    marketing: 'Маркетинг',
    marketingHint: 'Реклами, свързани с търсенето ви, на други сайтове.',
    necessary: 'Необходими',
    necessaryHint: 'Нужни са за работата на сайта. Винаги включени.',
    footerLink: 'Настройки за бисквитки',
  },
  sr: {
    title: 'Kolačići',
    body: 'Koristimo kolačiće da bismo videli kako se sajt koristi i da bismo vam prikazivali relevantne oglase. Kolačići za analitiku i marketing postavljaju se samo ako se složite.',
    privacy: 'Politika privatnosti',
    accept: 'Prihvati sve',
    reject: 'Odbij sve',
    settings: 'Podešavanja',
    save: 'Sačuvaj izbor',
    analytics: 'Analitika',
    analyticsHint: 'Anonimna statistika poseta koja nam pomaže da poboljšamo sajt.',
    marketing: 'Marketing',
    marketingHint: 'Oglasi u skladu sa vašom pretragom, na drugim sajtovima.',
    necessary: 'Neophodni',
    necessaryHint: 'Potrebni za rad sajta. Uvek uključeni.',
    footerLink: 'Podešavanja kolačića',
  },
  de: {
    title: 'Cookies',
    body: 'Wir verwenden Cookies, um zu sehen, wie die Website genutzt wird, und um Ihnen passende Werbung zu zeigen. Analyse- und Marketing-Cookies setzen wir nur mit Ihrer Zustimmung.',
    privacy: 'Datenschutzerklärung',
    accept: 'Alle akzeptieren',
    reject: 'Alle ablehnen',
    settings: 'Einstellungen',
    save: 'Auswahl speichern',
    analytics: 'Analyse',
    analyticsHint: 'Anonyme Besuchsstatistiken, mit denen wir die Website verbessern.',
    marketing: 'Marketing',
    marketingHint: 'Werbung passend zu Ihrer Suche, auf anderen Websites.',
    necessary: 'Notwendig',
    necessaryHint: 'Für den Betrieb der Website erforderlich. Immer aktiv.',
    footerLink: 'Cookie-Einstellungen',
  },
  ro: {
    title: 'Cookie-uri',
    body: 'Folosim cookie-uri pentru a vedea cum este folosit site-ul și pentru a vă arăta reclame relevante. Cookie-urile de analiză și marketing sunt setate doar dacă sunteți de acord.',
    privacy: 'Politica de confidențialitate',
    accept: 'Accept toate',
    reject: 'Refuz toate',
    settings: 'Setări',
    save: 'Salvează opțiunile',
    analytics: 'Analiză',
    analyticsHint: 'Statistici anonime despre vizite, care ne ajută să îmbunătățim site-ul.',
    marketing: 'Marketing',
    marketingHint: 'Reclame potrivite căutării dvs., pe alte site-uri.',
    necessary: 'Necesare',
    necessaryHint: 'Necesare pentru funcționarea site-ului. Mereu active.',
    footerLink: 'Setări cookie-uri',
  },
  tr: {
    title: 'Çerezler',
    body: 'Sitenin nasıl kullanıldığını görmek ve size ilgili reklamlar göstermek için çerez kullanıyoruz. Analiz ve pazarlama çerezleri yalnızca onay verirseniz kullanılır.',
    privacy: 'Gizlilik politikası',
    accept: 'Tümünü kabul et',
    reject: 'Tümünü reddet',
    settings: 'Ayarlar',
    save: 'Seçimleri kaydet',
    analytics: 'Analiz',
    analyticsHint: 'Siteyi geliştirmemize yardımcı olan anonim ziyaret istatistikleri.',
    marketing: 'Pazarlama',
    marketingHint: 'Aramanıza uygun reklamlar, başka sitelerde.',
    necessary: 'Gerekli',
    necessaryHint: 'Sitenin çalışması için gerekli. Her zaman açık.',
    footerLink: 'Çerez ayarları',
  },
  he: {
    title: 'עוגיות',
    body: 'אנו משתמשים בעוגיות כדי לראות איך משתמשים באתר וכדי להציג לכם פרסומות רלוונטיות. עוגיות סטטיסטיקה ושיווק נשמרות רק אם תסכימו.',
    privacy: 'מדיניות פרטיות',
    accept: 'לקבל הכול',
    reject: 'לדחות הכול',
    settings: 'הגדרות',
    save: 'לשמור את הבחירה',
    analytics: 'סטטיסטיקה',
    analyticsHint: 'סטטיסטיקת ביקורים אנונימית שעוזרת לנו לשפר את האתר.',
    marketing: 'שיווק',
    marketingHint: 'פרסומות שמתאימות לחיפוש שלכם, באתרים אחרים.',
    necessary: 'הכרחיות',
    necessaryHint: 'נדרשות כדי שהאתר יעבוד. תמיד פעילות.',
    footerLink: 'הגדרות עוגיות',
  },
  ru: {
    title: 'Файлы cookie',
    body: 'Мы используем файлы cookie, чтобы видеть, как используется сайт, и показывать вам подходящую рекламу. Аналитические и маркетинговые cookie устанавливаются только с вашего согласия.',
    privacy: 'Политика конфиденциальности',
    accept: 'Принять все',
    reject: 'Отклонить все',
    settings: 'Настройки',
    save: 'Сохранить выбор',
    analytics: 'Аналитика',
    analyticsHint: 'Анонимная статистика посещений, которая помогает нам улучшать сайт.',
    marketing: 'Маркетинг',
    marketingHint: 'Реклама по вашему поиску на других сайтах.',
    necessary: 'Необходимые',
    necessaryHint: 'Нужны для работы сайта. Всегда включены.',
    footerLink: 'Настройки cookie',
  },
};
export function consentText(lang: string): ConsentText {
  return TEXT[lang as Lang] ?? TEXT.en;
}
