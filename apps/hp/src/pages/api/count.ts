// ═══════════════════════════════════════════════════════════════════════════
// Ο ΖΩΝΤΑΝΟΣ ΜΕΤΡΗΤΗΣ ΤΩΝ ΦΙΛΤΡΩΝ.
//
// 🔴 ΚΕΝΟ ΤΟΥ EALIDA API (μετρήθηκε 27/7 — να κλείσει στη Φ2):
//    Το `/site/properties` υποστηρίζει: subcategory ✓ category ✓ municipality ✓ bedrooms ✓
//    ΔΕΝ υποστηρίζει:  price_min ✗ price_max ✗ sqm_min ✗ sea_access ✗
//    και το `pool=1` γυρίζει 0 ενώ τα ακίνητα με πισίνα είναι 256.
//    Δηλαδή: αν προωθούσαμε τα φίλτρα αυτούσια, ο μετρητής θα ΕΛΕΓΕ ΨΕΜΑΤΑ —
//    ο χρήστης θα έβαζε τιμή και ο αριθμός δεν θα άλλαζε.
//
// ΠΡΟΣΩΡΙΝΗ ΛΥΣΗ (σωστή στη δική μας κλίμακα): τραβάμε μία φορά και τα 527,
// τα κρατάμε 60 δευτερόλεπτα στη μνήμη, και φιλτράρουμε εδώ. Ένα αίτημα προς
// το EALIDA ανά λεπτό, όχι ανά πάτημα πλήκτρου.
// ⏭️ Όταν το API αποκτήσει τα φίλτρα, αυτό το αρχείο γίνεται προώθηση 3 γραμμών.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { allProperties, visitorCountry, priceOf, priceVisible } from '../../lib/api';
import { muniKey } from '../../lib/gate';
import { hasPool } from '../../lib/listing';
import { coverOf, clean } from '../../lib/photos';

export const prerender = false;

// Η μνήμη ζει στο lib/api.ts και είναι ΚΟΙΝΗ με την αρχική: όταν φορτώσει η
// σελίδα, ο μετρητής απαντά ήδη ακαριαία.
const n = (v: string | null) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
};

export const GET: APIRoute = async ({ url, cookies, request }) => {
  const q = url.searchParams;
  try {
    // 🔐 Ο μετρητής μετράει ό,τι ΒΛΕΠΕΙ ο συγκεκριμένος επισκέπτης. Χωρίς το token
    //    το μέλος έβλεπε πλήθος χωρίς τα ιδιωτικά — δηλαδή ο αριθμός δεν συμφωνούσε
    //    με τη λίστα που θα του σερβίραμε.
    const token = cookies.get('member_token')?.value;
    const items = await allProperties(token, visitorCountry(request));   // #18: the count matches the list
    // ⛔ Το `area` ΔΕΝ είναι φίλτρο εδώ: η περιοχή είναι κλειδωμένη για τους μη
    //    συνδεδεμένους και δεν την ξεγλιστράμε μέσω μετρητή.
    // Multi-select (Sergei 03/11): a repeated parameter = any of its values (long and short names).
    const all = (...ks: string[]) => ks.flatMap((k) => q.getAll(k)).map((v) => v.trim()).filter(Boolean);
    const subs = all('subcategory', 'type');
    const cat = q.get('category') || '';
    const munis = all('municipality', 'muni').map((m) => muniKey(m));
    const seas = all('sea_access', 'sea');
    const bedIn = all('bed').map(Number).filter((x) => Number.isFinite(x) && x > 0);
    const pMin = n(q.get('price_min')), pMax = n(q.get('price_max'));
    const sMin = n(q.get('sqm_min')), sMax = n(q.get('sqm_max'));
    const beds = n(q.get('bedrooms'));
    const pool = q.get('pool') === '1';

    const hits = items.filter((p) => {
      const a = p.attributes ?? {};
      if (subs.length && !subs.includes(String(a.subcategory ?? ''))) return false;
      if (cat && a.category !== cat) return false;
      // Ο δήμος συγκρίνεται με ΚΛΕΙΔΙ, όχι με κείμενο: η βάση κρατά γενική
      // («Νέας Προποντίδας»), το URL ονομαστική («Νέα Προποντίδα»). Δες gate.ts.
      if (munis.length && !munis.includes(muniKey(a))) return false;
      if (beds && Number(a.bedrooms ?? 0) < beds) return false;
      if (seas.length && !seas.includes(String(a.sea_access ?? ''))) return false;
      if (bedIn.length) { const b = Number(a.bedrooms ?? 0); if (!bedIn.some((x) => (x >= 5 ? b >= 5 : b === x))) return false; }
      // B-04: same rule as the listing — pool code "2" means "no pool" (traps T-K05).
      if (pool && !hasPool(a)) return false;
      const sq = Number(a.sqm ?? 0);
      if (sMin && sq < sMin) return false;
      if (sMax && sq > sMax) return false;
      if (pMin || pMax) {
        if (!priceVisible(a)) return false;   // κρυφή τιμή δεν μπορεί να φιλτραριστεί
        const pr = priceOf(a);
        if (pMin && pr < pMin) return false;
        if (pMax && pr > pMax) return false;
      }
      return true;
    });
    const total = hits.length;

    // `cover=1` (the panel's saved requests, Sergei 2026-11-23): the watermarked cover of the first match, as on a card.
    let cover: string | undefined;
    if (q.get('cover') === '1') {
      for (const p of hits) { const c = coverOf(p.attributes ?? {}); if (c?.url && !p.locked) { cover = clean(c.url, 800); break; } }
    }

    // No property counts in public output (George 17/10): the endpoint only says whether
    // anything matches, so the filter button can show "no results".
    return new Response(JSON.stringify({ any: total > 0, ...(cover ? { cover } : {}) }), {
      headers: {
        'content-type': 'application/json',
        // B-06 (traps T-K08): a member's count includes private properties — never shared caches.
        'cache-control': token ? 'private, max-age=30' : 'public, max-age=30, s-maxage=120',
        vary: token ? 'cookie, cf-ipcountry' : 'cf-ipcountry',   // #18: the count differs by country
      },
    });
  } catch {
    // Ο μετρητής δεν σπάει ΠΟΤΕ τη φόρμα: γυρίζει null και το UI κρατά την
    // προηγούμενη ένδειξη.
    return new Response(JSON.stringify({ any: null }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
};
