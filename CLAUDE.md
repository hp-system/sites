# CLAUDE.md — rules for any Claude Code session in `sites`

Two white-label site templates on the CRM: `apps/hp` and `apps/rewize`, shared code in
`packages/kit`. Knowledge base: clone **`hp-system/ssot`** next to this repo and read
`ssot/docs/HUB.md` and `ssot/CONTRIBUTING.md` before the first change.

## Workflow
1. Work only on a branch from `dev`: `hp/…`, `rewize/…` or `kit/…`. **Never push to `main`; never merge to `main`** (release manager only).
2. One topic per PR; PR to `dev`; say how you verified it; link the issue.
3. Touch only your template's folder unless the task is in `packages/kit`; a `kit` change is reviewed by both template teams.
4. Run `corepack pnpm build` and the tests before opening a PR.
5. Document the change in `ssot`: one change file (`docs/10_governance/changelog/changelog-scheme.md`); decisions as ADR/decision files. Never renumber or rewrite existing entries.

## Hard rules (non-negotiable)
1. **Nothing is deleted:** archive, rename to `.old_YYYYMMDD`, or supersede.
2. **No secrets** in code, commits, PRs, issues, logs or chat: no passwords, tokens, keys, `.env` values.
3. **Visibility:** guests never see exact area, coordinates or address. Only the municipality. Guest pages read only guest fields. Member-tier data (area, exact location) comes only from the CRM API with the member's token. Owner data never reaches a site (D-174).
4. **Photos of properties are always watermarked**, in every size. Never put a real photo URL in a page for a locked photo.
5. **All languages:** every text, label and route ships in every language the site publishes. Never one language only.
6. **No production actions:** no deploys, no server access, no Cloudflare/DNS changes. Those are Sergei's.
7. The CRM's internal name never appears in public artefacts: page source, public URLs, meta tags, public repos.
8. **Verify on full data, not on a sample.** Check the live response, not a description.
