/**
 * Annota Rendering - Selection Handle Rendering
 * Renders resize handles (white circles) for selected annotations
 */

import * as PIXI from 'pixi.js';
import type { Shape, Point, Bounds } from '../../core/types';

/**
 * Handle position identifiers
 */
export type HandlePosition =
  | 'nw' | 'n' | 'ne'  // top row
  | 'w' | 'e'     // middle row
  | 'sw' | 's' | 'se'   // bottom row
  | 'start' | 'end'     // for lines
  | 'vertex';           // for polygons/paths

/**
 * Handle style configuration
 */
export interface HandleStyle {
  radius: number;        // Handle radius in pixels (screen space)
  fill: number;          // Handle fill color
  fillAlpha: number;     // Handle fill alpha
  stroke: number;        // Handle stroke color  
  strokeAlpha: number;   // Handle stroke alpha
  strokeWidth: number;   // Handle stroke width in pixels
}

/**
 * Default handle style
 */
export const DEFAULT_HANDLE_STYLE: HandleStyle = {
  radius: 5,
  fill: 0xffffff,       // White fill
  fillAlpha: 1.0,
  stroke: 0x0066ff,     // Blue stroke to match selection color
  strokeAlpha: 1.0,
  strokeWidth: 1.5,
};

/**
 * Get handle positions for a shape's bounding box
 * Returns 8 handle positions for rectangles, circles, ellipses, etc.
 */
export function getBoundingBoxHandles(bounds: Bounds): { position: HandlePosition; point: Point }[] {
  const { minX, minY, maxX, maxY } = bounds;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return [
    { position: 'nw', point: { x: minX, y: minY } },
    { position: 'n', point: { x: midX, y: minY } },
    { position: 'ne', point: { x: maxX, y: minY } },
    { position: 'w', point: { x: minX, y: midY } },
    { position: 'e', point: { x: maxX, y: midY } },
    { position: 'sw', point: { x: minX, y: maxY } },
    { position: 's', point: { x: midX, y: maxY } },
    { position: 'se', point: { x: maxX, y: maxY } },
  ];
}

/**
 * Get corner handles only (for shapes where edge handles don't make sense)
 */
export function getCornerHandles(bounds: Bounds): { position: HandlePosition; point: Point }[] {
  const { minX, minY, maxX, maxY } = bounds;

  return [
    { position: 'nw', point: { x: minX, y: minY } },
    { position: 'ne', point: { x: maxX, y: minY } },
    { position: 'sw', point: { x: minX, y: maxY } },
    { position: 'se', point: { x: maxX, y: maxY } },
  ];
}

/**
 * Get handle positions for a line shape
 */
export function getLineHandles(start: Point, end: Point): { position: HandlePosition; point: Point }[] {
  return [
    { position: 'start', point: start },
    { position: 'end', point: end },
  ];
}

/**
 * Get handle positions for a shape based on its type
 */
export function getHandlesForShape(shape: Shape): { position: HandlePosition; point: Point }[] {
  switch (shape.type) {
    case 'point':
      // Points don't have resize handles
      return [];

    case 'line':
      return getLineHandles(shape.start, shape.end);

    case 'circle':
    case 'ellipse':
      // Circle/ellipse: 4 corner handles + 4 edge handles
      return getBoundingBoxHandles(shape.bounds);

    case 'rectangle':
    case 'image':
      // Rectangle/image: 8 handles (4 corners + 4 edges)
      return getBoundingBoxHandles(shape.bounds);

    case 'polygon':
    case 'freehand':
    case 'path':
      // For polygon/freehand/path: use corner handles on bounding box
      // (Vertex editing would be a separate feature)
      return getCornerHandles(shape.bounds);

    case 'multipolygon':
      // Use corner handles on overall bounding box
      return getCornerHandles(shape.bounds);

    default:
      return getCornerHandles(shape.bounds);
  }
}

/**
 * Render selection handles onto a graphics object
 * 
 * @param graphics - The PIXI.Graphics to render handles on
 * @param shape - The shape to render handles for
 * @param scale - Current viewport scale (for counter-scaling handle size)
 * @param style - Optional handle style override
 */
export function renderHandles(
  graphics: PIXI.Graphics,
  shape: Shape,
  scale: number,
  style: HandleStyle = DEFAULT_HANDLE_STYLE
): void {
  const handles = getHandlesForShape(shape);

  if (handles.length === 0) return;

  // Counter-scale the handle size so it stays constant in screen space
  const radius = style.radius / scale;
  const strokeWidth = style.strokeWidth / scale;

  for (const handle of handles) {
    graphics
      .circle(handle.point.x, handle.point.y, radius)
      .fill({ color: style.fill, alpha: style.fillAlpha })
      .stroke({
        width: strokeWidth,
        color: style.stroke,
        alpha: style.strokeAlpha,
      });
  }
}

/**
 * Create a separate Graphics object for handles
 * This is useful when handles need to be rendered separately from the shape
 */
export function createHandleGraphics(): PIXI.Graphics {
  return new PIXI.Graphics();
}
