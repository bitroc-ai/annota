"use client";

import { useState, useEffect } from "react";
import {
  AnnotaProvider,
  Annotator,
  AnnotaViewer,
  useAnnotator,
  AnnotationEditor,
  PointTool,
  useTool,
  type Annotation,
} from "annota";

interface PointsExampleProps {
  /** Height of the viewer in pixels (default: 400) */
  height?: number;
  /** Image URL to display (default: demo image) */
  imageUrl?: string;
  /** Enable drawing tool (default: true) */
  enableTool?: boolean;
}

function PointsViewer({
  viewer,
  enableTool,
}: {
  viewer: any;
  enableTool: boolean;
}) {
  const annotator = useAnnotator();

  // Set up point drawing tool
  const pointTool = new PointTool();
  useTool({ viewer, handler: pointTool, enabled: enableTool });

  // Add initial annotations when annotator is ready
  useEffect(() => {
    if (!annotator) return;

    const initialAnnotations: Annotation[] = [
      {
        id: "point-1",
        shape: {
          type: "point",
          point: { x: 150, y: 180 },
          bounds: { minX: 150, minY: 180, maxX: 150, maxY: 180 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-2",
        shape: {
          type: "point",
          point: { x: 320, y: 250 },
          bounds: { minX: 320, minY: 250, maxX: 320, maxY: 250 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-3",
        shape: {
          type: "point",
          point: { x: 480, y: 120 },
          bounds: { minX: 480, minY: 120, maxX: 480, maxY: 120 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-4",
        shape: {
          type: "point",
          point: { x: 540, y: 380 },
          bounds: { minX: 540, minY: 380, maxX: 540, maxY: 380 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-5",
        shape: {
          type: "point",
          point: { x: 220, y: 450 },
          bounds: { minX: 220, minY: 450, maxX: 220, maxY: 450 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-6",
        shape: {
          type: "point",
          point: { x: 400, y: 520 },
          bounds: { minX: 400, minY: 520, maxX: 400, maxY: 520 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-7",
        shape: {
          type: "point",
          point: { x: 520, y: 560 },
          bounds: { minX: 520, minY: 560, maxX: 520, maxY: 560 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
      {
        id: "point-8",
        shape: {
          type: "point",
          point: { x: 100, y: 80 },
          bounds: { minX: 100, minY: 80, maxX: 100, maxY: 80 },
        },
        style: {
          fill: "#ef4444",
          fillOpacity: 0.8,
          stroke: "#fff",
          strokeWidth: 2,
        },
      },
    ];

    annotator.addAnnotations(initialAnnotations);
  }, [annotator]);

  return <AnnotationEditor viewer={viewer} />;
}

/**
 * Interactive point annotations example.
 * Shows multiple points that can be selected and moved (useful for cell counting).
 * Also supports adding new points when enableTool is true.
 */
export function PointsExample({
  height = 400,
  imageUrl = "/playground/images/test/0.png",
  enableTool = true,
}: PointsExampleProps) {
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
          <PointsViewer viewer={viewer} enableTool={enableTool} />
        </Annotator>
      </AnnotaProvider>
    </div>
  );
}
