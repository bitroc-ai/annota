/**
 * Image Editor
 *
 * Simple editor for image annotations (analysis result overlays).
 * Supports basic position dragging.
 * Image dimensions are fixed (they represent analysis output size).
 */

import type { Annotation, ImageShape } from '../../core/types';

export interface ImageEditorProps {
  annotation: Annotation;
  scale: number;
  onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
}

/**
 * Pure function to calculate new image position based on drag delta
 */
export function editImage(
  shape: ImageShape,
  handle: string,
  delta: [number, number]
): ImageShape {
  const [dx, dy] = delta;
  const { x, y, width, height } = shape;

  if (handle === 'BODY') {
    // Move entire image
    const newX = x + dx;
    const newY = y + dy;

    return {
      ...shape,
      x: newX,
      y: newY,
      bounds: {
        minX: newX,
        minY: newY,
        maxX: newX + width,
        maxY: newY + height,
      },
    };
  }

  // No other handles for image shapes
  return shape;
}

/**
 * Image Editor Component
 * Renders a simple drag handle for repositioning
 */
export function ImageEditor({ annotation, scale, onGrab }: ImageEditorProps) {
  if (annotation.shape.type !== 'image') return null;

  const { x, y, width, height } = annotation.shape;
  const strokeWidth = 2 / scale;

  return (
    <g className="annota-image-editor">
      {/* Body drag area - transparent rectangle covering the image */}
      <rect
        className="annota-shape-handle"
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        style={{ cursor: 'move' }}
        onPointerDown={onGrab('BODY')}
      />

      {/* Selection outline to indicate it's selected */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#9333EA"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / scale} ${4 / scale}`}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
