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
import { allProperties, priceOf, priceVisible } from '../../lib/api';
import { muniKey } from '../../lib/gate';
import { hasPool } from '../../lib/listing';

export const prerender = false;

// Η μνήμη ζει στο lib/api.ts και είναι ΚΟΙΝΗ με την αρχική: όταν φορτώσει η
// σελίδα, ο μετρητής απαντά ήδη ακαριαία.
const n = (v: string | null) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
};

export const GET: APIRoute = async ({ url, cookies }) => {
  const q = url.searchParams;
  try {
    // 🔐 Ο μετρητής μετράει ό,τι ΒΛΕΠΕΙ ο συγκεκριμένος επισκέπτης. Χωρίς το token
    //    το μέλος έβλεπε πλήθος χωρίς τα ιδιωτικά — δηλαδή ο αριθμός δεν συμφωνούσε
    //    με τη λίστα που θα του σερβίραμε.
    const token = cookies.get('member_token')?.value;
    const items = await allProperties(token);
    // ⛔ Το `area` ΔΕΝ είναι φίλτρο εδώ: η περιοχή είναι κλειδωμένη για τους μη
    //    συνδεδεμένους και δεν την ξεγλιστράμε μέσω μετρητή.
    const sub = q.get('subcategory') || '';
    const cat = q.get('category') || '';
    const muni = q.get('municipality') || '';
    const pMin = n(q.get('price_min')), pMax = n(q.get('price_max'));
    const sMin = n(q.get('sqm_min')), sMax = n(q.get('sqm_max'));
    const beds = n(q.get('bedrooms'));
    const sea = q.get('sea_access') || '';
    const pool = q.get('pool') === '1';

    const total = items.filter((p) => {
      const a = p.attributes ?? {};
      if (sub && a.subcategory !== sub) return false;
      if (cat && a.category !== cat) return false;
      // Ο δήμος συγκρίνεται με ΚΛΕΙΔΙ, όχι με κείμενο: η βάση κρατά γενική
      // («Νέας Προποντίδας»), το URL ονομαστική («Νέα Προποντίδα»). Δες gate.ts.
      if (muni && muniKey(a) !== muniKey(muni)) return false;
      if (beds && Number(a.bedrooms ?? 0) < beds) return false;
      if (sea && a.sea_access !== sea) return false;
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
    }).length;

    return new Response(JSON.stringify({ total }), {
      headers: {
        'content-type': 'application/json',
        // B-06 (traps T-K08): a member's count includes private properties — never shared caches.
        'cache-control': token ? 'private, max-age=30' : 'public, max-age=30, s-maxage=120',
        ...(token ? { vary: 'cookie' } : {}),
      },
    });
  } catch {
    // Ο μετρητής δεν σπάει ΠΟΤΕ τη φόρμα: γυρίζει null και το UI κρατά τον
    // προηγούμενο αριθμό.
    return new Response(JSON.stringify({ total: null }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
};
