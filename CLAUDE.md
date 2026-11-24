# CLAUDE.md — rules for any Claude Code session in `sites`

Two white-label site templates on the CRM: `apps/hp` and `apps/rewize`, shared code in
`packages/kit`. Knowledge base: clone **`hp-system/ssot`** next to this repo and read
`ssot/docs/HUB.md` and `ssot/CONTRIBUTING.md` before the first change.

**Team rules for every session (import — requires `ssot` cloned next to this repo):**

@../ssot/docs/00_meta/team-rules-for-claude.md

If the import does not load, open that file and read it before anything else.

## Where to look — by task (read before you start)
Paths are in the `ssot` clone next to this repo (`../ssot/docs/`). The full router with code files is `HUB.md` §3;
this table sends you there by the kind of work. Agents you start get the row that matches their task.

| Task | Read first | Then |
|---|---|---|
| Any visual change (layout, colour, type, spacing, motion, photos) | `40_frontend/fe-design-rules.md` | the page's note below; checklist §12 |
| A page or block of HP (home, list, property, guides, info pages) | `HUB.md` §3 → `fe-home-page`, `fe-listing-facets`, `fe-property-page`, `fe-content-pages` | `fe-design-rules.md` §9 page recipes |
| Texts and languages | `40_frontend/fe-i18n.md` | all 9 languages (rule 5) |
| SEO (titles, H1/H2, meta, hreflang, sitemap, redirects) | `70_seo/seo-build-spec.md`, `40_frontend/fe-seo-layer.md`, `70_seo/seo-redirects.md` | George's spec texts verbatim |
| Members, sign-in, panel | `40_frontend/fe-members-ui.md`, `50_backend/be-member-auth.md` | visibility, rule 3 |
| Photos | `40_frontend/fe-photos-media.md` | rule 4 (logo only on property cards / page) |
| The CRM, its API or admin (George's `ealida`) | `50_backend/be-overview.md`, `be-site-api-contract.md`, `be-change-requests.md` | **read-only**: a change is a request to George |
| Release, deploy, server | `80_operations/ops-deploy-runbook.md`, `ops-release-state.md` | Workflow §1, rule 6 |
| Run or test locally | `80_operations/ops-local-dev.md`, `ops-verification.md` | full data loaded before showing |
| Documentation, decisions, diaries | `00_meta/conventions.md`, `00_meta/team-rules-for-claude.md` | one subject per note, links both ways |
| Rewize | `HUB.md` §3 (Rewize row) | deploys only by Sergei, from GitHub |

## Workflow
1. Binding rules: `ssot/ENGINEERING.md`. Work only on a branch from `dev` named `<type>/<issue>-<slug>` (`feature/`, `fix/`, `refactor/`, `test/`, `chore/`; `hotfix/` from `main`). **Never push to `main` or `dev`.** Merging into `main` ships to the server: before it, **stop and ask your user** what ships, say it becomes the next server update and what was or was not tested, and wait for a clear yes (`ssot/ENGINEERING.md` §5). Conventional Commits with scope `hp` / `rewize` / `kit`.
2. One topic per PR to `dev`, template filled, CI green, then squash-merge. **Never request a reviewer** unless your user asks and names who.
3. Touch only your template's folder. `packages/kit` (all data access and integration) belongs to Sergei: other developers request changes by issue.
4. Run `corepack pnpm build` and the tests before opening a PR.
5. Document the change in `ssot`: one change file (`docs/10_governance/changelog/changelog-scheme.md`); decisions as ADR/decision files. Never renumber or rewrite existing entries.

## Hard rules (non-negotiable)
1. **Nothing is deleted:** archive, rename to `.old_YYYYMMDD`, or supersede.
2. **No secrets** in code, commits, PRs, issues, logs or chat: no passwords, tokens, keys, `.env` values.
3. **Visibility:** guests never see exact area, coordinates or address. Only the municipality. Guest pages read only guest fields. Member-tier data (area, exact location) comes only from the CRM API with the member's token. Owner data never reaches a site (D-174) — one exception (George 2026-11-23, option b): a signed-in member reads their own properties, read-only, uncached (`member/properties`).
4. **The logo watermark is on property cards and the property page only** (gallery, big photo, a property's share image), in every size; every other photo uses the clean files (Sergei + George 2026-11-23, #326). Never put a real photo URL in a page for a locked photo.
5. **All languages:** every text, label and route ships in every language the site publishes. Never one language only.
6. **No production actions** unless your user is George or Sergei (the only people with server access): deploys, servers, Cloudflare/DNS. After a merge into `main`, tell George or Sergei that the tag is ready to deploy.
7. The CRM's internal name never appears in public artefacts: page source, public URLs, meta tags, public repos.
8. **Verify on full data, not on a sample.** Check the live response, not a description.
