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

Annota is designed for applications that need to handle thousands of annotations on large, zoomable images. While it excels at whole slide imaging and digital pathology workflows, it's versatile enough for any domain requiring image annotation at scale.

## Features

- ⚡ **High Performance** - Hardware-accelerated PixiJS rendering with viewport culling for smooth 60 FPS with 10,000+ annotations
- 🎨 **Rich Annotation Tools** - Points, rectangles, polygons, contour detection, and vertex editing
- 🔌 **Event-Driven Architecture** - Comprehensive event system for the annotation lifecycle
- 📦 **Multi-Layer Organization** - Independent visibility, opacity, and locking controls
- 💾 **Flexible Data Loading** - Built-in loaders for H5, JSON, and PGM formats
- ⚛️ **React First** - Modern hooks API with TypeScript support

## Installation

```bash
npm install annota
# Modern package managers (npm 7+, pnpm) automatically install peer dependencies

# For npm 6 or below, install peer dependencies explicitly:
npm install annota openseadragon react react-dom
```

## Quick Start

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

For more examples including tools, event handling, and layer management, see the [documentation](https://annota.dev/docs/examples).

## Performance

Annota is optimized for large-scale annotation workflows:

- **Viewport Culling** - Only renders visible annotations
- **Level of Detail** - Adaptive rendering based on zoom level
- **Smart Caching** - Graphics re-rendered only when necessary
- **R-tree Indexing** - Fast spatial queries in O(log n) time
- **Hardware Acceleration** - WebGL rendering for 60 FPS performance

**Benchmark**: Smooth interaction with 10,000+ annotations at 60 FPS.

## Core APIs

### React Hooks

```typescript
useAnnotator()       // Access annotator instance
useAnnotations()     // Get all annotations
useSelection()       // Access selected annotations
useTool(options)     // Activate annotation tool
useLayerManager()    // Control layers
```

### Annotation Tools

- **PointTool** - Create point markers
- **RectangleTool** - Draw rectangular regions
- **PolygonTool** - Freeform polygons with vertex editing
- **ContourTool** - Automated contour detection
- **PushTool** - Interactive vertex manipulation

### Data Loaders

- `loadH5Masks` - Load polygon masks from HDF5
- `loadH5Coordinates` - Load point coordinates from HDF5
- `loadJSON` - Load annotations from JSON
- `loadPGM` - Load mask data from PGM images

## Use Cases

- Digital Pathology & whole slide imaging
- Medical imaging analysis
- AI/ML training dataset creation
- Geospatial & satellite imagery
- High-resolution document analysis
- Quality control & defect tracking

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebGL support for hardware-accelerated rendering.

## Documentation

- **Documentation** - [https://annota.dev](https://annota.dev)
- **API** - [Complete API Docs](https://annota.dev/api)
- **Examples** - [Interactive Examples](https://annota.dev/docs/examples)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

For publishing releases, see [PUBLISHING.md](PUBLISHING.md).

## License

MIT © BitRoc Lab

## Acknowledgments

Built with [OpenSeadragon](https://openseadragon.github.io/), [PixiJS](https://pixijs.com/), [RBush](https://github.com/mourner/rbush), and [React](https://react.dev/).
