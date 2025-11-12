# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Annota is a high-performance React annotation framework for large-scale images, designed for digital pathology and whole slide imaging. It's built on OpenSeadragon (viewer) and PixiJS (WebGL rendering), optimized to handle 10,000+ annotations at 60 FPS.

## Common Commands

### Development
```bash
# RECOMMENDED: Run library + docs with hot reload
pnpm dev                  # Runs library in watch mode + docs dev server (port 6006)
                         # Changes to src/ automatically rebuild and reload docs

# Individual commands
pnpm dev:lib             # Build library in watch mode only
pnpm dev:docs            # Start docs dev server only

# Type checking (use this instead of pnpm build during development)
pnpm typecheck

# Run tests
pnpm test                # Interactive watch mode
pnpm test run            # Run once
vitest run               # Alternative

# Build library (WARNING: breaks dev server - use tsc --noEmit instead)
pnpm build               # Only build when necessary
```

### Documentation Site
```bash
# Build commands
pnpm build:docs          # Build both library and docs (for deployment)
pnpm start:docs          # Serve built static site
```

### Publishing
```bash
# IMPORTANT: Before creating version tags, always verify docs build passes
pnpm build:docs           # Builds library + docs, validates TypeScript

# Create version and tag (see PUBLISHING.md for full workflow)
pnpm version patch        # 0.2.0 → 0.2.1
git push origin main --follow-tags

# GitHub Actions automatically handles:
# - Type checking and tests
# - Build
# - Changelog generation
# - NPM publish
# - GitHub release
```

## Architecture

### Core Layers (Framework-agnostic)

1. **Core System** (`src/core/`)
   - `store.ts`: Observable annotation store with CRUD operations
   - `spatial.ts`: R-tree spatial index for fast O(log n) queries
   - `layer.ts`: Multi-layer management with visibility/opacity/locking
   - `history.ts`: Undo/redo with command pattern (CreateCommand, UpdateCommand, DeleteCommand, BatchCommand)
   - `types.ts`: Annotation shapes (Point, Rectangle, Polygon, MultiPolygon, Circle), bounds calculations

2. **Adapter Layer** (`src/adapters/openseadragon/`)
   - `annotator.ts`: Main OpenSeadragonAnnotator class - orchestrates store, layerManager, history, rendering
   - `adapter.ts`: Creates annotator instances for OSD viewer
   - `coordinates.ts`: Coordinate transformations between OSD viewport and image space

3. **Rendering Layer** (`src/rendering/pixi/`)
   - `stage.ts`: PixiStage class manages WebGL rendering with viewport culling
   - `shapes.ts`: Shape rendering logic for each annotation type
   - `styles.ts`: Style expression evaluation and computation
   - Performance optimizations: viewport culling, level-of-detail, render caching

### React Integration (`src/react/`)

- **Provider**: `AnnotaProvider` creates annotator context, `useAnnotator()` accesses it
- **Components**: `AnnotaViewer` (OSD wrapper), `Annotator` (orchestrates rendering/events), `AnnotationPopup`, `ContextMenu`
- **Hooks**: 20+ hooks for annotations, selection, tools, layers, history, editing
- **Editors**: Shape-specific editors (PointEditor, RectangleEditor, PolygonEditor) for vertex manipulation

### Tools System (`src/tools/`)

All tools extend `BaseTool` class with lifecycle methods:
- `PointTool`: Click to create point markers
- `RectangleTool`: Drag to create rectangles
- `PolygonTool`: Click to add vertices, close polygon
- `PushTool`: Interactive vertex manipulation
- `ContourTool`: Automated contour detection (requires OpenCV.js)

### Data Loaders (`src/loaders/`)

- `h5.ts` / `h5-coordinates.ts`: Load from HDF5 files (uses jsfive)
- `pgm.ts`: Load/save PGM mask files
- `masks.ts`: Convert binary masks to polygons
- `json.ts`: Load annotations from JSON

## Important Conventions

### Coordinate Systems
- **Image coordinates**: Native image pixel coordinates (what's stored in annotations)
- **Viewport coordinates**: OpenSeadragon viewport coordinates (normalized)
- Always use `pointerEventToImage()` from `coordinates.ts` to convert events to image space

### State Management
- Single source of truth: `AnnotationStore` in annotator.state.store
- Observable pattern: store.observe() for change notifications
- React hooks wrap store subscriptions for automatic updates
- History manager wraps store operations to enable undo/redo

### Layer System
- Layers are independent with their own visibility/opacity/filter/lock state
- Use `LayerManager` (annotator.state.layerManager) for layer operations
- Annotations have `layerId` property; filter by layer using mask polarity filters
- Special filters: `createPositiveMaskFilter`, `createNegativeMaskFilter`

### Styling System
- Styles can be static objects or functions (StyleExpression)
- Dynamic styles receive annotation + state (hover/selected) as arguments
- Computed in `computeStyle()` before rendering
- Style properties: strokeColor, strokeWidth, fillColor, fillOpacity, etc.

## Documentation Site (Nextra + Next.js 15)

### Structure
```
docs/
├── app/                     # Next.js App Router
│   └── [[...mdxPath]]/      # Dynamic MDX routing
├── content/                 # MDX content files
│   ├── docs/               # Main docs
│   │   ├── getting-started/
│   │   ├── guides/
│   │   ├── use-cases/
│   │   └── changelog/
│   └── api/                # API reference
└── components/             # React components for docs
```

### Important File Naming
- **Use underscores, not periods in MDX filenames**: `v0_3_2.mdx` not `v0.3.2.mdx`
- Periods in filenames cause Next.js routing issues (interpreted as file extensions)
- Update corresponding `_meta.js` files when adding new pages

### Adding Content
1. Create `.mdx` file in appropriate `content/` subdirectory
2. Update `_meta.js` in same directory for navigation
3. Use Nextra components: Cards, Callout, Steps, Tabs
4. Dev server runs on port 6006 by default

## Testing

- Framework: Vitest (Jest-compatible API)
- Test files: `*.test.ts` or `*.test.tsx` next to source files
- Run in watch mode by default (`pnpm test`)
- Run once with `pnpm test run` or `vitest run`
- Aim for 80%+ coverage on core functionality

## TypeScript

- Strict typing: No `any` types (use `unknown` if necessary)
- Explicit return types on all public functions
- Prefer `interface` over `type` for object shapes
- Export types alongside implementations

## Key External Dependencies

- **OpenSeadragon**: Deep zoom image viewer (peer dependency)
- **PixiJS**: WebGL rendering engine
- **RBush**: R-tree spatial indexing for fast queries
- **jsfive**: HDF5 file reading
- **pako**: Gzip compression/decompression
- **React 18+/19+**: UI framework (peer dependency)

## Publishing Workflow

See PUBLISHING.md for details. Summary:
1. Make changes to `src/`
2. Run `pnpm version patch|minor|major` (updates package.json, creates git tag)
3. Push with `git push origin main --follow-tags`
4. GitHub Actions handles validation, build, changelog, npm publish, and GitHub release
5. Changelog automatically committed to `docs/content/docs/changelog/v{version}.mdx`. Be sure the dot in the version is replaced with underscore to avoid bugs in routing.

## Git Workflow

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`
- Branch naming: `feature/description` or `fix/description`
- PRs require passing type checks and tests
- See CONTRIBUTING.md for full guidelines
