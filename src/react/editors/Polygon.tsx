/**
 * Polygon Editor
 *
 * Drag-and-drop editing for polygon annotations.
 * Provides handles for each vertex and body drag
 */

import type { Annotation, PolygonShape } from '../../core/types';

export interface PolygonEditorProps {
  annotation: Annotation;
  scale: number;
  onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
}

/**
 * Pure function to calculate new polygon based on drag delta
 */
export function editPolygon(
  shape: PolygonShape,
  handle: string,
  delta: [number, number]
): PolygonShape {
  const [dx, dy] = delta;

  if (handle === 'BODY') {
    // Move entire polygon
    const newPoints = shape.points.map(p => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    const xs = newPoints.map(p => p.x);
    const ys = newPoints.map(p => p.y);

    return {
      type: 'polygon',
      points: newPoints,
      bounds: {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      },
    };
  }

  // Handle is a vertex index (e.g., "VERTEX_0", "VERTEX_1", etc.)
  const vertexMatch = handle.match(/^VERTEX_(\d+)$/);
  if (!vertexMatch) return shape;

  const vertexIndex = parseInt(vertexMatch[1], 10);
  if (vertexIndex < 0 || vertexIndex >= shape.points.length) return shape;

  // Move specific vertex
  const newPoints = shape.points.map((p, i) =>
    i === vertexIndex ? { x: p.x + dx, y: p.y + dy } : p
  );

  const xs = newPoints.map(p => p.x);
  const ys = newPoints.map(p => p.y);

  return {
    type: 'polygon',
    points: newPoints,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  };
}

/**
 * Polygon Editor Component
 * Renders handles for each vertex and allows body dragging
 */
export function PolygonEditor({ annotation, scale, onGrab }: PolygonEditorProps) {
  if (annotation.shape.type !== 'polygon') return null;

  const { points } = annotation.shape;
  const handleRadius = 5 / scale;
  const strokeWidth = 2 / scale;

  // Create polygon path
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <g className="annota-polygon-editor">
      {/* Body drag area - filled polygon */}
      <path
        className="annota-shape-handle"
        d={pathData}
        fill="rgba(74, 144, 226, 0.1)"
        stroke="none"
        onPointerDown={onGrab('BODY')}
      />

      {/* Selection outline */}
      <path
        d={pathData}
        fill="none"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Vertex handles */}
      {points.map((point, i) => (
        <g key={i}>
          {/* Invisible larger circle for easier grabbing */}
          <circle
            cx={point.x}
            cy={point.y}
            r={handleRadius + 3}
            fill="transparent"
            className="annota-handle-hit"
            style={{ cursor: 'grab' }}
            onPointerDown={onGrab(`VERTEX_${i}`)}
          />
          {/* Visible handle */}
          <circle
            cx={point.x}
            cy={point.y}
            r={handleRadius}
            fill="white"
            stroke="#4A90E2"
            strokeWidth={strokeWidth}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}
    </g>
  );
}
