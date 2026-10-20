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

/** Banner texts. English first (build rule 20/10); other languages are added at the end. */
const TEXT = {
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
} as const;
export type ConsentText = (typeof TEXT)['en'];
export function consentText(lang: string): ConsentText {
  return (TEXT as Record<string, ConsentText>)[lang] ?? TEXT.en;
}
