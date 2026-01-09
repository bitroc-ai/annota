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
  selectedVertexIndex?: number | null;
  onVertexSelect?: (index: number | null) => void;
  /** Whether the polygon is in edit mode (shows vertex handles) */
  isEditing?: boolean;
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
  if (vertexMatch) {
    const vertexIndex = parseInt(vertexMatch[1], 10);
    if (vertexIndex >= 0 && vertexIndex < shape.points.length) {
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
  }

  // Handle edge insertion (e.g., "INSERT_EDGE_0", "INSERT_EDGE_1", etc.)
  const insertMatch = handle.match(/^INSERT_EDGE_(\d+)$/);
  if (insertMatch) {
    const edgeIndex = parseInt(insertMatch[1], 10);
    if (edgeIndex >= 0 && edgeIndex < shape.points.length) {
      // Calculate midpoint between current vertex and next vertex
      const p1 = shape.points[edgeIndex];
      const p2 = shape.points[(edgeIndex + 1) % shape.points.length];
      const midpoint = {
        x: (p1.x + p2.x) / 2 + dx,
        y: (p1.y + p2.y) / 2 + dy,
      };

      // Insert new vertex after the edge start vertex
      const newPoints = [
        ...shape.points.slice(0, edgeIndex + 1),
        midpoint,
        ...shape.points.slice(edgeIndex + 1),
      ];

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
  }

  return shape;
}

/**
 * Delete a vertex from polygon
 * Returns null if deletion would result in less than 3 vertices
 */
export function deletePolygonVertex(
  shape: PolygonShape,
  vertexIndex: number
): PolygonShape | null {
  // Enforce minimum 3 vertices for a valid polygon
  if (shape.points.length <= 3) {
    return null;
  }

  if (vertexIndex < 0 || vertexIndex >= shape.points.length) {
    return null;
  }

  // Remove vertex at index
  const newPoints = shape.points.filter((_, i) => i !== vertexIndex);

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
 * Renders handles for each vertex, edge midpoints for insertion, and allows body dragging
 */
export function PolygonEditor({
  annotation,
  scale,
  onGrab,
  selectedVertexIndex = null,
  onVertexSelect,
  isEditing = false
}: PolygonEditorProps) {
  if (annotation.shape.type !== 'polygon') return null;

  const { points } = annotation.shape;
  const handleRadius = 5 / scale;
  const edgeHandleRadius = 3.5 / scale;
  const strokeWidth = 2 / scale;
  const vertexHitPadding = 3 / scale; // Scale-aware hit padding for vertex handles
  const edgeHitPadding = 3 / scale; // Scale-aware hit padding for edge handles
  const minVertices = 3;
  const canDeleteVertex = points.length > minVertices;

  // Create polygon path
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Calculate edge midpoints for insertion handles
  const edgeMidpoints = points.map((p, i) => {
    const nextPoint = points[(i + 1) % points.length];
    return {
      x: (p.x + nextPoint.x) / 2,
      y: (p.y + nextPoint.y) / 2,
      index: i,
    };
  });

  const handleVertexClick = (index: number) => (e: React.PointerEvent<SVGElement>) => {
    if (onVertexSelect) {
      // Toggle selection
      onVertexSelect(selectedVertexIndex === index ? null : index);
    }
    // Also allow dragging
    onGrab(`VERTEX_${index}`)(e);
  };

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

      {/* Only show vertex and edge handles in edit mode */}
      {isEditing && (
        <>
          {/* Edge midpoint handles for insertion */}
          {edgeMidpoints.map((midpoint) => (
            <g key={`edge-${midpoint.index}`}>
              {/* Invisible larger circle for easier grabbing */}
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r={edgeHandleRadius + edgeHitPadding}
                fill="transparent"
                className="annota-handle-hit"
                style={{ cursor: 'copy' }}
                onPointerDown={onGrab(`INSERT_EDGE_${midpoint.index}`)}
              />
              {/* Visible edge handle - semi-transparent */}
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r={edgeHandleRadius}
                fill="rgba(74, 144, 226, 0.5)"
                stroke="#4A90E2"
                strokeWidth={strokeWidth}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ))}

          {/* Vertex handles */}
          {points.map((point, i) => {
            const isSelected = selectedVertexIndex === i;
            const isDeleteDisabled = !canDeleteVertex;

            return (
              <g key={`vertex-${i}`}>
                {/* Invisible larger circle for easier grabbing */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={handleRadius + vertexHitPadding}
                  fill="transparent"
                  className="annota-handle-hit"
                  style={{ cursor: 'grab' }}
                  onPointerDown={handleVertexClick(i)}
                />
                {/* Visible handle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={handleRadius}
                  fill={isSelected ? (isDeleteDisabled ? '#FFA500' : '#FF6B6B') : 'white'}
                  stroke={isSelected ? (isDeleteDisabled ? '#FFA500' : '#FF0000') : '#4A90E2'}
                  strokeWidth={strokeWidth}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Show deletion indicator when selected */}
                {isSelected && !isDeleteDisabled && (
                  <text
                    x={point.x}
                    y={point.y}
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={handleRadius * 1.5}
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ×
                  </text>
                )}
                {/* Show warning indicator when deletion disabled */}
                {isSelected && isDeleteDisabled && (
                  <text
                    x={point.x}
                    y={point.y}
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={handleRadius * 1.2}
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    !
                  </text>
                )}
              </g>
            );
          })}
        </>
      )}
    </g>
  );
}
