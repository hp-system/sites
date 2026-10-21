# ═══════════════════════════════════════════════════════════════════════════
# Το ΝΕΟ site της halkidikiproperties.com — Astro 5 SSR, node standalone.
#
# ΓΙΑΤΙ ΥΠΑΡΧΕΙ: ως τις 29/7 το site σερβιριζόταν ΑΠΟ ΤΟΝ MAC του George μέσω
# tunnel. Κάθε φορά που έκλεινε ο υπολογιστής, το δημόσιο link **πέθαινε** — και
# το link είχε ήδη σταλεί σε τρίτους. Απόφαση George 29/7: φεύγει από τον Mac.
#
# ⚠️ ΞΕΧΩΡΙΣΤΟ ΑΠΟ ΤΟ `Dockerfile.site` ΤΟΥ MONOREPO. Εκείνο χτίζει το `apps/web`
#    (το παλιό mirror, θύρα 4321). Αυτό χτίζει το `~/EALIDA/site` (`@ealida/hp-site`),
#    που είναι **αυτόνομο pnpm workspace** και ΔΕΝ ζει μέσα στο monorepo.
#    Τα δύο δεν μοιράζονται lockfile ούτε node_modules.
#
# ΘΥΡΑ 4331 — ίδια με τον Mac, ώστε ρυθμίσεις και σημειώσεις να μη διαφέρουν.
# ═══════════════════════════════════════════════════════════════════════════
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app

# Πρώτα μόνο τα manifests: έτσι το `pnpm install` ξαναχτίζεται μόνο όταν
# αλλάξουν εξαρτήσεις, όχι σε κάθε αλλαγή κώδικα.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# 🪤 `--ignore-scripts` ΡΗΤΑ, ΑΛΛΙΩΣ ΤΟ BUILD ΣΤΑΜΑΤΑΕΙ ΤΕΛΕΙΩΣ.
#    Το pnpm 10 μπλοκάρει από μόνο του τα postinstall των `esbuild` και `sharp`
#    και βγάζει `ERR_PNPM_IGNORED_BUILDS` — που σε μη-διαδραστικό περιβάλλον
#    (Docker) είναι **σφάλμα**, όχι προειδοποίηση, και το image δεν χτίζεται.
#    Ούτε το `onlyBuiltDependencies` στο `pnpm-workspace.yaml` ούτε στο
#    `package.json` το παρακάμπτει· δοκιμάστηκαν και τα δύο.
#    Δεν χάνουμε τίποτα: και τα δύο πακέτα κατεβάζουν **έτοιμα binaries** για
#    linux/arm64 — το postinstall τους απλώς τα τοποθετεί, και το κάνει ούτως ή
#    άλλως το ίδιο το πακέτο κατά την πρώτη χρήση.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
# B-10: the canonical/sitemap origin is fixed at build time (astro.config.mjs `site`). Explicit,
# so a brand build can pass its own: docker compose build --build-arg SITE_URL=https://…
ARG SITE_URL=https://www.halkidikiproperties.com
ENV SITE_URL=$SITE_URL
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules

# 🪤 Ο ΚΡΙΣΙΜΟΣ ΦΥΛΑΚΑΣ ΤΟΥ SEO ΕΞΑΡΤΑΤΑΙ ΑΠΟ ΤΟ HOSTNAME, ΟΧΙ ΑΠΟ ΤΟ ΠΕΡΙΒΑΛΛΟΝ.
#    Το `lib/seo.ts` κρίνει «είμαστε σε production;» από το `x-forwarded-host`.
#    Όσο το site σερβίρεται σε οτιδήποτε άλλο από το halkidikiproperties.com,
#    κάθε σελίδα εκπέμπει μόνη της `noindex, nofollow` και το sitemap δίνει 404.
#    Άρα η μεταφορά στο box ΔΕΝ κινδυνεύει να μπει κατά λάθος στη Google.
ENV HOST=0.0.0.0
ENV PORT=4331
# Persistent anonymous consent counts (#52): docker-compose mounts a named volume here. The folder
# exists in the image owned by `node`, so a new volume starts with the right owner.
ENV CONSENT_STAT_DIR=/data/consent-stats
RUN mkdir -p /data/consent-stats && chown -R node:node /data
COPY --from=build /app/scripts/consent-report.mjs ./scripts/consent-report.mjs
EXPOSE 4331
USER node
CMD ["node", "./dist/server/entry.mjs"]
