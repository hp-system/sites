# Contributing to `sites`

**Binding rules: `ENGINEERING.md` in `hp-system/ssot`** (branches, commits, PRs, releases, hotfix, Definition of Done). Team and roles: `ssot/CONTRIBUTING.md`.

Short version for this repo:
1. Issue on the board "Company roadmap" (Brand: HP / Rewize) → branch from `dev`: `feature/<issue>-<slug>`, `fix/…`, `refactor/…`, `test/…`, `chore/…` (`hotfix/…` from `main`). Put the area in the slug: `feature/42-hp-search-filters`.
2. Work only in your template (`apps/hp` or `apps/rewize`). `packages/kit` (data layer, integration) is Sergei's area: Rewize asks for what it needs through an issue. Review is optional: only when you ask for one and name who.
3. Conventional Commits with scope `hp`, `rewize` or `kit`.
4. PR to `dev`, template filled, CI green, you squash-merge.
5. Releases: anyone opens and merges `dev → main` **after their Claude has asked them and they confirmed what ships** (`ssot/ENGINEERING.md` §5); tag `hp-vX.Y.Z` / `rewize-vX.Y.Z`; George or Sergei deploys (server access).
