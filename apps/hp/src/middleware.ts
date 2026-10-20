// ═══════════════════════════════════════════════════════════════════════════
// «ΤΟ ΔΟΚΙΜΑΣΤΙΚΟ ΔΕΝ ΠΡΕΠΕΙ ΝΑ ΦΑΙΝΕΤΑΙ ΣΤΗ GOOGLE» — εντολή George 7/8/2026.
//
// 🔴 ΓΙΑΤΙ ΤΟ `Disallow: /` ΔΕΝ ΑΡΚΟΥΣΕ — ΚΑΙ ΜΑΛΙΣΤΑ ΑΚΥΡΩΝΕ ΤΟ `noindex`.
//
// Στο `hp.rewize.app` το robots.txt έλεγε «μην μπεις» ΚΑΙ η σελίδα είχε
// `<meta name="robots" content="noindex">`. Ακούγεται διπλή προστασία· είναι το
// αντίθετο: αν η μηχανή **δεν επιτρέπεται να μπει**, δεν διαβάζει ποτέ το `noindex`.
// Και τότε, αν κάποιος τρίτος βάλει σύνδεσμο — και ο σύνδεσμος έχει σταλεί σε κόσμο —
// η διεύθυνση μπορεί να καταχωρηθεί **σκέτη, χωρίς περιεχόμενο**.
//
// Δεν είναι θεωρία: το `rewize.app`, που είναι πίσω από Cloudflare Access και δεν δίνει
// ούτε μία λέξη περιεχομένου, **εμφανίζεται ήδη ως διεύθυνση** σε αναζήτηση.
//
// ⇒ Η σωστή σειρά είναι η αντίστροφη απ' ό,τι φαίνεται:
//      ΑΦΗΣΕ τη να μπει  →  ΠΕΣ ΤΗΣ ΡΗΤΑ «μη με δείξεις»
//
// ── ΓΙΑΤΙ ΚΕΦΑΛΙΔΑ ΚΑΙ ΟΧΙ ΜΟΝΟ META ─────────────────────────────────────────
// Το `<meta>` υπάρχει μόνο μέσα σε HTML. Η κεφαλίδα ισχύει για **κάθε** απάντηση:
// JSON, εικόνες, sitemap, ό,τι σερβίρεται. Και τη διαβάζουν και όσοι σαρωτές αγνοούν
// το robots.txt — που είναι οι περισσότεροι από αυτούς που μας ενοχλούν.
//
// ⚠️ ΙΣΧΥΕΙ ΜΟΝΟ ΕΚΤΟΣ ΠΑΡΑΓΩΓΗΣ. Η ίδια κεφαλίδα στο halkidikiproperties.com θα
// **έσβηνε το site από τη Google** — γι' αυτό κρέμεται από το ίδιο `isProd()` που
// ορίζει και το robots.txt: μία πηγή αλήθειας για το «πού είμαστε».
// ═══════════════════════════════════════════════════════════════════════════
import type { MiddlewareHandler } from 'astro';
import { isProd } from './lib/seo';
import { originHeader } from './lib/origin';

// ── Same-origin check for form posts (B-24) ──────────────────────────────────
// Astro's built-in check is switched off in astro.config.mjs (it compared against
// `https://localhost` behind the tunnel). Same rule, right reference: a non-GET request with a
// form-like body (or no content-type) must carry an Origin equal to the site's public origin
// (PUBLIC_ORIGIN, else the forwarded host), to the request URL's own origin, or to the Host the
// browser addressed (a victim's browser always sends the target's Host, so this cannot admit a
// foreign Origin; it keeps local dev on 127.0.0.1:4331 working). JSON requests are left to the
// browser's CORS preflight, exactly as Astro did.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

function crossSiteForm(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const type = request.headers.get('content-type');
  const formLike = type === null || FORM_TYPES.some((t) => type.toLowerCase().includes(t));
  if (!formLike) return false;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const allowed = new Set([url.origin, originHeader(request, url).origin, host && `${url.protocol}//${host}`].filter(Boolean));
  return !origin || !allowed.has(origin);
}

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  if (crossSiteForm(ctx.request, ctx.url)) {
    return new Response(`Cross-site ${ctx.request.method} form submissions are forbidden`, { status: 403 });
  }
  const res = await next();
  if (!isProd(ctx.request, ctx.url)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }
  return res;
};
