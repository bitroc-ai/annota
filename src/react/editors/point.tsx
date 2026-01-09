/**
 * Point Annotation Editor
 */

import type { Annotation, PointShape } from '../../core/types';

/**
 * Pure function: calculates new point position based on delta
 */
export function editPoint(
  shape: PointShape,
  _handle: string, // Unused but required by interface
  delta: [number, number]
): PointShape {
  const [dx, dy] = delta;
  const { x, y } = shape.point;

  return {
    type: 'point',
    point: {
      x: x + dx,
      y: y + dy,
    },
    bounds: {
      minX: x + dx,
      minY: y + dy,
      maxX: x + dx,
      maxY: y + dy,
    },
  };
}

export interface PointEditorProps {
  annotation: Annotation;
  scale: number;
  onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
}

/**
 * Visual component: renders draggable handle for point annotation
 */
export function PointEditor({ annotation, scale, onGrab }: PointEditorProps) {
  if (annotation.shape.type !== 'point') {
    return null;
  }

  const { point } = annotation.shape;
  const handleRadius = 5 / scale; // Scale-aware handle size
  const hitAreaPadding = 8 / scale; // Scale-aware hit area padding

  return (
    <g className="annota-point-editor">
      {/* Invisible larger hit area */}
      <circle
        cx={point.x}
        cy={point.y}
        r={handleRadius + hitAreaPadding}
        fill="transparent"
        style={{ cursor: 'grab', pointerEvents: 'all' }}
        onPointerDown={onGrab('POINT')}
      />

      {/* Visible handle */}
      <circle
        cx={point.x}
        cy={point.y}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={2 / scale}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
