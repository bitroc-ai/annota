"use client";

import { useState, useEffect } from "react";
import {
  AnnotaProvider,
  Annotator,
  AnnotaViewer,
  useAnnotator,
  AnnotationEditor,
  PolygonTool,
  useTool,
  useEditing,
  useAnnotationDoubleClick,
  type Annotation,
} from "annota";

interface PolygonExampleProps {
  /** Height of the viewer in pixels (default: 400) */
  height?: number;
  /** Image URL to display (default: demo image) */
  imageUrl?: string;
  /** Enable drawing tool (default: true) */
  enableTool?: boolean;
}

function PolygonViewer({
  viewer,
  enableTool,
}: {
  viewer: any;
  enableTool: boolean;
}) {
  const annotator = useAnnotator();
  const { startEditing } = useEditing();

  // Set up polygon drawing tool
  const polygonTool = new PolygonTool();
  useTool({ viewer, handler: polygonTool, enabled: enableTool });

  // Double-click to enter vertex editing mode
  useAnnotationDoubleClick(
    viewer,
    (annotation) => {
      if (
        annotation.shape.type === "polygon" ||
        annotation.shape.type === "freehand"
      ) {
        startEditing(annotation.id, "vertices");
      }
    }
  );

  // Add initial annotation when annotator is ready
  useEffect(() => {
    if (!annotator) return;

    const initialAnnotations: Annotation[] = [
      {
        id: "polygon-1",
        shape: {
          type: "polygon",
          points: [
            { x: 200, y: 150 },
            { x: 500, y: 120 },
            { x: 550, y: 400 },
            { x: 350, y: 480 },
            { x: 180, y: 350 },
          ],
          bounds: { minX: 180, minY: 120, maxX: 550, maxY: 480 },
        },
        style: {
          fill: "#10b981",
          fillOpacity: 0.3,
          stroke: "#10b981",
          strokeWidth: 3,
        },
      },
    ];

    annotator.addAnnotations(initialAnnotations);
  }, [annotator]);

  return <AnnotationEditor viewer={viewer} />;
}

/**
 * Interactive polygon annotation example.
 * Shows a polygon that can be selected, moved, and vertex-edited (double-click).
 * Also supports drawing new polygons when enableTool is true.
 */
export function PolygonExample({
  height = 400,
  imageUrl = "/playground/images/test/0.png",
  enableTool = true,
}: PolygonExampleProps) {
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
          <PolygonViewer viewer={viewer} enableTool={enableTool} />
        </Annotator>
      </AnnotaProvider>
    </div>
  );
}
