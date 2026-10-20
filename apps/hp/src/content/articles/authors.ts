// Article authors: name + role only, no photo (George 20/10/2026).
// The old site gives no job titles — every author is shown as part of the company
// until George sets a role per person here.
import { brand } from '../../brand/index';

export type Author = { name: string; role: string };

const ROLES: Record<string, string> = {};

export function authorOf(name: string): Author | null {
  const n = (name ?? '').trim();
  if (!n) return null;
  return { name: n, role: ROLES[n] ?? brand.name };
}
