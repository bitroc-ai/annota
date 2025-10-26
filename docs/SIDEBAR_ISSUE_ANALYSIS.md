# Sidebar Issue Analysis: Why Our Docs Don't Have a Sidebar

## Root Cause Identified

The sidebar is **NOT showing** because of **incorrect `type: 'page'` configuration** in `/content/_meta.ts`.

## The Problem

### Current Configuration (BROKEN)

```typescript
// content/_meta.ts
export default {
  index: {
    type: 'page', // ❌ WRONG: 'page' type items show in navbar, NOT sidebar
    display: 'hidden',
  },
  docs: {
    title: 'Documentation',
    type: 'page', // ❌ WRONG: This puts "docs" in navbar instead of sidebar
  },
  api: {
    title: 'API',
    type: 'page', // ❌ WRONG: This puts "api" in navbar instead of sidebar
  },
  github: {
    title: 'GitHub',
    href: 'https://github.com/bitroc-ai/annota',
  },
} satisfies Meta;
```

### What's Happening

According to Nextra documentation:

> **By defining a top-level page or folder as `type: 'page'`, it will be shown as a special page on the navigation bar, instead of the sidebar.**

So when we set `docs: { type: 'page' }`, Nextra:

1. ✅ Shows "Documentation" link in the **navbar** (top navigation)
2. ❌ Does **NOT** show the docs folder structure in the **sidebar**
3. ❌ The sidebar remains empty because there are no sidebar items configured

## The Solution

### Option 1: Remove `type: 'page'` (Recommended)

Make items appear in the sidebar by removing the `type: 'page'`:

```typescript
// content/_meta.ts
export default {
  index: {
    display: 'hidden',
  },
  docs: 'Documentation', // ✅ Will show in sidebar
  api: 'API', // ✅ Will show in sidebar
  github: {
    title: 'GitHub',
    href: 'https://github.com/bitroc-ai/annota',
  },
} satisfies Meta;
```

### Option 2: Use Folder-Based Navigation

If you want nested sidebar items with the current structure:

```typescript
// content/_meta.ts
export default {
  index: 'Home',
  docs: {
    title: 'Documentation',
    // Remove type: 'page' - this allows nested items
  },
  api: {
    title: 'API',
    // Remove type: 'page'
  },
  github: {
    title: 'GitHub',
    href: 'https://github.com/bitroc-ai/annota',
  },
} satisfies Meta;
```

## Comparison with Working Projects (ticos-docs)

### Working Configuration Pattern

Most Nextra projects with sidebars follow this structure:

```typescript
// Top-level _meta should NOT use type: 'page' for folders
export default {
  index: 'Introduction',
  'getting-started': 'Getting Started',
  guides: 'Guides', // ✅ Folder - shows in sidebar with nested items
  api: 'API', // ✅ Folder - shows in sidebar
};

// Then in content/docs/guides/_meta.ts (or .js)
export default {
  'quick-start': 'Quick Start',
  advanced: 'Advanced Usage',
  // These nested items appear under "Guides" in sidebar
};
```

## Current File Structure Analysis

```
content/
├── _meta.ts           ← Top level (ISSUE: uses type: 'page')
├── docs/
│   ├── _meta.ts       ← Has correct structure
│   ├── index.mdx
│   ├── getting-started.mdx
│   ├── guides/
│   │   ├── _meta.js   ← Has nested items (layers, popups)
│   │   ├── layers.mdx
│   │   └── popups.mdx
│   └── examples/      ← Empty directory
└── api/
```

### What's Working

- ✅ `content/docs/_meta.ts` correctly defines nested structure
- ✅ `content/docs/guides/_meta.js` has proper nested items
- ✅ Layout component in `app/layout.tsx` has sidebar configuration

### What's Broken

- ❌ `content/_meta.ts` uses `type: 'page'` for `docs` and `api`
- ❌ This makes them navbar items instead of sidebar sections
- ❌ The sidebar configuration in layout.tsx has no items to display

## Detailed Nextra Type System

### `type: 'page'` Behavior

- Item appears in **navbar** (top horizontal navigation)
- Item does **NOT** appear in **sidebar** (left panel)
- Used for top-level standalone pages (About, Blog, Changelog)

### Default Behavior (no type specified)

- Item appears in **sidebar**
- Can have nested items via folder structure
- Used for documentation sections

### `display: 'hidden'`

- Item is not shown in navigation at all
- Still accessible via direct URL
- Often used for index pages

## Fix Strategy

### Immediate Fix (5 minutes)

Edit `/content/_meta.ts`:

```typescript
import type { Meta } from 'nextra';

export default {
  index: {
    display: 'hidden',
  },
  docs: 'Documentation', // Changed: removed type + object wrapper
  api: 'API', // Changed: removed type + object wrapper
  github: {
    title: 'GitHub',
    href: 'https://github.com/bitroc-ai/annota',
  },
} satisfies Meta;
```

### Result After Fix

- ✅ "Documentation" appears in sidebar
- ✅ Clicking "Documentation" shows nested items:
  - Introduction
  - Getting Started
  - Guides (expandable)
    - Layer System
    - Popup System
- ✅ "API" appears in sidebar
- ✅ Sidebar behaves like ticos-docs

## Additional Configuration Check

The `app/layout.tsx` already has correct sidebar configuration:

```typescript
sidebar={{
  defaultMenuCollapseLevel: 1,
  autoCollapse: true,
  defaultOpen: true,
  toggleButton: true,
}}
```

This configuration is fine - the issue is purely in the `_meta.ts` type specification.

## References

- [Nextra Page Configuration](https://nextra.site/docs/docs-theme/page-configuration)
- [Nextra type: 'page' documentation](https://nextra.site/docs/docs-theme/page-configuration#pages)
- [GitHub Issue #2935: Not working sidebar and toc](https://github.com/shuding/nextra/issues/2935)
