/**
 * Annota Core - Type Definitions
 * Framework-agnostic core annotation types
 */

// ============================================
// Geometry Types
// ============================================

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
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
  | 'multipolygon'
  | 'image'
  | 'path';

export interface BaseShape {
  readonly type: ShapeType;
  readonly bounds: Bounds;
}

export interface PointShape extends BaseShape {
  readonly type: 'point';
  readonly point: Point;
}

export interface CircleShape extends BaseShape {
  readonly type: 'circle';
  readonly center: Point;
  readonly radius: number;
}

export interface EllipseShape extends BaseShape {
  readonly type: 'ellipse';
  readonly center: Point;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotation?: number; // Rotation in radians
}

export interface RectangleShape extends BaseShape {
  readonly type: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LineShape extends BaseShape {
  readonly type: 'line';
  readonly start: Point;
  readonly end: Point;
}

export interface PolygonShape extends BaseShape {
  readonly type: 'polygon';
  readonly points: readonly Point[];
}

export interface FreehandShape extends BaseShape {
  readonly type: 'freehand';
  readonly points: readonly Point[];
  readonly closed?: boolean; // If true, connects last point to first
}

export interface MultiPolygonShape extends BaseShape {
  readonly type: 'multipolygon';
  readonly polygons: readonly (readonly Point[])[];
}

export interface ImageShape extends BaseShape {
  readonly type: 'image';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly url: string; // Data URL or image source URL
  readonly opacity?: number; // Optional opacity (0-1)
}

/**
 * Control point for bezier or spline curves
 */
export interface ControlPoint extends Point {
  readonly handleIn?: Point; // Incoming control handle (relative to point)
  readonly handleOut?: Point; // Outgoing control handle (relative to point)
  readonly smooth?: boolean; // Whether this is a smooth point or cusp
}

export interface PathShape extends BaseShape {
  readonly type: 'path';
  readonly points: readonly ControlPoint[]; // Control points with optional handles
  readonly closed: boolean; // Whether the path is closed
  readonly smoothing?: 'bezier' | 'catmull-rom' | 'none'; // Smoothing algorithm
}

export type Shape =
  | PointShape
  | CircleShape
  | EllipseShape
  | RectangleShape
  | LineShape
  | PolygonShape
  | FreehandShape
  | MultiPolygonShape
  | ImageShape
  | PathShape;

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

export interface AnnotationProperties {
  [key: string]: unknown;
}

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer Item)[]
      ? readonly DeepReadonly<Item>[]
      : T extends object
        ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
        : T;

export type DeepMutable<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer Item)[]
      ? DeepMutable<Item>[]
      : T extends object
        ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
        : T;

type WithoutBounds<T extends Shape> = DeepMutable<Omit<T, 'bounds'>> & {
  /** @deprecated Bounds are computed by Annota and ignored on input. */
  bounds?: DeepMutable<Bounds>;
};

export type ShapeInput =
  | WithoutBounds<PointShape>
  | WithoutBounds<CircleShape>
  | WithoutBounds<EllipseShape>
  | WithoutBounds<RectangleShape>
  | WithoutBounds<LineShape>
  | WithoutBounds<PolygonShape>
  | WithoutBounds<FreehandShape>
  | WithoutBounds<MultiPolygonShape>
  | WithoutBounds<ImageShape>
  | WithoutBounds<PathShape>;

export interface AnnotationInput<P extends AnnotationProperties = AnnotationProperties> {
  id: string;
  shape: ShapeInput;
  layerId?: string;
  properties?: P;
  style?: AnnotationStyle;
}

/**
 * A normalized annotation snapshot. Instances returned by the public API are
 * detached and frozen; callers must use an update operation to change them.
 */
export interface Annotation<P extends AnnotationProperties = AnnotationProperties> {
  readonly id: string;
  readonly shape: Shape;
  readonly layerId: string;
  readonly properties?: DeepReadonly<P>;
  readonly style?: Readonly<AnnotationStyle>;
}

