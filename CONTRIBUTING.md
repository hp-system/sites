# How we work in `sites`

The full team agreement is in `hp-system/ssot` → `CONTRIBUTING.md`. Short version:
- Branch from `dev`: `hp/<topic>`, `rewize/<topic>`, `kit/<topic>`. Never push to `main`.
- PR to `dev`: CI green + one review; `packages/kit` needs a reviewer from each template team.
- Every PR links its issue (board "Company roadmap", field Brand) and says how it was verified.
- Documentation of the change goes to `ssot` (one change file, see `docs/10_governance/changelog/changelog-scheme.md`).
- Release: `dev` → `main` + tag `hp-v…` / `rewize-v…`, merged by Sergei; deploy by Sergei.
