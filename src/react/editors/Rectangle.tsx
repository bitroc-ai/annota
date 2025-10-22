/**
 * Rectangle Editor
 *
 * Drag-and-drop editing for rectangular annotations.
 * Provides 8 handles: 4 corners + 4 edges + body drag
 */

import type { Annotation, RectangleShape } from '../../core/types';

export interface RectangleEditorProps {
  annotation: Annotation;
  scale: number;
  onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
}

/**
 * Pure function to calculate new rectangle based on drag delta
 */
export function editRectangle(
  shape: RectangleShape,
  handle: string,
  delta: [number, number]
): RectangleShape {
  const [dx, dy] = delta;
  const { x, y, width, height } = shape;

  let newX = x;
  let newY = y;
  let newWidth = width;
  let newHeight = height;

  switch (handle) {
    case 'BODY':
      // Move entire rectangle
      newX = x + dx;
      newY = y + dy;
      break;

    case 'TOP_LEFT':
      newX = x + dx;
      newY = y + dy;
      newWidth = width - dx;
      newHeight = height - dy;
      break;

    case 'TOP_RIGHT':
      newY = y + dy;
      newWidth = width + dx;
      newHeight = height - dy;
      break;

    case 'BOTTOM_LEFT':
      newX = x + dx;
      newWidth = width - dx;
      newHeight = height + dy;
      break;

    case 'BOTTOM_RIGHT':
      newWidth = width + dx;
      newHeight = height + dy;
      break;

    case 'TOP':
      newY = y + dy;
      newHeight = height - dy;
      break;

    case 'BOTTOM':
      newHeight = height + dy;
      break;

    case 'LEFT':
      newX = x + dx;
      newWidth = width - dx;
      break;

    case 'RIGHT':
      newWidth = width + dx;
      break;
  }

  // Prevent negative dimensions by flipping
  if (newWidth < 0) {
    newX += newWidth;
    newWidth = -newWidth;
  }
  if (newHeight < 0) {
    newY += newHeight;
    newHeight = -newHeight;
  }

  return {
    type: 'rectangle',
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
    bounds: {
      minX: newX,
      minY: newY,
      maxX: newX + newWidth,
      maxY: newY + newHeight,
    },
  };
}

/**
 * Rectangle Editor Component
 * Renders handles for corners, edges, and body
 */
export function RectangleEditor({ annotation, scale, onGrab }: RectangleEditorProps) {
  if (annotation.shape.type !== 'rectangle') return null;

  const { x, y, width, height } = annotation.shape;
  const handleRadius = 5 / scale;
  const strokeWidth = 2 / scale;

  return (
    <g className="annota-rectangle-editor">
      {/* Body drag area - transparent rectangle */}
      <rect
        className="annota-shape-handle"
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        onPointerDown={onGrab('BODY')}
      />

      {/* Selection outline */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Corner handles */}
      <circle
        cx={x}
        cy={y}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'nwse-resize' }}
        onPointerDown={onGrab('TOP_LEFT')}
      />
      <circle
        cx={x}
        cy={y}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x + width}
        cy={y}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'nesw-resize' }}
        onPointerDown={onGrab('TOP_RIGHT')}
      />
      <circle
        cx={x + width}
        cy={y}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x}
        cy={y + height}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'nesw-resize' }}
        onPointerDown={onGrab('BOTTOM_LEFT')}
      />
      <circle
        cx={x}
        cy={y + height}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x + width}
        cy={y + height}
        r={handleRadius + 8}
        fill="transparent"
        style={{ cursor: 'nwse-resize' }}
        onPointerDown={onGrab('BOTTOM_RIGHT')}
      />
      <circle
        cx={x + width}
        cy={y + height}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Edge handles */}
      <circle
        cx={x + width / 2}
        cy={y}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'ns-resize' }}
        onPointerDown={onGrab('TOP')}
      />
      <circle
        cx={x + width / 2}
        cy={y}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x + width / 2}
        cy={y + height}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'ns-resize' }}
        onPointerDown={onGrab('BOTTOM')}
      />
      <circle
        cx={x + width / 2}
        cy={y + height}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x}
        cy={y + height / 2}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onGrab('LEFT')}
      />
      <circle
        cx={x}
        cy={y + height / 2}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      <circle
        cx={x + width}
        cy={y + height / 2}
        r={handleRadius + 8}
        fill="transparent"
        className="annota-handle-hit"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onGrab('RIGHT')}
      />
      <circle
        cx={x + width}
        cy={y + height / 2}
        r={handleRadius}
        fill="white"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
