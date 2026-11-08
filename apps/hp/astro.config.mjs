import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
// The production origin comes from the brand (src/brand) — one place for every company fact.
import { brand } from './src/brand/index.ts';
// Article widgets (the cost calculator) rendered from markdown markers.
import { remarkWidgets } from './src/lib/remark-widgets.mjs';

// ───────────────────────────────────────────────────────────────────────────
// SSR με node adapter — ΟΧΙ static build.
// ΓΙΑΤΙ: η λίστα και η σελίδα ακινήτου πρέπει να είναι φρέσκες μόλις αλλάξει
// κάτι στο EALIDA. Η αρχική θα μπει σε edge cache με ετικέτα, ώστε να σερβίρεται
// σε χιλιοστά χωρίς να ξαναχτίζεται (δες Base.astro → Cache-Control).
//
// ΜΗΔΕΝ JavaScript από προεπιλογή: το Astro στέλνει καθαρό HTML. Ό,τι χρειάζεται
// διαδραστικότητα μπαίνει ως νησάκι, ρητά.
// ───────────────────────────────────────────────────────────────────────────
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: process.env.SITE_URL || brand.web.origin,
  // SEO audit 08/11: 'auto' (was 'always'): 276 KB of CSS was inlined into every page and could not be
  // cached; now the big sheets are files the browser keeps, small ones (< 4 KB) stay inline.
  build: { inlineStylesheets: 'auto' },   // ένα αίτημα λιγότερο στο κρίσιμο μονοπάτι
  compressHTML: true,
  markdown: { remarkPlugins: [remarkWidgets] },
  server: { port: 4330, host: true },
  devToolbar: { enabled: false },
  // B-24: Astro's own CSRF check compares the browser Origin with the URL the container sees.
  // Behind the Cloudflare tunnel that URL is `https://localhost` (Astro does not trust the Host
  // header without `allowedDomains`), so every same-site form POST (logout) got 403 — measured
  // on hp.rewize.app 2026-10-13. The same check now runs in src/middleware.ts against the public
  // origin (PUBLIC_ORIGIN / forwarded host). Rejected: `security.allowedDomains` — depends on a
  // Host header we cannot see and bakes the host list into the build (one image serves all hosts).
  security: { checkOrigin: false },

  // Ο χρόνος του build, καρφωμένος τη στιγμή που γίνεται — ΟΧΙ στην εκκίνηση του
  // server. Το `<lastmod>` του sitemap κρέμεται από αυτό, και η υπηρεσία έχει
  // KeepAlive: με `new Date()` σε module scope κάθε πτώση/επανεκκίνηση θα δήλωνε
  // ψευδώς «ενημερώθηκε τώρα». Δες lib/seo.ts → BUILD_TIME.
  vite: {
    define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  },
});
