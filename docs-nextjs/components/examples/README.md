# Documentation Examples

Interactive inline examples for the Annota documentation. These components provide focused, interactive demonstrations that can be embedded directly in MDX files.

## Architecture

The examples use an **iframe-based approach** to avoid SSR (Server-Side Rendering) issues with OpenSeadragon:

1. **Example Components** (`rectangle.tsx`, `polygon.tsx`, `points.tsx`) - Client components that use OpenSeadragon
2. **Example Pages** (`app/(bare)/examples/*/page.tsx`) - Standalone pages that use dynamic imports with `ssr: false`
3. **ExampleViewer** (`example-viewer.tsx`) - Simple iframe wrapper for embedding in MDX

## Usage in MDX Files

Use the `ExampleViewer` component to embed examples:

```mdx
import { ExampleViewer } from "@/components/examples";

<ExampleViewer type="rectangle" />
<ExampleViewer type="polygon" height={500} />
<ExampleViewer type="points" />
```

### ExampleViewer Props

- `type`: `"rectangle" | "polygon" | "points"` (required) - Which example to display
- `height`: Height in pixels (default: 400)
- `title`: Custom title for accessibility

## Available Examples

### Rectangle Example
Interactive rectangle annotation with selection, moving, and resizing.

**Embed in MDX:**
```mdx
<ExampleViewer type="rectangle" />
```

**Standalone URL:** `/examples/rectangle`

### Polygon Example
Interactive polygon annotation with vertex editing (double-click to edit vertices).

**Embed in MDX:**
```mdx
<ExampleViewer type="polygon" />
```

**Standalone URL:** `/examples/polygon`

### Points Example
Multiple point annotations demonstrating cell counting use cases.

**Embed in MDX:**
```mdx
<ExampleViewer type="points" />
```

**Standalone URL:** `/examples/points`

## How It Works

### 1. Example Components
Located in `components/examples/`, these are simple Client Components that render the viewer:

- `rectangle.tsx` - Rectangle annotation component
- `polygon.tsx` - Polygon annotation component
- `points.tsx` - Points annotation component

Each component is focused on just rendering the viewer - no headers, info text, or wrapper UI.

### 2. Example Pages
Located in `app/(bare)/examples/`, these pages use Next.js dynamic imports to avoid SSR:

```tsx
"use client";
import dynamic from "next/dynamic";

const RectangleExample = dynamic(
  () => import("@/components/examples/rectangle").then((m) => m.RectangleExample),
  { ssr: false }
);

export default function RectangleExamplePage() {
  return <div className="w-full h-screen"><RectangleExample /></div>;
}
```

The `(bare)` route group ensures these pages render without the documentation layout.

### 3. ExampleViewer Component
A simple wrapper that creates an iframe pointing to the example pages:

```tsx
export function ExampleViewer({ type, height = 400 }: ExampleViewerProps) {
  return <iframe src={`/examples/${type}`} style={{ height: `${height}px` }} />;
}
```

## Why This Approach?

**Problem:** OpenSeadragon requires `document` and `window`, which aren't available during SSR in Next.js.

**Solution:**
1. Use dynamic imports with `ssr: false` in the example pages
2. Embed those pages via iframe in MDX files
3. The iframe loads the page client-side only, avoiding SSR entirely

This approach is clean, maintainable, and works seamlessly with Next.js and MDX.
