// Article authors: name + role only, no photo (George 20/10/2026).
// The old site gives no job titles. The six authors are company staff (George 21/10/2026):
// each is shown as a real estate consultant of the brand until a specific title is confirmed
// for that person. No other titles are invented here. An author not in ROLES falls back to
// the brand name (scripts/test-articles.mjs fails if an article's author has no role here).
import { brand } from '../../brand/index';

export type Author = { name: string; role: string };

const CONSULTANT = `Real estate consultant, ${brand.name}`;

export const ROLES: Record<string, string> = {
  'Theologos Vavdinoudis': CONSULTANT,
  'Maria Tita': CONSULTANT,
  'Theodora Kosmoglou': CONSULTANT,
  'Konstantinos Doumas': CONSULTANT,
  'Liudmila Siniavskaya': CONSULTANT,
  'Bojana Cejic': CONSULTANT,
};

export function authorOf(name: string): Author | null {
  const n = (name ?? '').trim();
  if (!n) return null;
  return { name: n, role: ROLES[n] ?? brand.name };
}