export type AnnotationSource<P extends AnnotationProperties = AnnotationProperties> =
  | AnnotationInput<P>
  | Annotation<P>;

export interface AnnotationPatch<P extends AnnotationProperties = AnnotationProperties> {
  shape?: ShapeInput | Shape;
  layerId?: string | null;
  properties?: Partial<P> | null;
  style?: Partial<AnnotationStyle> | null;
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

    case 'image':
      return {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + shape.width,
        maxY: shape.y + shape.height,
      };

    case 'path': {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
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

    case 'image': {
      // Image shapes are selectable within their bounding rectangle
      return (
        x >= shape.x - buffer &&
        x <= shape.x + shape.width + buffer &&
        y >= shape.y - buffer &&
        y <= shape.y + shape.height + buffer
      );
    }

    case 'path': {
      // Path is like polygon - check if point is inside when closed
      if (shape.closed) {
        return pointInPolygon(x, y, shape.points, buffer);
      } else {
        // For open paths, check distance to the path
        return distanceToPolygon(x, y, shape.points) <= buffer;
      }
    }
  }
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(x: number, y: number, polygon: readonly Point[], buffer = 0): boolean {
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
function distanceToPolygon(x: number, y: number, polygon: readonly Point[]): number {
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

/**
 * Translate a shape by a delta (dx, dy)
 * Returns a new shape with all coordinates translated
 */
export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  switch (shape.type) {
    case 'point':
      return {
        type: 'point',
        point: { x: shape.point.x + dx, y: shape.point.y + dy },
        bounds: {
          minX: shape.point.x + dx,
          minY: shape.point.y + dy,
          maxX: shape.point.x + dx,
          maxY: shape.point.y + dy,
        },
      };

    case 'circle':
      return {
        type: 'circle',
        center: { x: shape.center.x + dx, y: shape.center.y + dy },
        radius: shape.radius,
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'ellipse':
      return {
        type: 'ellipse',
        center: { x: shape.center.x + dx, y: shape.center.y + dy },
        radiusX: shape.radiusX,
        radiusY: shape.radiusY,
        rotation: shape.rotation,
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'rectangle':
      return {
        type: 'rectangle',
        x: shape.x + dx,
        y: shape.y + dy,
        width: shape.width,
        height: shape.height,
        bounds: {
          minX: shape.x + dx,
          minY: shape.y + dy,
          maxX: shape.x + shape.width + dx,
          maxY: shape.y + shape.height + dy,
        },
      };

    case 'line':
      return {
        type: 'line',
        start: { x: shape.start.x + dx, y: shape.start.y + dy },
        end: { x: shape.end.x + dx, y: shape.end.y + dy },
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'polygon':
      return {
        type: 'polygon',
        points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'freehand':
      return {
        type: 'freehand',
        points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        closed: shape.closed,
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'multipolygon':
      return {
        type: 'multipolygon',
        polygons: shape.polygons.map(poly => poly.map(p => ({ x: p.x + dx, y: p.y + dy }))),
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    case 'image':
      return {
        type: 'image',
        x: shape.x + dx,
        y: shape.y + dy,
        width: shape.width,
        height: shape.height,
        url: shape.url,
        opacity: shape.opacity,
        bounds: {
          minX: shape.x + dx,
          minY: shape.y + dy,
          maxX: shape.x + shape.width + dx,
          maxY: shape.y + shape.height + dy,
        },
      };

    case 'path':
      return {
        type: 'path',
        points: shape.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy,
          handleIn: p.handleIn,
          handleOut: p.handleOut,
          smooth: p.smooth,
        })),
        closed: shape.closed,
        smoothing: shape.smoothing,
        bounds: {
          minX: shape.bounds.minX + dx,
          minY: shape.bounds.minY + dy,
          maxX: shape.bounds.maxX + dx,
          maxY: shape.bounds.maxY + dy,
        },
      };

    default:
      return shape;
  }
}
