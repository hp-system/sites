# Interim sender CRM → public DB (see sync.sh). psql comes with the Postgres image; curl + jq added.
FROM postgres:17-alpine
RUN apk add --no-cache curl jq
COPY sync.sh /usr/local/bin/sync.sh
RUN chmod 0755 /usr/local/bin/sync.sh
USER postgres
ENTRYPOINT ["/usr/local/bin/sync.sh"]
