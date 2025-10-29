/**
 * Freehand Editor
 *
 * Drag-and-drop editing for freehand annotations (polylines).
 * Supports both open and closed freehand paths.
 */

import type { Annotation, FreehandShape } from '../../core/types';

export interface FreehandEditorProps {
  annotation: Annotation;
  scale: number;
  onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
}

/**
 * Pure function to calculate new freehand shape based on drag delta
 */
export function editFreehand(
  shape: FreehandShape,
  handle: string,
  delta: [number, number]
): FreehandShape {
  const [dx, dy] = delta;

  if (handle === 'BODY') {
    // Move entire freehand path
    const newPoints = shape.points.map(p => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    const xs = newPoints.map(p => p.x);
    const ys = newPoints.map(p => p.y);

    return {
      type: 'freehand',
      points: newPoints,
      closed: shape.closed,
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
        type: 'freehand',
        points: newPoints,
        closed: shape.closed,
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
 * Freehand Editor Component
 * Renders handles for each vertex and allows body dragging
 *
 * Note: For split tool preview lines (marked with _isSplitPreview or _isSplitLivePreview),
 * the editor renders in a simplified non-editable mode with no handles.
 */
export function FreehandEditor({
  annotation,
  scale,
  onGrab,
}: FreehandEditorProps) {
  if (annotation.shape.type !== 'freehand') return null;

  const { points, closed } = annotation.shape;
  const handleRadius = 5 / scale;
  const strokeWidth = 2 / scale;
  const vertexHitPadding = 3 / scale;

  // Check if this is a split tool preview (temporary, non-editable)
  const isSplitPreview =
    annotation.properties?._isSplitPreview ||
    annotation.properties?._isSplitLivePreview;

  // Create path (open polyline or closed polygon)
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + (closed ? ' Z' : '');

  // For split previews, just render the line with no interaction
  if (isSplitPreview) {
    const previewColor = annotation.properties?._isSplitLivePreview
      ? '#999999'
      : '#ff6b00';

    return (
      <g className="annota-freehand-preview">
        <path
          d={pathData}
          fill="none"
          stroke={previewColor}
          strokeWidth={strokeWidth}
          strokeDasharray={annotation.properties?._isSplitLivePreview ? '4 4' : 'none'}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }

  // Regular editable freehand annotation
  return (
    <g className="annota-freehand-editor">
      {/* Body drag area */}
      <path
        className="annota-shape-handle"
        d={pathData}
        fill={closed ? "rgba(74, 144, 226, 0.1)" : "none"}
        stroke="rgba(74, 144, 226, 0.3)"
        strokeWidth={strokeWidth * 4}
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
        <g key={`vertex-${i}`}>
          {/* Invisible larger circle for easier grabbing */}
          <circle
            cx={point.x}
            cy={point.y}
            r={handleRadius + vertexHitPadding}
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
