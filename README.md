# Annota

[![npm version](https://img.shields.io/npm/v/annota.svg)](https://www.npmjs.com/package/annota)
[![npm downloads](https://img.shields.io/npm/dm/annota.svg)](https://www.npmjs.com/package/annota)
[![license](https://img.shields.io/npm/l/annota.svg)](https://github.com/bitroc-ai/annota/blob/main/LICENSE)

A lightweight, viewer-agnostic annotation framework for digital pathology and whole slide imaging.

## Features

- 🎯 **Purpose-built for pathology**: Point markers, regions, contours
- 🔌 **Viewer-agnostic**: Core engine independent of viewer implementation
- ⚡ **High performance**: Pure SVG rendering, optimized for large images
- 🎨 **Flexible**: Customizable colors, opacity, and styles
- 📦 **Layer system**: Organize annotations with visibility control
- 💾 **Persistent**: Built-in state persistence (Zustand + localStorage)
- 🧩 **Extensible**: Plugin system for loaders and exporters

## Installation

```bash
npm install annota
# or
pnpm add annota
```

## Quick Start

```tsx
import { AnnotaProvider, AnnotaOverlay, AnnotaToolbar } from 'annota';
import OpenSeadragon from 'openseadragon';

function App() {
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer | null>(null);

  return (
    <AnnotaProvider slideId="slide-123">
      <div
        ref={el => {
          if (el && !viewer) {
            const osd = OpenSeadragon({
              element: el,
              tileSources: 'path/to/image.dzi',
            });
            setViewer(osd);
          }
        }}
      />

      {viewer && (
        <>
          <AnnotaOverlay viewer={viewer} />
          <AnnotaToolbar />
        </>
      )}
    </AnnotaProvider>
  );
}
```

## Architecture

Annota follows a layered architecture separating core engine from viewer integration.

### Structure

```
annota/
├── engine/          # Core annotation engine (viewer-agnostic)
│   ├── types.ts     # Type definitions
│   ├── store.ts     # State management (Zustand)
│   └── renderer.ts  # SVG rendering
├── tools/           # Drawing tools
├── adapters/        # Viewer integrations
│   └── openseadragon/
├── react/           # React bindings
└── plugins/         # Optional extensions
    ├── loaders/     # File loaders (H5, PGM)
    └── exporters/   # Export formats
```

### Design Principles

1. **Separation of concerns**: Engine is independent of viewer
2. **Minimal core**: Only essential annotation functionality
3. **Plugin-based**: Extensions are optional, not core
4. **Type-safe**: Full TypeScript coverage

## Documentation

See [docs](./docs) for detailed documentation.

## License

MIT
