// ═══════════════════════════════════════════════════════════════════════════
// ΠΟΙΟΣ HOST ΕΠΙΤΡΕΠΕΤΑΙ ΝΑ ΕΥΡΕΤΗΡΙΑΣΤΕΙ — και τίποτα άλλο.
//
// Το site τρέχει σήμερα σε ΤΕΣΣΕΡΙΣ διευθύνσεις ταυτόχρονα:
//   · localhost:4330            (dev)
//   · localhost:4331            (η μόνιμη υπηρεσία)
//   · 100.65.32.39:4331         (Tailscale — έτσι το βλέπει ο George από το κινητό)
//   · 192.168.1.122:4331        (τοπικό δίκτυο)
// Καμία τους δεν πρέπει να μπει ποτέ στη Google. Ο έλεγχος γίνεται εδώ, σε ΕΝΑ
// σημείο, και τον διαβάζουν και τα τρία μέρη που έχουν λόγο: `<meta robots>`,
// `robots.txt`, `sitemap.xml`.
//
// 🔑 Ο διακόπτης ανοίγει ΜΟΝΟΣ ΤΟΥ στο DNS cutover: μόλις το
//    halkidikiproperties.com δείξει εδώ, ο host ταιριάζει και το site γίνεται
//    ευρετηριάσιμο. Καμία μεταβλητή να θυμηθεί κανείς, κανένα «ξέχασα το noindex».
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Οι δύο μορφές του παραγωγικού domain. Το canonical δείχνει ΠΑΝΤΑ στο www
 * (έτσι το δηλώνει και το σημερινό robots.txt με `Host:`), αλλά ο έλεγχος
 * δέχεται και το γυμνό — αλλιώς μια απευθείας επίσκεψη χωρίς www θα εξέπεμπε
 * noindex πάνω σε παραγωγική σελίδα.
 *
 * ⚠️ Το halkidikiproperties.**gr** ΔΕΝ είναι εδώ σκόπιμα: αν κάποτε σερβίρει το
 *    ίδιο site, θέλει δικό του canonical (αλλιώς δύο domains με ίδιο περιεχόμενο).
 */
export const PROD_HOSTS = ['www.halkidikiproperties.com', 'halkidikiproperties.com'] as const;

/**
 * Ο host του αιτήματος όπως τον βλέπει ο επισκέπτης.
 * Πίσω από Cloudflare/nginx το `url.hostname` είναι ο εσωτερικός host, όχι ο
 * δημόσιος — γι' αυτό προηγείται το `x-forwarded-host`.
 */
export function requestHost(request: Request, url: URL): string {
  const fwd = request.headers.get('x-forwarded-host');
  const raw = (fwd?.split(',')[0] ?? url.host).trim().toLowerCase();
  return raw.replace(/:\d+$/, ''); // χωρίς θύρα
}

/** Είμαστε στο πραγματικό site; Τα πάντα κρέμονται από αυτό. */
export function isProd(request: Request, url: URL): boolean {
  return (PROD_HOSTS as readonly string[]).includes(requestHost(request, url));
}

/**
 * Η ρίζα των απόλυτων URL (canonical, hreflang, sitemap).
 * Σταθερή και σε μη-παραγωγικό host: όταν δείχνουμε στον George την προεπισκόπηση
 * θέλουμε να βλέπει τα ΠΡΑΓΜΑΤΙΚΑ URL που θα βγουν live, όχι διευθύνσεις Tailscale.
 */
export const ORIGIN = (import.meta.env.SITE ?? 'https://www.halkidikiproperties.com').replace(/\/$/, '');

/**
 * Πότε χτίστηκε αυτή η έκδοση — μπαίνει στο `<lastmod>` του sitemap.
 * Ορίζεται στο astro.config.mjs τη στιγμή του build (ΟΧΙ σε κάθε restart της
 * υπηρεσίας: το KeepAlive θα την «φρεσκάριζε» ψευδώς κάθε φορά που πέφτει).
 * ⏭️ Φ2: κάθε ακίνητο/άρθρο φέρνει το δικό του `updated_at` από το EALIDA.
 */
declare const __BUILD_TIME__: string;
export const BUILD_TIME: string =
  typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : new Date().toISOString();

/** Μόνο η ημερομηνία — το `<lastmod>` δεν κερδίζει τίποτα από ώρα/λεπτά. */
export const BUILD_DAY = BUILD_TIME.slice(0, 10);
