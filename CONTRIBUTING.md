# Contributing to `sites`

**Binding rules: `ENGINEERING.md` in `hp-system/ssot`** (branches, commits, PRs, releases, hotfix, Definition of Done). Team and roles: `ssot/CONTRIBUTING.md`.

Short version for this repo:
1. Issue on the board "Company roadmap" (Brand: HP / Rewize) → branch from `dev`: `feature/<issue>-<slug>`, `fix/…`, `refactor/…`, `test/…`, `chore/…` (`hotfix/…` from `main`). Put the area in the slug: `feature/42-hp-search-filters`.
2. Work only in your template (`apps/hp` or `apps/rewize`). Review: Rewize developers review each other; HP by George or Sergei; `packages/kit` (data layer, integration) is owned by Sergei: changes need his approval, Rewize asks for what it needs through an issue; `.github/` by Sergei.
3. Conventional Commits with scope `hp`, `rewize` or `kit`.
4. PR to `dev`, template filled, CI green, **one approval from someone else**, you squash-merge.
5. Releases: release manager opens `dev → main`, tags `hp-vX.Y.Z` / `rewize-vX.Y.Z`, deploys. Nobody else touches `main`.
