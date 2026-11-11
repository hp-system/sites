// ═══════════════════════════════════════════════════════════════════════════
// LEADS ARE NEVER LOST (forms audit 2026-11-11: when the CRM was down, a request from the site was gone —
// no store, no retry, no log). Every lead endpoint sends through `sendLead()`:
//   · the CRM answers 2xx            → sent;
//   · the CRM is unreachable or 5xx  → the lead goes to the OUTBOX (a JSONL file on the container's volume,
//                                      mode 0600) and the visitor gets the normal «thank you»;
//   · the CRM answers 4xx            → not kept: the CRM refused the data, the visitor sees the error.
// Every 5 minutes the server sends the outbox again and keeps only what still fails.
// The log says only that a lead was kept or resent — never a name, an e-mail or a phone.
// Without LEAD_OUTBOX_DIR (local runs) nothing is kept and a failure stays a failure, as before.
// ═══════════════════════════════════════════════════════════════════════════
import { appendFile, mkdir, readdir, readFile, rename, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';
const DIR = (process.env.LEAD_OUTBOX_DIR ?? '').trim();
const EVERY_MS = 5 * 60_000;

type Kept = { at: string; path: string; headers: Record<string, string>; body: unknown; tries: number };
export type LeadResult = { ok: true; queued?: boolean } | { ok: false; status: number };

async function post(path: string, headers: Record<string, string>, body: unknown, timeout: number): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeout),
  });
}

async function keep(item: Kept): Promise<boolean> {
  if (!DIR) return false;
  try {
    await mkdir(DIR, { recursive: true, mode: 0o700 });
    const file = join(DIR, `leads-${item.at.slice(0, 7)}.jsonl`);
    await appendFile(file, JSON.stringify(item) + '\n', { mode: 0o600 });
    await chmod(file, 0o600).catch(() => {});
    return true;
  } catch (e) {
    console.error('[lead-outbox] could not keep a lead:', (e as Error).message);
    return false;
  }
}

/** Send one lead to the CRM; keep it for a retry when the CRM cannot take it now. */
export async function sendLead(path: string, headers: Record<string, string>, body: unknown, timeout = 10_000): Promise<LeadResult> {
  startOutbox();
  try {
    const r = await post(path, headers, body, timeout);
    if (r.ok) return { ok: true };
    if (r.status < 500) return { ok: false, status: r.status };
  } catch { /* unreachable: kept below */ }
  const kept = await keep({ at: new Date().toISOString(), path, headers, body, tries: 0 });
  if (kept) { console.warn(`[lead-outbox] kept a lead for ${path} (the CRM did not take it)`); return { ok: true, queued: true }; }
  return { ok: false, status: 502 };
}

let busy = false;
/** One pass over the outbox: resend every kept lead, keep only those that still fail. */
export async function flushOutbox(): Promise<{ sent: number; left: number }> {
  if (!DIR || busy) return { sent: 0, left: 0 };
  busy = true;
  let sent = 0, left = 0;
  try {
    const names = (await readdir(DIR).catch(() => [] as string[]))
      .map((f) => f.match(/^(leads-\d{4}-\d{2}\.jsonl)(\.sending)?$/)?.[1]).filter((f): f is string => !!f);
    for (const f of [...new Set(names)]) {
      const file = join(DIR, f);
      const work = `${file}.sending`;
      // a pass that stopped half way (a restart) left its leads in `.sending`: put them back first
      const prev = await readFile(work, 'utf8').catch(() => '');
      if (prev.trim()) { await appendFile(file, prev.endsWith('\n') ? prev : prev + '\n', { mode: 0o600 }); await writeFile(work, '', { mode: 0o600 }); }
      // take the file, so a lead kept during this pass lands in a fresh file and is not overwritten
      try { await rename(file, work); } catch { continue; }
      const lines = (await readFile(work, 'utf8')).split('\n').filter(Boolean);
      const keepAgain: string[] = [];
      for (const line of lines) {
        let it: Kept; try { it = JSON.parse(line); } catch { continue; }
        try {
          const r = await post(it.path, it.headers, it.body, 15_000);
          if (r.ok || (r.status >= 400 && r.status < 500)) { sent++; if (!r.ok) console.warn(`[lead-outbox] the CRM refused a kept lead (${r.status}); dropped`); continue; }
        } catch { /* still down */ }
        keepAgain.push(JSON.stringify({ ...it, tries: it.tries + 1 }));
      }
      if (keepAgain.length) {
        left += keepAgain.length;
        await appendFile(file, keepAgain.join('\n') + '\n', { mode: 0o600 });
      }
      await writeFile(work, '', { mode: 0o600 });   // emptied, then removed by the next rename round
    }
    if (sent) console.warn(`[lead-outbox] resent ${sent} lead(s), ${left} still waiting`);
  } finally { busy = false; }
  return { sent, left };
}

/** Start the 5-minute retry once per server process. */
export function startOutbox(): void {
  const g = globalThis as { __hpOutbox?: boolean };
  if (!DIR || g.__hpOutbox) return;
  g.__hpOutbox = true;
  setInterval(() => { void flushOutbox(); }, EVERY_MS).unref?.();
  setTimeout(() => { void flushOutbox(); }, 30_000).unref?.();
}
