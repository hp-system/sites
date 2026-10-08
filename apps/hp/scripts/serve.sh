#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Σερβίρει το ΝΕΟ site της Halkidiki Properties (production build).
#
# Το τρέχει το LaunchAgent com.gtagent.hp-site-new — σηκώνεται στο boot και
# επανεκκινείται μόνο του αν πέσει (KeepAlive).
#
# ⚠️ ΔΕΝ κάνει build. Σερβίρει ό,τι υπάρχει στο dist/. Μετά από αλλαγές:
#      cd ~/EALIDA/site && npx astro build
#      launchctl kickstart -k gui/501/com.gtagent.hp-site-new
#
# Δένεται σε 0.0.0.0 ώστε να φαίνεται και από το κινητό μέσω Tailscale
# (http://100.65.32.39:4331) — δες και `tailscale serve` στη θύρα 10443.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd /Users/gt-agent/EALIDA/site

# Αν λείπει το build, φτιάξ' το μία φορά αντί να πεθάνει σε βρόχο.
if [ ! -f dist/server/entry.mjs ]; then
  echo "[$(date '+%F %T')] δεν βρέθηκε dist/ — τρέχω build"
  /opt/homebrew/bin/npx astro build
fi

export EALIDA_API="${EALIDA_API:-http://localhost:3020/api}"
export HOST=0.0.0.0
export PORT=4331
echo "[$(date '+%F %T')] εκκίνηση στο ${HOST}:${PORT} · API ${EALIDA_API}"
exec /opt/homebrew/bin/node ./dist/server/entry.mjs
