# Contributing to `sites`

**Binding rules: `ENGINEERING.md` in `hp-system/ssot`** (branches, commits, PRs, releases, hotfix, Definition of Done). Team and roles: `ssot/CONTRIBUTING.md`.

Short version for this repo:
1. Issue on the board "Company roadmap" (Brand: HP / Rewize) → branch from `dev`: `feature/<issue>-<slug>`, `fix/…`, `refactor/…`, `test/…`, `chore/…` (`hotfix/…` from `main`). Put the area in the slug: `feature/42-hp-search-filters`.
2. Work only in your template (`apps/hp` or `apps/rewize`). `packages/kit` (data layer, integration) belongs to Sergei: Rewize asks for what it needs through an issue. No mandatory review. A reviewer is added only when the author asks for one and names who.
3. Conventional Commits with scope `hp`, `rewize` or `kit`.
4. PR to `dev`, template filled, CI green, you squash-merge when ready.
5. Releases: release manager opens `dev → main`, tags `hp-vX.Y.Z` / `rewize-vX.Y.Z`, deploys. Nobody else touches `main`.
