# Annota Demo

A working Next.js demo showing how to use Annota for digital pathology annotation.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## What This Demonstrates

1. **Basic Integration**: How to integrate Annota with OpenSeadragon
2. **Point Tool**: Click on the image to add cell markers
3. **Layer Management**: Automatic layer creation and management
4. **State Persistence**: Annotations are saved to localStorage
5. **Real-time Stats**: Live annotation counts

## Features Shown

- ✅ OpenSeadragon viewer integration
- ✅ Annota overlay rendering
- ✅ Point annotation tool
- ✅ Custom toolbar with tool selection
- ✅ Stats panel showing annotation counts
- ✅ Persistent state (refresh page to see annotations preserved)

## Code Structure

```
src/
├── app/
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
└── components/
    └── viewer.tsx        # Main viewer component with Annota
```

## Try It Out

1. **Select Point tool** (📍 Point button)
2. **Click on the image** to add cell markers
3. **Refresh the page** - annotations are persisted!
4. **Try other tools** - Select, Pan modes
5. **Check console** - Click events are logged

## Next Steps

To use your own images:

1. Replace the `tileSources` URL in `Viewer.tsx`
2. Use DZI, IIIF, or simple image URLs
3. Add your own tools and styling

## Learn More

- [Annota Documentation](../../README.md)
- [OpenSeadragon Docs](https://openseadragon.github.io/)
