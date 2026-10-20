// ═══════════════════════════════════════════════════════════════════════════
// ΚΛΕΙΔΩΜΕΝΗ ΦΩΤΟΓΡΑΦΙΑ — ΚΑΤΑΣΤΡΟΦΗ, ΟΧΙ ΚΟΥΡΤΙΝΑ.
//
// 🔴 ΤΟ ΛΑΘΟΣ ΠΟΥ ΔΙΟΡΘΩΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ (μετρήθηκε 6/8/2026)
//
//   Και το σημερινό halkidikiproperties.com ΚΑΙ το νέο site έκαναν το ίδιο:
//
//     <img style="filter: blur(9px)" src="…/detached-house-…_800w.jpg">
//
//   Το θόλωμα το ζωγραφίζει ο **φυλλομετρητής**. Η διεύθυνση της πραγματικής
//   φωτογραφίας είναι γραμμένη ολόκληρη μέσα στη σελίδα. Δοκιμάστηκε ζωντανά:
//     https://media.onsea.gr/properties/ums_7838/…_400w.jpg → 200 OK · 60 KB · ευκρινής
//   Δηλαδή «κλειδωμένη» φωτογραφία = καθαρή φωτογραφία με μια κουρτίνα μπροστά,
//   που τη σηκώνει όποιος κάνει δεξί κλικ → προβολή πηγαίου.
//
//   Ίδια ακριβώς κατηγορία λάθους με τα τοπωνύμια που θολώναμε με CSS τον
//   Ιούλιο (ο επισκέπτης έπαιρνε ΟΛΗ τη γεωγραφία από τον πηγαίο κώδικα) και με
//   το «σβήνεις το w και φεύγει το υδατογράφημα».
//
// ✅ Η ΑΡΧΗ ΕΔΩ: ό,τι δεν επιτρέπεται να δει ο επισκέπτης **δεν φεύγει από τον
//    διακομιστή**. Στέλνουμε ένα ΝΕΟ αρχείο πλάτους 24 pixel — δηλαδή περίπου
//    600 pixel συνολικά για ολόκληρη τη φωτογραφία. Δίνει χρώμα, φως και σχήμα·
//    δεν υπάρχει καμία λεπτομέρεια να ανακτηθεί, με κανένα εργαλείο, γιατί δεν
//    στάλθηκε ποτέ. Το θόλωμα στη σελίδα μένει, αλλά πλέον είναι **καλλωπισμός
//    πάνω σε κάτι ήδη κατεστραμμένο**, όχι το ίδιο το κλείδωμα.
//
// 🛡️ ΔΥΟ ΔΙΚΛΕΙΔΕΣ ΠΟΥ ΔΕΝ ΠΡΕΠΕΙ ΝΑ ΦΥΓΟΥΝ:
//    · Πηγή είναι το **υδατογραφημένο** `_400w`, ποτέ το καθαρό. Αν αύριο κάποιος
//      αλλάξει το `marked()` σε `clean()`, το χειρότερο που περνά στο δίκτυο
//      είναι ήδη 24 pixel — αλλά η αρχή «ποτέ καθαρό» τηρείται σε κάθε βήμα.
//    · Το URL που βλέπει ο επισκέπτης είναι `/api/blur/<κωδικός>/<νούμερο>.jpg`.
//      **Δεν περιέχει τη διεύθυνση της πραγματικής φωτογραφίας** — ούτε καν
//      κωδικοποιημένη. Γι' αυτό ΔΕΝ χρησιμοποιείται το ενσωματωμένο `/_image`
//      του Astro: εκείνο βάζει την πηγή στο query string, δηλαδή θα ξανάγραφε
//      την καθαρή διεύθυνση στη σελίδα και θα ακύρωνε όλη τη δουλειά.
// ═══════════════════════════════════════════════════════════════════════════
import sharp from 'sharp';

/** Πλάτος της κατεστραμμένης εκδοχής. 24px ≈ 600 pixel για ΟΛΗ τη φωτογραφία. */
const TINY_W = 24;

/** Ελαφρύ θόλωμα ΜΕΣΑ στο αρχείο, ώστε να μη φαίνονται τετραγωνάκια όταν μεγεθυνθεί. */
const SOFTEN = 0.8;

/** Πάνω όριο μνήμης: ~700 bytes/εικόνα × 1.500 ≈ 1 MB. Αμελητέο. */
const MAX_ENTRIES = 1500;

const cache = new Map<string, Uint8Array>();
const inflight = new Map<string, Promise<Uint8Array | null>>();

function remember(key: string, buf: Uint8Array): void {
  cache.set(key, buf);
  // Απλό FIFO: η πρώτη που μπήκε φεύγει πρώτη. Δεν χρειάζεται LRU — οι
  // φωτογραφίες μιας σελίδας ζητούνται όλες μαζί και ξανά, όχι σποραδικά.
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Φτιάχνει (ή επιστρέφει από τη μνήμη) την κατεστραμμένη εκδοχή μιας φωτογραφίας.
 * `null` σημαίνει «δεν μπόρεσα» — ο καλών πρέπει να απαντήσει 404, ΠΟΤΕ να μη
 * γυρίσει την πραγματική εικόνα ως εφεδρεία.
 */
export async function tinyBlur(sourceUrl: string): Promise<Uint8Array | null> {
  if (!sourceUrl) return null;

  const hit = cache.get(sourceUrl);
  if (hit) return hit;

  const running = inflight.get(sourceUrl);
  if (running) return running;

  const job = (async (): Promise<Uint8Array | null> => {
    try {
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const src = Buffer.from(await res.arrayBuffer());
      const out = await sharp(src)
        .rotate()                                  // σεβασμός στο EXIF, αλλιώς γυρίζουν πλάγια
        .resize({ width: TINY_W, withoutEnlargement: true })
        .blur(SOFTEN)
        .jpeg({ quality: 62, chromaSubsampling: '4:2:0' })
        .toBuffer();
      const bytes = new Uint8Array(out);
      remember(sourceUrl, bytes);
      return bytes;
    } catch {
      return null;
    } finally {
      inflight.delete(sourceUrl);
    }
  })();

  inflight.set(sourceUrl, job);
  return job;
}
