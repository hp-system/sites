// ═══════════════════════════════════════════════════════════════════════════
// BRAND — every fact that makes this site "Halkidiki Properties" and not another
// agency. The template reads these values; it never writes a company literal.
// A new brand (Rewize, a white-label agency) = a new file like `hp.ts`, no code change.
//
// Rule: only values the code actually uses go here. Texts and page content are NOT
// brand config — they belong to the CMS (template step T2).
// ⏭️ This type can move to packages/kit when a second app consumes it.
// ═══════════════════════════════════════════════════════════════════════════

export type Brand = {
  /** The tenant/site key the CRM knows this site by (`/site/content?site=…`). */
  key: string;
  /** The public brand name — logo text, breadcrumbs, og:site_name, schema seller. */
  name: string;
  /** Company facts used when the CMS field is empty (see lib/company.ts). */
  company: {
    /** Name printed in the footer © line and the schema `RealEstateAgent.name`. */
    legalName: string;
    gemi: string;
    foundedYear: number;
  };
  address: { street: string; city: string; postalCode: string; region: string; country: string };
  /** The address in Latin letters, for the English pages (contact page). */
  addressLatin?: { street: string; city: string; country: string };
  contact: {
    /** What the visitor reads — same in header, menu and footer. */
    phoneText: string;
    /** What the phone dials. */
    phoneHref: string;
    /** schema.org form of the landline. */
    phoneE164: string;
    /** Mobile for WhatsApp and Viber, as the visitor reads it. */
    mobileText: string;
    /** The same mobile in E.164 (wa.me / viber links). */
    whatsappE164: string;
    email: string;
  };
  web: {
    /** Canonical production origin (absolute URLs, sitemap, robots `Host:`). */
    origin: string;
    /** Hosts on which the site counts as production when SITE_ENV is unset. */
    prodHosts: readonly string[];
    /** Where property and hero images are served from. */
    mediaOrigin: string;
  };
  /** Market facts for structured data and price formatting. */
  market: { currency: string; areaServed: string };
  /** Logo colours (the CSS tokens in styles/tokens.css carry the same values). */
  colors: { primary: string; secondary: string };
  geography: {
    /** Folded spelling → canonical municipality key (Greek nominative). See lib/gate.ts. */
    municipalityAliases: Record<string, string>;
  };
  /** Measurement. GTM loads only on the production host with SITE_ENV=production (lib/consent.ts). */
  analytics: {
    /** Google Tag Manager container, or null for a brand without measurement. */
    gtmId: string | null;
    /** First-party cookie that stores the visitor's consent choice. */
    consentCookie: string;
    /** Privacy policy path, linked from the consent banner (language prefix added). */
    privacyPath: string;
  };
  /**
   * The person who takes editorial responsibility for the articles. EU AI Act art. 50(4):
   * text on matters of public interest made with AI needs a label UNLESS a human reviews it
   * and holds editorial responsibility — this name is that responsibility, shown on every article.
   */
  editorial: { name: string; role: string };
  /** Property id → rental page, for properties that are also let (button «rent it»). */
  rentals: Record<string, string>;
};
