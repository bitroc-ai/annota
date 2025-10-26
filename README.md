<p align="center">
  <img src="logo.png" alt="Annota Logo" width="100" />
</p>

<h1 align="center">Annota</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/annota"><img src="https://img.shields.io/npm/v/annota.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/annota"><img src="https://img.shields.io/npm/dm/annota.svg" alt="npm downloads" /></a>
  <a href="https://github.com/bitroc-ai/annota/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/annota.svg" alt="license" /></a>
</p>

<p align="center">
  A high-performance React annotation framework for large-scale images, built on OpenSeadragon and PixiJS.
</p>

Annota is a general-purpose annotation library designed for applications that need to handle thousands of annotations on large, zoomable images. While it excels at whole slide imaging and digital pathology workflows, it's versatile enough for any domain requiring image annotation at scale.

## Features

- ⚡ **High Performance**: Hardware-accelerated PixiJS rendering with viewport culling and level-of-detail optimization for smooth 60 FPS interaction with 10,000+ annotations
- 🎨 **Rich Annotation Tools**: Point markers, rectangles, polygons, contour detection, and push/pull editing tools
- 🔌 **Event-Driven Architecture**: Comprehensive event system for annotation lifecycle (`create`, `update`, `delete`, `selectionChanged`)
- 📦 **Multi-Layer Organization**: Organize annotations into layers with independent visibility, opacity, locking, and z-index controls
- 💾 **Flexible Data Loading**: Built-in loaders for H5 masks, H5 coordinates, JSON, and PGM formats
- ⚛️ **React First**: Modern hooks API with TypeScript support and pre-built components
- 📐 **Spatial Indexing**: R-tree based spatial queries for efficient hit testing and selection
- 🎨 **Dynamic Styling**: Per-annotation styling with color, opacity, stroke customization, and category-based theming
- 🖼️ **OpenSeadragon Integration**: Seamless integration with deep zoom image viewing

## Installation

```bash
npm install annota openseadragon
# or
pnpm add annota openseadragon
```

## Quick Start

### Basic Viewer

```tsx
import { AnnotaProvider, AnnotaViewer, Annotator } from 'annota';
import { useState } from 'react';
import 'annota/dist/index.css';

function App() {
  const [viewer, setViewer] = useState(null);

  return (
    <AnnotaProvider slideId="slide-001">
      <div style={{ width: '100vw', height: '100vh' }}>
        <AnnotaViewer
          options={{
            tileSources: '/path/to/image.dzi',
            prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4/build/openseadragon/images/',
          }}
          onViewerReady={setViewer}
        />
        <Annotator viewer={viewer} />
      </div>
    </AnnotaProvider>
  );
}
```

### Using Annotation Tools

```tsx
import { useTool, useAnnotator, PointTool, RectangleTool, PolygonTool } from 'annota';

function ToolBar({ viewer }) {
  const annotator = useAnnotator();
  const [activeTool, setActiveTool] = useState('point');

  const tools = {
    point: new PointTool({ annotator: annotator.instance }),
    rectangle: new RectangleTool({ annotator: annotator.instance }),
    polygon: new PolygonTool({ annotator: annotator.instance }),
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

### Event Handling

```tsx
import { useAnnotator } from 'annota';
import { useEffect } from 'react';

function AnnotationEvents() {
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

### Layer Management

```tsx
import { useLayerManager, useLayers } from 'annota';

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

### Loading Data

```tsx
import { loadH5Masks, loadH5Coordinates } from 'annota';

async function loadAnnotations(annotator) {
  // Load polygon masks from H5 file
  const maskAnnotations = await loadH5Masks('/data/masks.h5', {
    color: '#FF0000',
    fillOpacity: 0.3,
  });

  // Load point coordinates from H5 file
  const pointAnnotations = await loadH5Coordinates('/data/points.h5', {
    color: '#00FF00',
    fillOpacity: 0.8,
  });

  annotator.instance?.addAnnotations([...maskAnnotations, ...pointAnnotations]);
}
```

## Architecture

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
    └── hooks.ts         # React hooks
```

## Performance

Annota is optimized for handling large numbers of annotations:

- **Viewport Culling**: Only renders annotations visible in the current viewport
- **Level of Detail (LOD)**: Simplifies rendering for small annotations when zoomed out
- **Smart Caching**: Graphics only re-rendered when necessary (state/scale changes)
- **R-tree Indexing**: Fast spatial queries for hit testing and selection in O(log n) time
- **Hardware Acceleration**: PixiJS WebGL rendering for smooth 60 FPS performance
- **Optimized Updates**: Efficient viewport synchronization with OpenSeadragon

**Benchmark**: Smooth interaction with 10,000+ annotations at 60 FPS on modern hardware.

## API Overview

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

### Annotator Instance

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

## Available Tools

- **PointTool** - Create point markers for object location tracking
- **RectangleTool** - Draw rectangular bounding boxes
- **PolygonTool** - Create freeform polygon regions with vertex editing
- **ContourTool** - Automated contour detection with customizable algorithms
- **PushTool** - Interactive push/pull editing of polygon vertices

## Data Loaders

- **H5 Masks** (`loadH5Masks`) - Load polygon masks from HDF5 files
- **H5 Coordinates** (`loadH5Coordinates`) - Load point coordinates from HDF5 files
- **JSON** (`loadJSON`) - Load annotations from JSON format
- **PGM** (`loadPGM`) - Load mask data from PGM image files

## Use Cases

- **Digital Pathology**: Annotate regions of interest in whole slide images
- **Medical Imaging**: Mark and measure features in large medical images
- **AI Training**: Create and manage training datasets for machine learning
- **Geospatial**: Annotate satellite or aerial imagery
- **Document Analysis**: Mark regions in high-resolution scanned documents
- **Quality Control**: Identify and track defects in industrial imaging
- **Research**: Flexible annotation capabilities for scientific imaging

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebGL support for hardware-accelerated rendering.

## Documentation

For detailed documentation, guides, and interactive examples:

- **Documentation**: [https://annota.dev](https://annota.dev)
- **Getting Started**: [Installation Guide](https://annota.dev/docs/getting-started)
- **API Reference**: [Complete API Docs](https://annota.dev/api)
- **Examples**: [Code Examples](https://annota.dev/docs/examples/basic-viewer)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## License

MIT © BitRoc Lab

## Acknowledgments

Built with:
- [OpenSeadragon](https://openseadragon.github.io/) - Deep zoom image viewer
- [PixiJS](https://pixijs.com/) - Hardware-accelerated 2D rendering
- [RBush](https://github.com/mourner/rbush) - High-performance spatial indexing
- [React](https://react.dev/) - UI framework
