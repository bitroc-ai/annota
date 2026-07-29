# Annota 0.11 Atomic Delivery Decision

- Status: accepted
- Date: 2026-07-27
- Scope: `refactor-all`

## Context

The original analysis and task contracts describe the compatibility rules for a
pre-1.0 minor-version migration. This delivery packages the completed refactoring
scope as one atomic pre-1.0 release while retaining the former root React surface
through the explicit `annota/legacy-react` compatibility entry.

## Decision

Ship this atomic delivery as `annota@0.11.0`.

- `annota` is framework-neutral and does not statically load React or Svelte.
- `annota/react` is the canonical React entry.
- `annota/svelte` is the canonical Svelte entry.
- `annota/legacy-react` is the complete migration proxy for the old package-root
  surface: it re-exports framework-neutral core, tools, and loaders and preserves
  the former React names with generated `@deprecated` declarations.
- The compatibility proxy is planned for removal in 2.0.0.

This is a pre-1.0 compatibility transition. The original 1.0 roadmap remains a
future stabilization target rather than the version assigned to this release.

## Verification

Package consumer fixtures must prove that:

1. a core-only consumer installs and imports `annota` without React;
2. React and Svelte consumers use their canonical subpaths;
3. the legacy consumer can import both framework-neutral and former React APIs
   from `annota/legacy-react`;
4. the generated legacy declarations contain the deprecation metadata.
