/**
 * Η μορφή που όρισε ο George (21/10/2026) για το τηλέφωνο της εταιρείας, όπου κι αν
 * φαίνεται: «+30 2311 24.12.24». Ό,τι γράψει το CRM (με ή χωρίς κενά, τελείες,
 * παρενθέσεις) ξαναγράφεται σε αυτή τη μορφή· αριθμός που δεν είναι ελληνικό σταθερό
 * 10 ψηφίων μένει όπως ήρθε.
 */
export function formatCompanyPhone(display: string): string {
  const d = display.replace(/\D/g, '').replace(/^0030/, '').replace(/^30(?=\d{10}$)/, '');
  if (!/^2\d{9}$/.test(d)) return display;
  return `+30 ${d.slice(0, 4)} ${d.slice(4, 6)}.${d.slice(6, 8)}.${d.slice(8, 10)}`;
}
