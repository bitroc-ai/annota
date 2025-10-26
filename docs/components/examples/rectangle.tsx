"use client";

import { useState, useEffect } from "react";
import {
  AnnotaProvider,
  Annotator,
  AnnotaViewer,
  useAnnotator,
  AnnotationEditor,
  RectangleTool,
  useTool,
  type Annotation,
} from "annota";

interface RectangleExampleProps {
  /** Height of the viewer in pixels (default: 400) */
  height?: number;
  /** Image URL to display (default: demo image) */
  imageUrl?: string;
  /** Enable drawing tool (default: true) */
  enableTool?: boolean;
}

function RectangleViewer({
  viewer,
  enableTool,
}: {
  viewer: any;
  enableTool: boolean;
}) {
  const annotator = useAnnotator();

  // Set up rectangle drawing tool
  const rectangleTool = new RectangleTool();
  useTool({ viewer, handler: rectangleTool, enabled: enableTool });

  // Add initial annotation when annotator is ready
  useEffect(() => {
    if (!annotator) return;

    const initialAnnotations: Annotation[] = [
      {
        id: "rect-1",
        shape: {
          type: "rectangle",
          x: 150,
          y: 200,
          width: 350,
          height: 250,
          bounds: { minX: 150, minY: 200, maxX: 500, maxY: 450 },
        },
        style: {
          fill: "#3b82f6",
          fillOpacity: 0.3,
          stroke: "#3b82f6",
          strokeWidth: 3,
        },
      },
    ];

    annotator.addAnnotations(initialAnnotations);
  }, [annotator]);

  return <AnnotationEditor viewer={viewer} />;
}

/**
 * Interactive rectangle annotation example.
 * Shows a simple rectangle that can be selected, moved, and resized.
 * Also supports drawing new rectangles when enableTool is true.
 */
export function RectangleExample({
  height = 400,
  imageUrl = "/playground/images/test/0.png",
  enableTool = true,
}: RectangleExampleProps) {
  const [viewer, setViewer] = useState<any>(null);

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      <AnnotaProvider>
        <AnnotaViewer
          className="h-full"
          options={{
            tileSources: {
              type: "image",
              url: imageUrl,
            },
            showNavigationControl: false,
            showNavigator: false,
          }}
          onViewerReady={setViewer}
        />
        <Annotator viewer={viewer}>
          <RectangleViewer viewer={viewer} enableTool={enableTool} />
        </Annotator>
      </AnnotaProvider>
    </div>
  );
}
