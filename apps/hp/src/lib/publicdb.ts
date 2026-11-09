// ───────────────────────────────────────────────────────────────────────────
// The public DB reader (P3 phase D, sites#174). The site reads the guest property sets from the
// public DB on its own server (`public-db`, view `public_v1.property`), never from the CRM
// database. The CRM side keeps it filled (interim sender on rw-core, `packages/public-schema`).
// Member-tier data stays on the CRM API (D-174).
//
// On when PUBLIC_DB_HOST and PUBLIC_DB_PASSWORD are set (the server's env file); off in local dev
// and in the tests, where the CRM API path is used as before.
// Rejected: reading through `packages/kit` now — the image is built from `apps/hp` alone, so a
// workspace package is not in the build context yet; this file moves to `kit` when it is.
// ───────────────────────────────────────────────────────────────────────────
import pg from 'pg';
import { readFileSync } from 'node:fs';

const env = (k: string): string | undefined => process.env[k] ?? (import.meta.env as Record<string, string | undefined>)[k];

const HOST = env('PUBLIC_DB_HOST');
const PASSWORD = env('PUBLIC_DB_PASSWORD');
export const publicDbOn = !!HOST && !!PASSWORD;

let pool: pg.Pool | null = null;
function db(): pg.Pool {
  if (pool) return pool;
  const ca = env('PUBLIC_DB_CA');
  pool = new pg.Pool({
    host: HOST, port: Number(env('PUBLIC_DB_PORT') ?? 5432), database: env('PUBLIC_DB_NAME') ?? 'pubdb',
    user: env('PUBLIC_DB_USER') ?? 'site_hp_guest', password: PASSWORD,
    max: 2, connectionTimeoutMillis: 3_000, query_timeout: 15_000, idleTimeoutMillis: 60_000,
    // TLS with the server certificate checked against our own CA (verify-full).
    ssl: ca ? { ca: readFileSync(ca, 'utf8'), servername: HOST, rejectUnauthorized: true } : { rejectUnauthorized: true },
  });
  pool.on('error', (e) => console.error(`[hp-site] public DB pool: ${e.message}`));
  return pool;
}

/** When the data last changed (moves only when the sender wrote a change). Tiny query. */
export async function publicChangedAt(): Promise<string | null> {
  const r = await db().query<{ changed_at: Date | null }>('select changed_at from public_v1.sync_state');
  return r.rows[0]?.changed_at?.toISOString() ?? null;
}

/** Both guest sets in feed order: everyone, and Greece (energy-certificate rule). */
export async function publicSets<T>(): Promise<{ all: T[]; gr: T[]; changedAt: string | null }> {
  const [rows, at] = await Promise.all([
    db().query<{ gr_visible: boolean; doc: T }>('select gr_visible, doc from public_v1.property order by ord'),
    publicChangedAt(),
  ]);
  return { all: rows.rows.map((r) => r.doc), gr: rows.rows.filter((r) => r.gr_visible).map((r) => r.doc), changedAt: at };
}
