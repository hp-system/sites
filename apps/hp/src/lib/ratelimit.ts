// A small in-memory limit per key (visitor IP, e-mail…): at most `max` sends in `windowMs`. One server
// process, reset on restart — enough against a script hammering a form; the CRM keeps its own brakes.
// Shared by the lead endpoints (forms audit 2026-11-11: /api/inquiry had none).
const buckets = new Map<string, Map<string, number[]>>();

export function limited(scope: string, key: string, max = 5, windowMs = 3_600_000): boolean {
  if (!key) return false;
  let b = buckets.get(scope);
  if (!b) { b = new Map(); buckets.set(scope, b); }
  const now = Date.now();
  const recent = (b.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { b.set(key, recent); return true; }
  recent.push(now); b.set(key, recent);
  if (b.size > 5000) b.clear();
  return false;
}
