// ═══════════════════════════════════════════════════════════════════════════
// robots.txt — δυναμικό, γιατί πρέπει να λέει ΔΙΑΦΟΡΕΤΙΚΑ πράγματα ανά host.
//
// Σε μη-παραγωγικό host (Tailscale, localhost, LAN) λέει «Disallow: /» — ΟΧΙ
// επειδή περιμένουμε crawler στο 100.65.32.39, αλλά επειδή το ίδιο αρχείο θα
// βρεθεί μια μέρα πίσω από ένα προσωρινό δημόσιο URL και τότε θα είναι αργά.
//
// Η λίστα των αποκλεισμένων crawler είναι ΤΟ ΙΔΙΟ ΣΕΤ που μπήκε live στις
// 27/07/2026 μετά τη μελέτη κίνησης (200.258 αιτήματα/μήνα, 12,5% του server,
// μηδενική αξία). Μεταφέρεται αυτούσια ώστε το cutover να μη χαλαρώσει άμυνα
// που ήδη δουλεύει.
//
// ⚠️ ΤΙ ΔΕΝ ΜΕΤΑΦΕΡΘΗΚΕ ΑΠΟ ΤΟ ΠΑΛΙΟ (σκόπιμα):
//    `/currency/BGN|GBP|RSD|RUB|USD` και `*routes.indication` — μονοπάτια του
//    παλιού συστήματος που ΔΕΝ υπάρχουν εδώ. Ένα Disallow σε ανύπαρκτο URL δεν
//    προστατεύει τίποτα, απλώς κρύβει ότι κανείς δεν ξέρει πια τι κάνει.
//    Ούτε `print.php`/`pdf.php`: με απόφαση, το νέο site ΔΕΝ έχει τέτοιο
//    endpoint (εκτύπωση μόνο με @media print) — ήταν ο δίαυλος από τον οποίο
//    διέρρεε ο κατάλογος, 58.046 προβολές από ένα και μόνο bot.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { isProd, ORIGIN } from '../lib/seo';

export const prerender = false;

// Εμπορικές βάσεις SEO: σαρώνουν το site για να πουλήσουν τα στοιχεία του σε
// τρίτους — ανταγωνιστές συμπεριλαμβανομένων.
const SEO_SCRAPERS = ['MJ12bot', 'SemrushBot', 'dotbot', 'BLEXBot', 'SEranking', 'SEOkicks'];

// Μηχανές χωρίς αγοραστικό κοινό για ακίνητα Χαλκιδικής.
const NO_AUDIENCE = ['PetalBot', 'Baiduspider', 'Sogou web spider'];

// Παρακολούθηση media — 6.454 αιτήματα μόνο στην αρχική σελίδα.
const MEDIA_MONITORS = ['Mediatoolkitbot'];

const block = (agents: string[]) => agents.map((a) => `User-agent: ${a}\nDisallow: /`).join('\n\n');

const PRODUCTION = `# Halkidiki Properties
# ═══════════════════════════════════════════════════════════════════════
# ΔΕΝ αποκλείονται (και δεν πρέπει): Googlebot, Bingbot, DuckDuckBot,
# Applebot, Yandex, AhrefsBot/AhrefsSiteAudit, meta-externalagent,
# ClaudeBot, GPTBot, OAI-SearchBot, Amazonbot.
# ═══════════════════════════════════════════════════════════════════════

User-agent: *
Allow: /

# Εσωτερικά endpoints — δεδομένα, όχι σελίδες.
Disallow: /api/

# Σελίδες λογαριασμού: τίποτα να ευρετηριαστεί, και το logout είναι ενέργεια.
Disallow: /logout
Disallow: /*/logout
Disallow: /email/verify
Disallow: /*/email/verify

# — Εμπορικές βάσεις SEO
${block(SEO_SCRAPERS)}

# — Μηχανές αναζήτησης χωρίς αγοραστικό κοινό για ακίνητα Χαλκιδικής
${block(NO_AUDIENCE)}

# — Παρακολούθηση media
${block(MEDIA_MONITORS)}

# ΣΗΜΕΙΩΣΗ: Bytespider (ByteDance) και XML Sitemaps Generator ΔΕΝ σέβονται το
# robots.txt → αποκλείονται στο επίπεδο του edge, όχι εδώ.

Host: ${ORIGIN}
Sitemap: ${ORIGIN}/sitemap.xml
`;

/**
 * 🔴 ΠΡΟΕΠΙΣΚΟΠΗΣΗ: ΑΦΗΝΟΥΜΕ ΤΗ ΜΗΧΑΝΗ ΝΑ ΜΠΕΙ — ΕΠΙΤΗΔΕΣ (αλλαγή 7/8/2026).
 *
 * Εδώ έγραφε `Disallow: /`. Ακούγεται αυστηρότερο· είναι **λιγότερο** αυστηρό, και μάλιστα
 * ακυρώνει το `noindex` της σελίδας: αν η μηχανή δεν επιτρέπεται να μπει, **δεν διαβάζει
 * ποτέ την οδηγία**. Και τότε μια διεύθυνση που κάποιος μοιράστηκε μπορεί να καταχωρηθεί
 * σκέτη, χωρίς περιεχόμενο.
 *
 * Δεν είναι θεωρία: το `rewize.app` είναι πίσω από Cloudflare Access και δεν δίνει ούτε
 * μία λέξη — και **εμφανίζεται ήδη ως διεύθυνση** σε αναζήτηση.
 *
 * ⇒ Ο συνδυασμός που όντως κρύβει: **ελεύθερη σάρωση + ρητό `noindex` σε κάθε απάντηση**
 *   (κεφαλίδα `X-Robots-Tag`, δες `src/middleware.ts`). Η μηχανή μπαίνει, διαβάζει
 *   «μη με δείξεις», και δεν μας δείχνει — ούτε ως διεύθυνση.
 *
 * ⚠️ Το κόστος είναι πραγματικό και το δεχόμαστε: η προεπισκόπηση θα σαρώνεται. Ο στόχος
 * είναι «να μη φαίνεται», όχι «να μη διαβάζεται» — και τα δύο μαζί δεν γίνονται.
 */
const STAGING = `# Περιβάλλον προεπισκόπησης — ΔΕΝ είναι το halkidikiproperties.com.
# Η σάρωση επιτρέπεται ΕΠΙΤΗΔΕΣ, ώστε να διαβαστεί το «noindex» που στέλνει ο διακομιστής
# σε κάθε απάντηση (X-Robots-Tag). Με «Disallow: /» η μηχανή δεν θα το έβλεπε ποτέ, και η
# διεύθυνση θα μπορούσε να εμφανιστεί σκέτη στα αποτελέσματα.
User-agent: *
Allow: /
Disallow: /api/
`;

export const GET: APIRoute = ({ request, url }) => {
  const prod = isProd(request, url);
  return new Response(prod ? PRODUCTION : STAGING, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Το robots.txt το ζητούν συνέχεια και αλλάζει σπάνια — μία ώρα στο edge.
      'Cache-Control': prod ? 'public, max-age=3600, s-maxage=3600' : 'no-store',
    },
  });
};
