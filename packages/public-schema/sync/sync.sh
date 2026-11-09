#!/bin/sh
# Interim sender CRM → public DB (P3 phase C, Sergei 2026-11-09: «Временный отправщик»).
# Runs on rw-core. Reads the CRM's own guest feed `/api/site/properties` (the whitelist in
# ealida apps/api/src/site/public-fields.ts decides every field) once for everyone and once for
# Greece, and writes it into `pub.property` on the public DB over WireGuard + TLS (verify-full).
# The public server never connects to the CRM; this sender only pushes.
# A pull that does not reach the feed's `total` writes nothing (no deletes from a partial feed).
# Replaced by the CRM's own worker (outbox) when George builds it.
set -eu

API=${API:-http://10.90.0.1:3020/api}
INTERVAL=${INTERVAL:-120}
WORK=/tmp/sync
mkdir -p "$WORK"

log() { echo "$(date -u +%FT%TZ) $*"; }

# pull <country or empty> <out.ndjson> → one JSON object per line, in feed order
pull() {
  country=$1; out=$2; : > "$out"; page=1; got=0
  while :; do
    if [ -n "$country" ]; then
      curl -fsS --max-time 60 -H "accept: application/json" -H "x-visitor-country: $country" \
        "$API/site/properties?limit=60&page=$page" -o "$WORK/page.json"
    else
      curl -fsS --max-time 60 -H "accept: application/json" \
        "$API/site/properties?limit=60&page=$page" -o "$WORK/page.json"
    fi
    total=$(jq '.total' "$WORK/page.json")
    n=$(jq '.items | length' "$WORK/page.json")
    jq -c '.items[]' "$WORK/page.json" >> "$out"
    got=$((got + n))
    [ "$got" -ge "$total" ] || [ "$n" -eq 0 ] && break
    page=$((page + 1))
    [ "$page" -le 200 ] || { log "runaway pull stopped at page $page"; return 1; }
  done
  [ "$got" -eq "$total" ] || { log "incomplete pull ($country): $got of $total"; return 1; }
  echo "$got"
}

once() {
  started=$(date -u +%FT%TZ)
  n_all=$(pull "" "$WORK/all.ndjson") || return 1
  n_gr=$(pull GR "$WORK/gr.ndjson") || return 1
  # COPY in CSV mode with quote/delimiter bytes that never occur in jq's compact output.
  psql -X -q -v ON_ERROR_STOP=1 -v started="$started" -v n_all="$n_all" -v n_gr="$n_gr" <<'SQL'
begin;
create temp table s_all (n bigserial, doc jsonb) on commit drop;
create temp table s_gr  (doc jsonb) on commit drop;
\copy s_all (doc) from '/tmp/sync/all.ndjson' with (format csv, quote e'\x01', delimiter e'\x02')
\copy s_gr  (doc) from '/tmp/sync/gr.ndjson'  with (format csv, quote e'\x01', delimiter e'\x02')
create temp view s_ref as
  select coalesce(doc->'attributes'->>'onsea_id', doc->>'reference', left(doc->>'id', 6)) as ref, n, doc from s_all;
create temp table s_rows on commit drop as
  select distinct on (ref) ref, n::int as ord,
         case when (doc->>'locked')::boolean then 'member' else 'guest' end as visibility,
         exists (select 1 from s_gr g where g.doc->>'id' = s.doc->>'id') as gr_visible,
         doc, (doc->>'updatedAt')::timestamptz as source_updated_at
  from s_ref s
  where ref ~ '^[A-Za-z]{0,3}-?[0-9]{1,6}$'
  order by ref, n;
with up as (
  insert into pub.property as p (ref, ord, visibility, gr_visible, doc, source_updated_at, synced_at)
  select ref, ord, visibility, gr_visible, doc, source_updated_at, now() from s_rows
  on conflict (ref) do update set
    ord = excluded.ord, visibility = excluded.visibility, gr_visible = excluded.gr_visible,
    doc = excluded.doc, source_updated_at = excluded.source_updated_at, synced_at = now()
  where (p.ord, p.visibility, p.gr_visible, p.doc) is distinct from
        (excluded.ord, excluded.visibility, excluded.gr_visible, excluded.doc)
  returning 1
), del as (
  delete from pub.property where ref not in (select ref from s_rows) returning 1
)
insert into pub.sync_run (started_at, rows_all, rows_gr, changed, deleted, source)
select :'started'::timestamptz, :n_all, :n_gr, (select count(*) from up), (select count(*) from del), 'interim-feed-sync';
commit;
select 'sync ok: all=' || rows_all || ' gr=' || rows_gr || ' changed=' || changed || ' deleted=' || deleted
  from pub.sync_run order by id desc limit 1;
SQL
}

log "interim sync: $API → $PGHOST/$PGDATABASE as $PGUSER every ${INTERVAL}s"
while :; do
  t0=$(date +%s)
  if out=$(once 2>&1); then log "$out ($(( $(date +%s) - t0 )) s)"; else log "sync FAILED: $out"; fi
  [ "${ONCE:-0}" = 1 ] && exit 0
  sleep "$INTERVAL"
done
