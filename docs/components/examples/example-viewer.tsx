export type ExampleType = "rectangle" | "polygon" | "points";

export interface ExampleViewerProps {
  /** The type of example to display */
  type: ExampleType;
  /** Height of the iframe in pixels (default: 400) */
  height?: number;
  /** Custom title for accessibility */
  title?: string;
}

const defaultTitles: Record<ExampleType, string> = {
  rectangle: "Interactive Rectangle Annotation Example",
  polygon: "Interactive Polygon Annotation Example",
  points: "Interactive Points Annotation Example",
};

/**
 * ExampleViewer - Simple iframe wrapper for embedding interactive examples
 *
 * This component wraps an iframe that loads the example pages from /examples/*.
 * This approach avoids all SSR issues since the interactive components only load
 * in the separate iframe page.
 *
 * Usage in MDX:
 * ```mdx
 * import { ExampleViewer } from "@/components/examples";
 *
 * <ExampleViewer type="rectangle" />
 * <ExampleViewer type="polygon" height={500} />
 * <ExampleViewer type="points" />
 * ```
 */
export function ExampleViewer({
  type,
  height = 400,
  title,
}: ExampleViewerProps) {
  return (
    <iframe
      src={`/examples/${type}`}
      style={{
        width: "100%",
        height: `${height}px`,
        border: 0,
      }}
      title={title || defaultTitles[type]}
    />
  );
}
