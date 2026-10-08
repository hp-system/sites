#!/bin/bash
# Dev server του νέου site. Ξεχωριστή θύρα (4330) από το mirror (4321),
# ώστε να τρέχουν και τα δύο μαζί όσο συγκρίνουμε.
cd "$(dirname "$0")" || exit 1
exec ./node_modules/.bin/astro dev --port "${PORT:-4330}" --host
