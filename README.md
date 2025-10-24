# Annota

[![npm version](https://img.shields.io/npm/v/annota.svg)](https://www.npmjs.com/package/annota)
[![npm downloads](https://img.shields.io/npm/dm/annota.svg)](https://www.npmjs.com/package/annota)
[![license](https://img.shields.io/npm/l/annota.svg)](https://github.com/bitroc-ai/annota/blob/main/LICENSE)

A high-performance React annotation framework for digital pathology and whole slide imaging, built on OpenSeadragon and PixiJS.

## Features

- 🎯 **Purpose-built for pathology**: Point markers, rectangles, polygons, and contours optimized for medical imaging
- ⚡ **High performance**: Hardware-accelerated rendering with PixiJS, viewport culling, and level-of-detail optimization
- 🎨 **Rich interaction**: Interactive drawing tools with push/pull editing for natural annotation workflows
- 📦 **Layer system**: Multi-layer organization with independent visibility, opacity, and locking controls
- 🔌 **Event-driven**: Comprehensive event system for annotation lifecycle (`create`, `update`, `delete`, `selectionChanged`)
- 💾 **Multiple formats**: Built-in loaders for H5 masks, H5 coordinates, JSON, and PGM files
- 🧩 **React integration**: Complete React hooks and components for seamless integration
- 📐 **Spatial indexing**: R-tree based spatial queries for efficient hit testing and selection
- 🎨 **Flexible styling**: Per-annotation styling with color, opacity, and stroke customization

## Installation

```bash
npm install annota openseadragon
# or
pnpm add annota openseadragon
```

## Quick Start

### Basic Viewer with Annotations

```tsx
import { AnnotaProvider, AnnotaViewer, useAnnotator } from 'annota';
import { useState } from 'react';
import 'annota/dist/index.css';

function App() {
  return (
    <AnnotaProvider slideId="slide-123">
      <AnnotationApp />
    </AnnotaProvider>
  );
}

function AnnotationApp() {
  const [viewer, setViewer] = useState(null);
  const annotator = useAnnotator();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <AnnotaViewer
        options={{
          tileSources: '/path/to/image.dzi',
          prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4/build/openseadragon/images/',
        }}
        onViewerReady={(osdViewer) => {
          setViewer(osdViewer);
          // Create annotator instance
          const instance = createOpenSeadragonAnnotator(osdViewer);
          annotator.setInstance(instance);
        }}
      />
    </div>
  );
}
```

### Using Annotation Tools

```tsx
import { useTool, PointTool, RectangleTool, PolygonTool } from 'annota';

function ToolBar() {
  const annotator = useAnnotator();
  const [activeTool, setActiveTool] = useState('point');

  const tools = {
    point: new PointTool({ annotator }),
    rectangle: new RectangleTool({ annotator }),
    polygon: new PolygonTool({ annotator }),
  };

  useTool({
    viewer,
    handler: tools[activeTool],
    enabled: true,
  });

  return (
    <div>
      <button onClick={() => setActiveTool('point')}>Point</button>
      <button onClick={() => setActiveTool('rectangle')}>Rectangle</button>
      <button onClick={() => setActiveTool('polygon')}>Polygon</button>
    </div>
  );
}
```

### Working with Layers

```tsx
import { useLayerManager, useLayer } from 'annota';

function LayerPanel() {
  const layerManager = useLayerManager();
  const layers = useLayers();

  const createLayer = () => {
    layerManager.createLayer(`layer-${Date.now()}`, {
      name: 'New Layer',
      visible: true,
      opacity: 1,
    });
  };

  return (
    <div>
      {layers.map(layer => (
        <div key={layer.id}>
          <label>
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={(e) => layerManager.setLayerVisibility(layer.id, e.target.checked)}
            />
            {layer.name}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={layer.opacity}
            onChange={(e) => layerManager.setLayerOpacity(layer.id, parseFloat(e.target.value))}
          />
        </div>
      ))}
      <button onClick={createLayer}>Add Layer</button>
    </div>
  );
}
```

### Loading Annotations from H5 Files

```tsx
import { loadH5Masks, loadH5Coordinates } from 'annota';

async function loadAnnotations() {
  const annotator = useAnnotator();

  // Load mask annotations from H5 file
  const maskAnnotations = await loadH5Masks('/annotations/masks.h5', {
    color: '#FF0000',
    fillOpacity: 0.3,
  });

  // Load point coordinates from H5 file
  const pointAnnotations = await loadH5Coordinates('/annotations/points.h5', {
    color: '#00FF00',
    fillOpacity: 0.8,
  });

  annotator.instance?.addAnnotations([...maskAnnotations, ...pointAnnotations]);
}
```

### Event Handling

```tsx
import { useAnnotator } from 'annota';
import { useEffect } from 'react';

function AnnotationLogger() {
  const annotator = useAnnotator();

  useEffect(() => {
    const instance = annotator.instance;
    if (!instance) return;

    const handleCreate = (annotation) => {
      console.log('Annotation created:', annotation);
    };

    const handleUpdate = (annotation) => {
      console.log('Annotation updated:', annotation);
    };

    const handleDelete = (annotation) => {
      console.log('Annotation deleted:', annotation);
    };

    const handleSelection = ({ selected }) => {
      console.log('Selection changed:', selected);
    };

    instance.on('createAnnotation', handleCreate);
    instance.on('updateAnnotation', handleUpdate);
    instance.on('deleteAnnotation', handleDelete);
    instance.on('selectionChanged', handleSelection);

    return () => {
      instance.off('createAnnotation', handleCreate);
      instance.off('updateAnnotation', handleUpdate);
      instance.off('deleteAnnotation', handleDelete);
      instance.off('selectionChanged', handleSelection);
    };
  }, [annotator.instance]);

  return null;
}
```

## Architecture

Annota is designed with a clean separation of concerns:

```
annota/
├── core/                # Core annotation engine
│   ├── types.ts         # Type definitions
│   ├── store.ts         # Annotation storage with R-tree indexing
│   ├── layer.ts         # Layer management system
│   └── spatial.ts       # Spatial query utilities
├── adapters/            # Viewer integrations
│   └── openseadragon/   # OpenSeadragon adapter
│       └── annotator.ts # Main annotator instance
├── rendering/           # Rendering engines
│   └── pixi/            # PixiJS renderer with LOD & culling
├── tools/               # Interactive drawing tools
│   ├── point.ts         # Point annotation tool
│   ├── rectangle.ts     # Rectangle tool
│   ├── polygon.ts       # Polygon tool
│   ├── contour.ts       # Contour detection tool
│   └── push.ts          # Push/pull editing tool
├── loaders/             # File format loaders
│   ├── h5.ts            # H5 mask loader
│   ├── h5-coordinates.ts # H5 point coordinate loader
│   ├── json.ts          # JSON loader
│   └── pgm.ts           # PGM mask loader
└── react/               # React integration
    ├── Provider.tsx     # Context provider
    ├── Viewer.tsx       # OpenSeadragon viewer component
    ├── Annotator.tsx    # Annotation overlay component
    ├── Editor.tsx       # Annotation editor
    └── hooks.ts         # React hooks
```

## Performance Features

- **Viewport Culling**: Only renders annotations visible in the current viewport
- **Level of Detail (LOD)**: Simplifies rendering for small annotations when zoomed out
- **Smart Caching**: Graphics only re-rendered when necessary (state/scale changes)
- **R-tree Indexing**: Fast spatial queries for hit testing and selection
- **Hardware Acceleration**: PixiJS WebGL rendering for smooth performance
- **Optimized Pan/Zoom**: Perfect synchronization with OpenSeadragon viewport updates

## API Reference

### Core Types

```typescript
interface Annotation {
  id: string;
  shape: PointShape | RectangleShape | PolygonShape;
  properties?: Record<string, any>;
  style?: AnnotationStyle;
}

interface AnnotationStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
}
```

### Annotator Instance Methods

```typescript
interface OpenSeadragonAnnotator {
  // Annotation CRUD
  addAnnotation(annotation: Annotation): void;
  addAnnotations(annotations: Annotation[]): void;
  updateAnnotation(id: string, updates: Partial<Annotation>): void;
  deleteAnnotation(id: string): void;
  getAnnotation(id: string): Annotation | undefined;
  getAllAnnotations(): Annotation[];

  // Selection
  setSelected(id: string | string[]): void;
  getSelected(): string[];

  // Spatial queries
  getAnnotationsInBounds(bounds: Bounds): Annotation[];

  // Layer management
  setCurrentLayer(layerId: string): void;
  getCurrentLayer(): string;

  // Events
  on(event: AnnotatorEvent, handler: AnnotatorEventHandler): void;
  off(event: AnnotatorEvent, handler: AnnotatorEventHandler): void;
  emit(event: AnnotatorEvent, data: any): void;

  // Cleanup
  destroy(): void;
}
```

### React Hooks

- `useAnnotator()` - Access annotator instance and state
- `useAnnotations()` - Get all annotations
- `useAnnotation(id)` - Get specific annotation
- `useSelection()` - Access selected annotations
- `useTool(options)` - Activate annotation tool
- `useLayerManager()` - Control layers
- `useLayers()` - Get all layers
- `useLayer(id)` - Get specific layer
- `useViewer()` - Access OpenSeadragon viewer

## Documentation

For detailed documentation, tutorials, and examples, visit the [documentation site](https://annota.bitroc.ai).

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## License

MIT © BitRoc Lab
