# Annota 1.0 Atomic Delivery Decision

- Status: accepted
- Date: 2026-07-27
- Scope: `refactor-all`

## Context

The original analysis and task contracts describe the compatibility rules for a
minor-version migration: a minor release must retain React exports at the package
root. This delivery intentionally combines the planned 0.11, 0.12, and 1.0
milestones into one atomic major-version release, as requested by the delivery
owner. The historical minor-version constraints remain unchanged in their source
documents.

## Decision

Ship this atomic delivery as `annota@1.0.0`.

- `annota` is framework-neutral and does not statically load React or Svelte.
- `annota/react` is the canonical React entry.
- `annota/svelte` is the canonical Svelte entry.
- `annota/legacy-react` is the complete migration proxy for the old package-root
  surface: it re-exports framework-neutral core, tools, and loaders and preserves
  the former React names with generated `@deprecated` declarations.
- The compatibility proxy is planned for removal in 2.0.0.

This is a major-version compatibility transition, not a retroactive change to
the minor-version rules recorded in the analysis.

## Verification

Package consumer fixtures must prove that:

1. a core-only consumer installs and imports `annota` without React;
2. React and Svelte consumers use their canonical subpaths;
3. the legacy consumer can import both framework-neutral and former React APIs
   from `annota/legacy-react`;
4. the generated legacy declarations contain the deprecation metadata.
