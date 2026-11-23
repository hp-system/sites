// The member panel's CRM calls (CRM #496, 2026-11-23): saved searches, preferences, the account-deletion request,
// «My properties». Every call carries the member's own token (`x-member-token`); the person is never taken from a body.
//
// `status` 0 = the CRM could not be reached. A 404 means this CRM has no such endpoint yet (an older API): the callers
// then keep the old way (the browser copy and a tagged inquiry line), so the site never depends on the CRM release.
const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

export type CrmAnswer = { status: number; body: any };

export async function memberCall(token: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, timeout = 8000): Promise<CrmAnswer> {
  try {
    const r = await fetch(`${API}/site/member/${path}`, {
      method,
      headers: { 'x-member-token': token, accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
}

/** A saved search as the panel shows it (the CRM's `Search`: id, q, label, createdAt, updatedAt). */
export type PanelSearch = { id: string; q: string; text: string; at: number };
export function panelSearch(s: any): PanelSearch {
  return { id: String(s?.id ?? ''), q: String(s?.q ?? ''), text: String(s?.label ?? ''), at: Date.parse(String(s?.createdAt ?? '')) || Date.now() };
}

/** «My properties» (CRM `GET member/properties`, George 2026-11-23 = option b of D-174): only the member's own. */
export type OwnProperty = {
  id: string; title: string; status: string; published: boolean; createdAt: string;
  views: { members: number; visitors: number; last30: number };
};
export async function ownProperties(token: string): Promise<{ ok: boolean; api: boolean; items: OwnProperty[] }> {
  const r = await memberCall(token, 'GET', 'properties');
  if (r.status === 404) return { ok: true, api: false, items: [] };
  if (r.status !== 200 || !Array.isArray(r.body?.items)) return { ok: false, api: true, items: [] };
  return {
    ok: true, api: true,
    items: r.body.items.map((x: any) => ({
      id: String(x?.id ?? ''), title: String(x?.title ?? ''), status: String(x?.status ?? ''), published: x?.published === true,
      createdAt: String(x?.createdAt ?? ''),
      views: { members: Number(x?.views?.members) || 0, visitors: Number(x?.views?.visitors) || 0, last30: Number(x?.views?.last30) || 0 },
    })),
  };
}

/**
 * Does this member own a property in the CRM? (Sergei 2026-11-23: a buyer who submitted their own property saw no
 * Buy / Sell tabs.) The Sell side of the panel follows ownership as well as the sign-up role. Kept per token for 60 s in
 * this server's memory only — within the member's own session, as George asks for `member/properties` — and dropped
 * after a submission so the tabs show at once.
 */
const owners = new Map<string, { at: number; v: boolean }>();
export async function ownsProperties(token: string): Promise<boolean> {
  const hit = owners.get(token);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  const r = await ownProperties(token);
  const v = r.ok && r.items.length > 0;
  owners.set(token, { at: Date.now(), v });
  if (owners.size > 500) { const k = owners.keys().next().value; if (k !== undefined) owners.delete(k); }
  return v;
}
export function forgetOwner(token: string | undefined): void { if (token) owners.delete(token); }
