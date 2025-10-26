/**
 * Interactive inline examples for documentation.
 *
 * These components can be embedded in MDX files using the ExampleViewer component.
 */

// ExampleViewer for iframe-based embedding in MDX
export { ExampleViewer } from "./example-viewer";
export type { ExampleType, ExampleViewerProps } from "./example-viewer";

// Example components (used by the example pages)
export { RectangleExample } from "./rectangle";
export { PolygonExample } from "./polygon";
export { PointsExample } from "./points";
