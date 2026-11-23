// ═══════════════════════════════════════════════════════════════════════════
// /api/blur/<κωδικός ακινήτου>/<αριθμός>.jpg
//
// Σερβίρει την ΚΑΤΕΣΤΡΑΜΜΕΝΗ εκδοχή μιας κλειδωμένης φωτογραφίας — 24 pixel
// πλάτος, τίποτα να ανακτηθεί. Το «γιατί» ζει ολόκληρο στο `lib/blur.ts`.
//
// 🛡️ ΓΙΑΤΙ ΔΕΝ ΔΕΧΕΤΑΙ ΔΙΕΥΘΥΝΣΗ ΩΣ ΠΑΡΑΜΕΤΡΟ
//    Ένα `/api/blur?url=…` θα ήταν μία γραμμή λιγότερη — και **ανοιχτός
//    μεσάζοντας**: ο καθένας θα μπορούσε να βάλει οποιαδήποτε διεύθυνση και να
//    κάνει τον διακομιστή μας να την κατεβάσει (εσωτερικά δίκτυα, τρίτα site).
//    Εδώ η μόνη είσοδος είναι κωδικός ακινήτου + αύξων αριθμός· η πραγματική
//    διεύθυνση προκύπτει ΜΟΝΟ από τα δικά μας δεδομένα.
//
// ⚠️ ΔΕΝ ΕΛΕΓΧΕΙ ΕΠΙΠΕΔΟ ΧΡΗΣΤΗ, ΚΑΙ ΕΙΝΑΙ ΣΩΣΤΟ.
//    Ό,τι επιστρέφει είναι ήδη άχρηστο για οποιονδήποτε. Το μέλος δεν έρχεται
//    ποτέ εδώ — παίρνει την κανονική φωτογραφία από το `media.onsea.gr`.
//    Αν κάποτε προστεθεί έλεγχος, θα είναι για να ΜΗΝ πληρώνουμε επεξεργασία σε
//    ρομπότ, όχι για μυστικότητα.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { allProperties, refOf } from '../../../../lib/api';
import { orderedPhotos, marked } from '../../../../lib/photos';
import { tinyBlur } from '../../../../lib/blur';

export const prerender = false;

/** Ένας χρόνος. Το περιεχόμενο δεν αλλάζει ποτέ για δεδομένο (ακίνητο, αριθμό). */
const CACHE = 'public, max-age=31536000, immutable';

const notFound = () => new Response(null, { status: 404 });

export const GET: APIRoute = async ({ params, cookies }) => {
  const ref = String(params.ref ?? '').trim();
  // Το «5.jpg» φτάνει ολόκληρο· κρατάμε μόνο τα ψηφία.
  const idx = Number(String(params.idx ?? '').replace(/\.jpe?g$/i, ''));
  if (!ref || !Number.isInteger(idx) || idx < 0 || idx > 200) return notFound();

  // Ίδια μνήμη με τις σελίδες — δεν προστίθεται αίτημα προς το EALIDA.
  const want = ref.toLowerCase();
  const all = await allProperties().catch(() => []);
  let item = all.find((p) => refOf(p).toLowerCase() === want);
  // The closed collection shows its homes locked to members who are not Exclusive (Sergei 2026-11-23). The CRM gives
  // them those homes with their photos; the guest set does not. So a member's own set is asked too — still only the
  // destroyed 24-pixel copy leaves, and the answer is private (never shared by a cache with a guest).
  let personal = false;
  const tok = cookies.get('member_token')?.value;
  if ((!item || item.locked) && tok) {
    const mine = await allProperties(tok).catch(() => []);
    const hit = mine.find((p) => refOf(p).toLowerCase() === want);
    if (hit && !hit.locked) { item = hit; personal = true; }
  }
  if (!item || item.locked) return notFound();

  const photos = orderedPhotos(item.attributes ?? {});
  const photo = photos[idx];
  if (!photo?.url) return notFound();

  // 🔒 Πηγή ΠΑΝΤΑ η υδατογραφημένη μικρή — ποτέ η καθαρή, ποτέ η μεγάλη.
  const bytes = await tinyBlur(marked(photo.url, 400));
  if (!bytes) return notFound();

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      'content-length': String(bytes.byteLength),
      'cache-control': personal ? 'private, max-age=86400' : CACHE,
      // Δεν είναι μυστικό, αλλά δεν υπάρχει λόγος να το κατεβάζουν τρίτοι.
      'x-content-type-options': 'nosniff',
    },
  });
};
