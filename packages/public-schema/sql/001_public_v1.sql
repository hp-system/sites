-- public_v1 — the contract between the CRM (producer) and the sites (readers) in the public DB
-- on rw-front-web (`public-db`, database `pubdb`). Applied by the DB owner (`postgres`), idempotent.
--
-- What may live here (D-174, D-20261020-GT-2, R-006): only what the CRM's guest feed already
-- shows a visitor. A secret-portfolio property is a row like any other, with `visibility` above
-- `guest`; its `doc` holds only the locked card's fields, exactly as the guest feed sends it.
-- Never here: owners, contacts, documents, deals, minimum price, exact area or coordinates for a
-- guest, member accounts, codes.
--
-- Layout: base tables in the private schema `pub` (only the sync role writes them); sites read the
-- views in `public_v1` and have no rights on `pub`. A later contract is a new schema
-- (`public_v2`) next to this one, so readers move one at a time.
-- Rejected: one table per field group (the guest feed is already the shape the sites render;
-- splitting it would be a second whitelist to keep in step with the CRM's `public-fields.ts`).
begin;

create schema if not exists pub authorization postgres;
create schema if not exists public_v1 authorization postgres;
revoke all on schema public from public;
revoke all on schema pub from public;

create table if not exists pub.property (
  ref               text primary key check (ref ~ '^[A-Za-z]{0,3}-?[0-9]{1,6}$'),  -- public id in the URL
  ord               integer not null,             -- position in the CRM feed (newest first)
  visibility        text not null default 'guest' check (visibility in ('guest', 'member', 'exclusive')),
  gr_visible        boolean not null default true, -- energy-certificate rule for visitors from Greece (D-20261104-GT-2)
  doc               jsonb not null,               -- the property exactly as the CRM guest feed sends it
  source_updated_at timestamptz,                  -- `updatedAt` from the CRM, when it sends one
  synced_at         timestamptz not null default now()  -- last time this row changed here
);

create table if not exists pub.sync_run (
  id          bigserial primary key,
  started_at  timestamptz not null,
  finished_at timestamptz not null default now(),
  rows_all    integer not null,   -- rows in the feed for everyone
  rows_gr     integer not null,   -- rows in the feed for Greece
  changed     integer not null,
  deleted     integer not null,
  source      text not null       -- which sender wrote it, e.g. 'interim-feed-sync'
);

create or replace view public_v1.property as
  select ref, ord, visibility, gr_visible, doc, source_updated_at, synced_at from pub.property;

-- One row: when the data last changed and when the last sync finished. A site polls this and
-- reloads the properties only when `changed_at` moves.
create or replace view public_v1.sync_state as
  select (select max(synced_at) from pub.property)  as changed_at,
         (select max(finished_at) from pub.sync_run) as last_sync;

-- Grants. Roles exist already (created with the server, 2026-10-21); passwords live only in the
-- servers' env files (R-015).
grant usage on schema pub to sync_writer;
grant select, insert, update, delete on pub.property to sync_writer;
grant select, insert on pub.sync_run to sync_writer;
grant usage on sequence pub.sync_run_id_seq to sync_writer;

grant usage on schema public_v1 to site_hp_guest, site_hp_member, site_hp_exclusive;
grant select on public_v1.property, public_v1.sync_state to site_hp_guest, site_hp_member, site_hp_exclusive;

commit;
