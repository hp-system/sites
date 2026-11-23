# CLAUDE.md — rules for any Claude Code session in `sites`

Two white-label site templates on the CRM: `apps/hp` and `apps/rewize`, shared code in
`packages/kit`. Knowledge base: clone **`hp-system/ssot`** next to this repo and read
`ssot/docs/HUB.md` and `ssot/CONTRIBUTING.md` before the first change.

**Team rules for every session (import — requires `ssot` cloned next to this repo):**

@../ssot/docs/00_meta/team-rules-for-claude.md

If the import does not load, open that file and read it before anything else.

## Workflow
1. Binding rules: `ssot/ENGINEERING.md`. Work only on a branch from `dev` named `<type>/<issue>-<slug>` (`feature/`, `fix/`, `refactor/`, `test/`, `chore/`; `hotfix/` from `main`). **Never push to `main` or `dev`.** Merging into `main` ships to the server: before it, **stop and ask your user** what ships, say it becomes the next server update and what was or was not tested, and wait for a clear yes (`ssot/ENGINEERING.md` §5). Conventional Commits with scope `hp` / `rewize` / `kit`.
2. One topic per PR to `dev`, template filled, CI green, then squash-merge. **Never request a reviewer** unless your user asks and names who.
3. Touch only your template's folder. `packages/kit` (all data access and integration) belongs to Sergei: other developers request changes by issue.
4. Run `corepack pnpm build` and the tests before opening a PR.
5. Document the change in `ssot`: one change file (`docs/10_governance/changelog/changelog-scheme.md`); decisions as ADR/decision files. Never renumber or rewrite existing entries.

## Hard rules (non-negotiable)
1. **Nothing is deleted:** archive, rename to `.old_YYYYMMDD`, or supersede.
2. **No secrets** in code, commits, PRs, issues, logs or chat: no passwords, tokens, keys, `.env` values.
3. **Visibility:** guests never see exact area, coordinates or address. Only the municipality. Guest pages read only guest fields. Member-tier data (area, exact location) comes only from the CRM API with the member's token. Owner data never reaches a site (D-174).
4. **The logo watermark is on property cards and the property page only** (gallery, big photo, a property's share image), in every size; every other photo uses the clean files (Sergei + George 2026-11-23, #326). Never put a real photo URL in a page for a locked photo.
5. **All languages:** every text, label and route ships in every language the site publishes. Never one language only.
6. **No production actions** unless your user is George or Sergei (the only people with server access): deploys, servers, Cloudflare/DNS. After a merge into `main`, tell George or Sergei that the tag is ready to deploy.
7. The CRM's internal name never appears in public artefacts: page source, public URLs, meta tags, public repos.
8. **Verify on full data, not on a sample.** Check the live response, not a description.
