/**
 * Annota Core - Type Definitions
 * Framework-agnostic core annotation types
 */

// ============================================
// Geometry Types
// ============================================

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ============================================
// Shape Types
// ============================================

export type ShapeType =
  | 'point'
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'freehand'
  | 'line'
  | 'multipolygon';

export interface BaseShape {
  type: ShapeType;
  bounds: Bounds;
}

export interface PointShape extends BaseShape {
  type: 'point';
  point: Point;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  center: Point;
  radiusX: number;
  radiusY: number;
  rotation?: number; // Rotation in radians
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: Point[];
}

export interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: Point[];
  closed?: boolean; // If true, connects last point to first
}

export interface MultiPolygonShape extends BaseShape {
  type: 'multipolygon';
  polygons: Point[][];
}

export type Shape =
  | PointShape
  | CircleShape
  | EllipseShape
  | RectangleShape
  | LineShape
  | PolygonShape
  | FreehandShape
  | MultiPolygonShape;

// ============================================
// Style Types
// ============================================

export interface AnnotationStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export type StyleExpression = AnnotationStyle | ((annotation: Annotation) => AnnotationStyle);

// ============================================
// Annotation Types
// ============================================

export interface Annotation {
  id: string;
  shape: Shape;
  properties?: Record<string, any>;
  style?: AnnotationStyle;
}

// ============================================
// Filter & Query Types
// ============================================

export type Filter = (annotation: Annotation) => boolean;

// ============================================
// Geometry Utilities
// ============================================

/**
 * Calculate bounds from a shape
 */
export function calculateBounds(shape: Shape): Bounds {
  switch (shape.type) {
    case 'point':
      return {
        minX: shape.point.x,
        minY: shape.point.y,
        maxX: shape.point.x,
        maxY: shape.point.y,
      };

    case 'circle':
      return {
        minX: shape.center.x - shape.radius,
        minY: shape.center.y - shape.radius,
        maxX: shape.center.x + shape.radius,
        maxY: shape.center.y + shape.radius,
      };

    case 'ellipse': {
      // For simplicity, use axis-aligned bounding box (ignoring rotation)
      // For rotated ellipse, would need to calculate actual bounds
      const radiusX = shape.radiusX;
      const radiusY = shape.radiusY;
      return {
        minX: shape.center.x - radiusX,
        minY: shape.center.y - radiusY,
        maxX: shape.center.x + radiusX,
        maxY: shape.center.y + radiusY,
      };
    }

    case 'rectangle':
      return {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + shape.width,
        maxY: shape.y + shape.height,
      };

    case 'line': {
      return {
        minX: Math.min(shape.start.x, shape.end.x),
        minY: Math.min(shape.start.y, shape.end.y),
        maxX: Math.max(shape.start.x, shape.end.x),
        maxY: Math.max(shape.start.y, shape.end.y),
      };
    }

    case 'polygon':
    case 'freehand': {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }

    case 'multipolygon': {
      const allPoints = shape.polygons.flat();
      const xs = allPoints.map(p => p.x);
      const ys = allPoints.map(p => p.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }
  }
}

/**
 * Check if a point is inside a shape (with optional buffer for hit testing)
 */
export function containsPoint(shape: Shape, x: number, y: number, buffer = 0): boolean {
  switch (shape.type) {
    case 'point': {
      const dx = x - shape.point.x;
      const dy = y - shape.point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= buffer;
    }

    case 'circle': {
      const dx = x - shape.center.x;
      const dy = y - shape.center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= shape.radius + buffer;
    }

    case 'ellipse': {
      // Simplified ellipse test (ignoring rotation for now)
      const dx = (x - shape.center.x) / shape.radiusX;
      const dy = (y - shape.center.y) / shape.radiusY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= 1 + buffer / Math.max(shape.radiusX, shape.radiusY);
    }

    case 'rectangle': {
      return (
        x >= shape.x - buffer &&
        x <= shape.x + shape.width + buffer &&
        y >= shape.y - buffer &&
        y <= shape.y + shape.height + buffer
      );
    }

    case 'line': {
      // Check distance to line segment
      const dist = distanceToSegment(x, y, shape.start.x, shape.start.y, shape.end.x, shape.end.y);
      return dist <= buffer;
    }

    case 'polygon':
      return pointInPolygon(x, y, shape.points, buffer);

    case 'freehand': {
      // Freehand is like polygon, but may not be closed
      if (shape.closed) {
        return pointInPolygon(x, y, shape.points, buffer);
      } else {
        // For open freehand, check distance to the path
        return distanceToPolygon(x, y, shape.points) <= buffer;
      }
    }

    case 'multipolygon':
      return shape.polygons.some(polygon => pointInPolygon(x, y, polygon, buffer));
  }
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(x: number, y: number, polygon: Point[], buffer = 0): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const len = polygon.length;

  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  // If not inside but buffer is specified, check distance to edges
  if (!inside && buffer > 0) {
    return distanceToPolygon(x, y, polygon) <= buffer;
  }

  return inside;
}

/**
 * Calculate minimum distance from point to polygon edges
 */
function distanceToPolygon(x: number, y: number, polygon: Point[]): number {
  let minDist = Infinity;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const dist = distanceToSegment(x, y, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y);
    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

/**
 * Calculate distance from point to line segment
 */
function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Segment is a point
    const dx2 = px - x1;
    const dy2 = py - y1;
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
  }

  // Find projection of point onto line
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const dx2 = px - projX;
  const dy2 = py - projY;

  return Math.sqrt(dx2 * dx2 + dy2 * dy2);
}

/**
 * Check if two bounds intersect
 */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}
