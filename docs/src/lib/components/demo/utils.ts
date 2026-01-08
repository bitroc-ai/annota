import type { Annotation } from 'annota';

export function createInitialAnnotations(width: number, height: number): Annotation[] {
  return [
    // Rectangle annotations
    {
      id: "demo-rect-1",
      shape: {
        type: "rectangle",
        x: width * 0.15,
        y: height * 0.2,
        width: width * 0.12,
        height: height * 0.15,
        bounds: {
          minX: width * 0.15,
          minY: width * 0.2,
          maxX: width * 0.27,
          maxY: height * 0.35,
        },
      },
      properties: {
        source: "demo-example",
        label: "Region 1",
      },
      style: {
        stroke: "#10b981",
        strokeWidth: 2,
        fill: "#10b981",
        fillOpacity: 0.15,
      },
    },
    {
      id: "demo-rect-2",
      shape: {
        type: "rectangle",
        x: width * 0.65,
        y: height * 0.15,
        width: width * 0.18,
        height: width * 0.12,
        bounds: {
          minX: width * 0.65,
          minY: height * 0.15,
          maxX: width * 0.83,
          maxY: height * 0.27,
        },
      },
      properties: {
        source: "demo-example",
        label: "Region 2",
      },
      style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
        fill: "#3b82f6",
        fillOpacity: 0.15,
      },
    },
    // Polygon annotation
    {
      id: "demo-polygon-1",
      shape: {
        type: "polygon",
        points: [
          { x: width * 0.4, y: height * 0.55 },
          { x: width * 0.5, y: height * 0.5 },
          { x: width * 0.58, y: height * 0.6 },
          { x: width * 0.52, y: height * 0.7 },
          { x: width * 0.42, y: height * 0.68 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      },
      properties: {
        source: "demo-example",
        label: "Custom Shape",
      },
      style: {
        stroke: "#f59e0b",
        strokeWidth: 2,
        fill: "#f59e0b",
        fillOpacity: 0.15,
      },
    },
    // Point annotations
    {
      id: "demo-point-1",
      shape: {
        type: "point",
        point: { x: width * 0.25, y: height * 0.65 },
        bounds: {
          minX: width * 0.25,
          minY: height * 0.65,
          maxX: width * 0.25,
          maxY: height * 0.65,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 1",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
    {
      id: "demo-point-2",
      shape: {
        type: "point",
        point: { x: width * 0.32, y: height * 0.72 },
        bounds: {
          minX: width * 0.32,
          minY: height * 0.72,
          maxX: width * 0.32,
          maxY: height * 0.72,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 2",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
    {
      id: "demo-point-3",
      shape: {
        type: "point",
        point: { x: width * 0.78, y: height * 0.82 },
        bounds: {
          minX: width * 0.78,
          minY: height * 0.82,
          maxX: width * 0.78,
          maxY: height * 0.82,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 3",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
  ];
}
