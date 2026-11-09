# public-schema — the public DB contract `public_v1`

The CRM publishes guest-safe data into the public DB on the cloud server (rw-front-web, container
`public-db`, database `pubdb`); the sites read only that DB, never the CRM database
(plan: ssot `plan-p3-public-db-whitelabel`; decisions D-174, D-20261020-GT-2, D-20261109-SS-1).

| Path | What |
|---|---|
| `sql/001_public_v1.sql` | schema `pub` (base tables, written only by `sync_writer`) and `public_v1` (views the sites read), grants. Idempotent; applied by `postgres` on `pubdb`. |
| `sync/` | **interim** sender on rw-core: reads the CRM guest feed `/api/site/properties` for everyone and for Greece every 2 min and pushes it into `pub.property` over WireGuard + TLS. Replaced by the CRM's own outbox worker later. |

Rules: only what the CRM guest feed shows a visitor is stored here; secret-portfolio rows carry
`visibility` above `guest` and only the locked card's fields; member-tier data stays on the CRM API.
Secrets live only in the servers' env files.
