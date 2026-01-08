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

/**
 * Hit test handles for a shape
 * Returns the handle position if the point is within a handle, undefined otherwise
 * 
 * @param shape - The shape to test handles for
 * @param point - The point to test (in image coordinates)
 * @param scale - Current viewport scale
 * @param hitRadius - Hit detection radius in screen pixels (default: 10)
 */
export function hitTestHandles(
  shape: Shape,
  point: Point,
  scale: number,
  hitRadius: number = 10
): HandlePosition | undefined {
  const handles = getHandlesForShape(shape);
  const hitRadiusImage = hitRadius / scale; // Convert screen pixels to image coordinates

  for (const handle of handles) {
    const dx = point.x - handle.point.x;
    const dy = point.y - handle.point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= hitRadiusImage) {
      return handle.position;
    }
  }

  return undefined;
}

/**
 * Cursor style for each handle position
 */
export function getCursorForHandle(position: HandlePosition): string {
  switch (position) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'start':
    case 'end':
    case 'vertex':
      return 'move';
    default:
      return 'default';
  }
}

/**
 * Edit a shape by moving a handle
 * Returns a new shape with the updated geometry
 */
export function editShapeWithHandle(
  shape: Shape,
  handlePosition: HandlePosition,
  delta: Point
): Shape {
  const { x: dx, y: dy } = delta;

  switch (shape.type) {
    case 'rectangle':
    case 'image': {
      const { bounds } = shape;
      let minX = bounds.minX;
      let minY = bounds.minY;
      let maxX = bounds.maxX;
      let maxY = bounds.maxY;

      switch (handlePosition) {
        case 'nw':
          minX += dx;
          minY += dy;
          break;
        case 'n':
          minY += dy;
          break;
        case 'ne':
          maxX += dx;
          minY += dy;
          break;
        case 'w':
          minX += dx;
          break;
        case 'e':
          maxX += dx;
          break;
        case 'sw':
          minX += dx;
          maxY += dy;
          break;
        case 's':
          maxY += dy;
          break;
        case 'se':
          maxX += dx;
          maxY += dy;
          break;
      }

      // Prevent flipping by swapping if needed
      if (minX > maxX) [minX, maxX] = [maxX, minX];
      if (minY > maxY) [minY, maxY] = [maxY, minY];

      const newBounds = { minX, minY, maxX, maxY };

      if (shape.type === 'rectangle') {
        return {
          type: 'rectangle',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          bounds: newBounds,
        };
      } else {
        return {
          ...shape,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          bounds: newBounds,
        };
      }
    }

    case 'circle': {
      const { center, bounds } = shape;
      let minX = bounds.minX;
      let minY = bounds.minY;
      let maxX = bounds.maxX;
      let maxY = bounds.maxY;

      // For circles, dragging any handle adjusts the radius uniformly
      switch (handlePosition) {
        case 'nw':
          minX += dx;
          minY += dy;
          break;
        case 'n':
          minY += dy;
          break;
        case 'ne':
          maxX += dx;
          minY += dy;
          break;
        case 'w':
          minX += dx;
          break;
        case 'e':
          maxX += dx;
          break;
        case 'sw':
          minX += dx;
          maxY += dy;
          break;
        case 's':
          maxY += dy;
          break;
        case 'se':
          maxX += dx;
          maxY += dy;
          break;
      }

      // Calculate new radius as average of half-width and half-height
      const newWidth = Math.abs(maxX - minX);
      const newHeight = Math.abs(maxY - minY);
      const newRadius = Math.max((newWidth + newHeight) / 4, 1);

      // Keep center or adjust based on handle
      const newCenter = { ...center };

      return {
        type: 'circle',
        center: newCenter,
        radius: newRadius,
        bounds: {
          minX: newCenter.x - newRadius,
          minY: newCenter.y - newRadius,
          maxX: newCenter.x + newRadius,
          maxY: newCenter.y + newRadius,
        },
      };
    }

    case 'ellipse': {
      const { center, bounds } = shape;
      let minX = bounds.minX;
      let minY = bounds.minY;
      let maxX = bounds.maxX;
      let maxY = bounds.maxY;

      switch (handlePosition) {
        case 'nw':
          minX += dx;
          minY += dy;
          break;
        case 'n':
          minY += dy;
          break;
        case 'ne':
          maxX += dx;
          minY += dy;
          break;
        case 'w':
          minX += dx;
          break;
        case 'e':
          maxX += dx;
          break;
        case 'sw':
          minX += dx;
          maxY += dy;
          break;
        case 's':
          maxY += dy;
          break;
        case 'se':
          maxX += dx;
          maxY += dy;
          break;
      }

      const newRx = Math.abs(maxX - minX) / 2;
      const newRy = Math.abs(maxY - minY) / 2;
      const newCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
      };

      return {
        type: 'ellipse',
        center: newCenter,
        rx: newRx,
        ry: newRy,
        bounds: { minX, minY, maxX, maxY },
      };
    }

    case 'line': {
      if (handlePosition === 'start') {
        const newStart = { x: shape.start.x + dx, y: shape.start.y + dy };
        return {
          ...shape,
          start: newStart,
          bounds: {
            minX: Math.min(newStart.x, shape.end.x),
            minY: Math.min(newStart.y, shape.end.y),
            maxX: Math.max(newStart.x, shape.end.x),
            maxY: Math.max(newStart.y, shape.end.y),
          },
        };
      } else if (handlePosition === 'end') {
        const newEnd = { x: shape.end.x + dx, y: shape.end.y + dy };
        return {
          ...shape,
          end: newEnd,
          bounds: {
            minX: Math.min(shape.start.x, newEnd.x),
            minY: Math.min(shape.start.y, newEnd.y),
            maxX: Math.max(shape.start.x, newEnd.x),
            maxY: Math.max(shape.start.y, newEnd.y),
          },
        };
      }
      return shape;
    }

    case 'polygon':
    case 'freehand':
    case 'path':
    case 'multipolygon': {
      // For polygons etc., scale based on bounding box corners
      const { bounds } = shape;
      let minX = bounds.minX;
      let minY = bounds.minY;
      let maxX = bounds.maxX;
      let maxY = bounds.maxY;

      const origWidth = maxX - minX;
      const origHeight = maxY - minY;

      switch (handlePosition) {
        case 'nw':
          minX += dx;
          minY += dy;
          break;
        case 'ne':
          maxX += dx;
          minY += dy;
          break;
        case 'sw':
          minX += dx;
          maxY += dy;
          break;
        case 'se':
          maxX += dx;
          maxY += dy;
          break;
      }

      // Prevent zero dimensions
      if (minX >= maxX) maxX = minX + 1;
      if (minY >= maxY) maxY = minY + 1;

      const newWidth = maxX - minX;
      const newHeight = maxY - minY;
      const scaleX = newWidth / origWidth;
      const scaleY = newHeight / origHeight;

      // Scale all points
      const scalePoint = (p: Point): Point => ({
        x: minX + (p.x - bounds.minX) * scaleX,
        y: minY + (p.y - bounds.minY) * scaleY,
      });

      if (shape.type === 'polygon' || shape.type === 'freehand') {
        return {
          ...shape,
          points: shape.points.map(scalePoint),
          bounds: { minX, minY, maxX, maxY },
        };
      } else if (shape.type === 'path') {
        return {
          ...shape,
          points: shape.points.map(scalePoint),
          bounds: { minX, minY, maxX, maxY },
        };
      } else if (shape.type === 'multipolygon') {
        return {
          ...shape,
          polygons: shape.polygons.map(polygon => ({
            ...polygon,
            points: polygon.points.map(scalePoint),
          })),
          bounds: { minX, minY, maxX, maxY },
        };
      }
      return shape;
    }

    default:
      return shape;
  }
}
