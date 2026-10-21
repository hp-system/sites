// The CRM answers member errors with its own Greek text. On every non-Greek page that text was
// replaced by "That code does not match." — even for a suspended account or a rate limit (#73).
// This turns the CRM answer into a site `code` (+ numbers) that the page translates in 9 languages.
// The Greek `message` still travels along, for the Greek page and for anything not recognised.
export type CrmError = { code?: string; left?: number; retryAfterSec?: number; message?: string };

export function crmError(status: number, body: unknown, fallback: string): CrmError {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message : undefined;
  if (status === 429) {
    const s = Number(b.retryAfterSec);
    return { code: 'too_many', retryAfterSec: Number.isFinite(s) && s > 0 ? Math.ceil(s) : 60, message };
  }
  const m = message ?? '';
  if (/αν[εα]σταλ|αναστολ/i.test(m)) return { code: 'suspended', message };
  const left = m.match(/Απομένουν\s+(\d+)/);
  if (left) return { code: 'code_left', left: Number(left[1]), message };
  if (/δεν ισχύει πια|ληγμένος|έληξε/i.test(m)) return { code: 'expired', message };
  return message ? { message } : { code: fallback };
}
