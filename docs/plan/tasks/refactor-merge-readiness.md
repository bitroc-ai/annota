---
id: refactor-merge-readiness
scope: annota
status: done
depends-on: [refactor-all, refactor-followup]
---

# Annota 1.0 merge-readiness fixes

## Objective

Close the blocking findings found while reviewing `v2` for merge into `main`:

- make the full Vitest suite reliable under its normal parallel workload;
- bind the release tag/dispatch version to `package.json`;
- make changelog generation idempotent for an existing release version;
- make Path annotation snapshots deeply immutable, including control handles;
- correct the known-consumer audit and the 1.0 migration wording;
- leave the branch clean under `git diff --check`.

This is a review-fix task on top of the `v2` delivery branch. It does not publish,
merge to `main`, or modify the separate BitPath repository.

## Context

- `docs/INDEX.md`
- `docs/plan/README.md`
- `docs/plan/analysis/annota-refactoring.md`
- `docs/plan/analysis/manager-domain-usage-audit.md`
- `docs/plan/decisions/annota-1.0-atomic-delivery.md`
- `docs/src/content/docs/guides/migration-1-0.mdx`
- `PUBLISHING.md`

## Path

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `scripts/generate-changelog.mjs`
- `scripts/validate-release-version.mjs`
- `scripts/validate-release-package-version.mjs`
- `src/core/normalization.ts`
- `test/core/store.test.ts`
- `test/docs/delivery-contract.test.ts`
- `test/docs/import-contract.test.ts`
- `docs/plan/analysis/manager-domain-usage-audit.md`
- `docs/plan/reviews/refactor-followup.md`
- `docs/src/content/docs/guides/migration-1-0.mdx`
- `PUBLISHING.md`

## Contract

- The publish workflow must fail before changelog mutation or publication when
  the validated release version differs from `package.json.version`.
- Regenerating the same changelog version must replace that version's section,
  never append a duplicate.
- Every object reachable through a normalized Path annotation snapshot must be
  detached and frozen, including `handleIn` and `handleOut`.
- Scanner tests may use an explicit timeout sized for their subprocess workload;
  the normal full-suite command must pass without disabling coverage.
- The consumer audit must record the BitPath `^0.10.11` dependency and its root
  React imports, while making clear that 1.0 is excluded by the current range and
  requires an explicit migration to `annota/react` or `annota/legacy-react`.

## Verification

```bash
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm test:browser
pnpm test:frameworks
pnpm test:consumer
pnpm benchmark:ci
pnpm check:docs-imports
pnpm --dir docs install --frozen-lockfile
pnpm --dir docs build
git diff --check v2...HEAD
```
