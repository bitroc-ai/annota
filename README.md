<p align="center">
  <img src="https://github.com/bitroc-ai/annota/blob/main/docs/public/logo.svg" alt="Annota Logo" width="100" />
</p>

# Annota

Annota is a framework-independent annotation engine for large, zoomable images. Digital pathology
is its primary use case, but the core model deliberately understands only annotations, geometry,
layers, spatial candidates, interaction, history, and rendering. Cell, nucleus, diagnosis,
relationships, statistics, and persistence belong to the application domain.

## Installation

```bash
npm install annota openseadragon
# Install only the framework integration you use:
npm install react react-dom
# or
npm install svelte
```

React and Svelte are optional peers. Canonical imports are separated:

```ts
import { createAnnotator, type AnnotationInput } from 'annota';
import { AnnotaProvider, Viewer, Annotator, useAnnotator } from 'annota/react';
import { AnnotaProvider, Viewer, Annotator } from 'annota/svelte';
import { PointTool, PolygonTool } from 'annota/tools';
import { loadH5Masks, loadInstanceMask } from 'annota/loaders';
import 'annota/styles.css';
```

The root package temporarily re-exports the previous React API, and
`annota/dist/index.css` remains a compatibility alias. Both are deprecated since 0.11 and planned
for removal in 2.0.

## Framework-independent usage

```ts
const annotator = await createAnnotator({
  viewer,
  annotations: [{
    id: 'region-1',
    layerId: 'regions',
    shape: {
      type: 'polygon',
      points: [{ x: 10, y: 10 }, { x: 80, y: 10 }, { x: 40, y: 60 }],
    },
    properties: { reviewState: 'pending' },
  }],
});

const dispose = annotator.events.on('annotation:update', event => {
  if (!event.context.transient) persist(event.annotation);
});

try {
  annotator.annotations.update('region-1', {
    properties: { reviewState: 'approved' },
  });
} finally {
  dispose();
  annotator.destroy();
}
```

Annota computes and freezes geometry bounds on every write. Public collections are detached
snapshots; all stable writes pass through the façade, history, transaction, event, store, spatial,
and rendering pipeline.

## Capability API

- `annotations`: add, batch upsert, patch, remove, replace, get, and list.
- `selection`: set, clear, and read selected IDs.
- `layers`: create, update, remove, and control visibility, opacity, lock, and z-index.
- `spatial.search`: fast bounds candidates only.
- `geometry`: exact intersects, contains, intersection, IoU, merge, and split operations.
- `history`: undo, redo, state, and clear.
- `events`: typed, disposable subscriptions with `source`, `transactionId`, and `transient`.
- `tools`: active interactive tool boundary.

Layer z-index controls only drawing order. Hidden layers are excluded from rendering and hit
testing; locked layers remain readable and visible but cannot be edited by users or tools.

## Domain mapping for instance masks

The core decoder does not interpret class IDs:

```ts
const annotations = await loadInstanceMask(buffer, {
  decodePixel(pixel) {
    const instanceId = (pixel.r << 8) | pixel.g;
    return instanceId === 0
      ? null
      : { instanceId, attributes: { classId: pixel.b } };
  },
  mapProperties(instance) {
    return {
      entityType: 'cell',
      cellClass: mapClass(instance.attributes?.classId),
    };
  },
});
```

Without `mapProperties`, output contains only generic source, instance ID, attributes, and area.

## Performance

Annota uses PixiJS, viewport culling, R-tree candidate queries, cached rendering, and fixed-seed
benchmarks. Run `pnpm build && pnpm benchmark` for the reproducible 1k/10k/50k core workload.
Hardware-dependent frame-rate claims are intentionally not published without a fixed browser and
device result.

## Development and migration

```bash
pnpm install
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm --dir docs build
pnpm test:consumer
pnpm benchmark:ci
```

See [the migration guide](docs/src/content/docs/guides/migration-1-0.mdx),
[CONTRIBUTING.md](CONTRIBUTING.md), and [PUBLISHING.md](PUBLISHING.md).

## License

MIT
