// ═══════════════════════════════════════════════════════════════════════════
// Η ΑΥΤΟΜΑΤΗ ΕΦΕΔΡΕΙΑ ΓΡΑΜΜΑΤΟΣΕΙΡΑΣ (απαίτηση George, 27/7).
//
// Η Mont είναι εμπορική, με άδεια έως 1.000.000 προβολές/μήνα. Αν ποτέ
// εξαντληθεί, ΟΛΟ το site πρέπει να γυρίσει μόνο του σε Literata + Source Sans 3.
//
// ΠΩΣ: το <html> παίρνει data-typeface="mont" ή "fallback". Τα tokens αλλάζουν,
// τίποτε άλλο. Μηδέν αλλαγή κώδικα, μηδέν deploy — μία ρύθμιση.
//
// ΠΟΙΟΣ ΤΗΝ ΑΛΛΑΖΕΙ:
//   1. Χειροκίνητα:  TYPEFACE=fallback στο περιβάλλον (διακόπτης έκτακτης ανάγκης)
//   2. Αυτόματα:     ο μετρητής προβολών στο edge — ειδοποίηση στο 85%,
//                    γύρισμα στο 100%. Γράφει τη ρύθμιση στο EALIDA config.
// ═══════════════════════════════════════════════════════════════════════════
export type Typeface = 'mont' | 'fallback';

/** Το μηνιαίο όριο της άδειας. */
export const MONTHLY_LIMIT = 1_000_000;
/** Στο 85% ειδοποιούμε — υπάρχει χρόνος να αποφασιστεί ανανέωση. */
export const WARN_AT = 0.85;

export function typeface(): Typeface {
  const env = (import.meta.env.TYPEFACE || process.env.TYPEFACE || '').toLowerCase();
  if (env === 'fallback' || env === 'mont') return env as Typeface;
  return 'mont';
}

/**
 * Η απόφαση, με βάση τις προβολές του τρέχοντος μήνα.
 * Καλείται από τον μετρητή του edge· εδώ ζει ο κανόνας, ώστε να είναι ένας.
 */
export function decide(monthlyViews: number): { typeface: Typeface; warn: boolean } {
  return {
    typeface: monthlyViews >= MONTHLY_LIMIT ? 'fallback' : 'mont',
    warn: monthlyViews >= MONTHLY_LIMIT * WARN_AT,
  };
}
