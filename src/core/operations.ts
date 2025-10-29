/**
 * Annota Core - Geometry Operations
 * Operations for merging and splitting annotations
 */

import polygonClipping from 'polygon-clipping';
import type { Annotation, Point, PolygonShape, MultiPolygonShape } from './types';

/**
 * Generate a unique ID for annotations
 */
function generateId(prefix: string = 'annotation'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert various annotation shapes to polygon format for operations
 * Returns MultiPolygon format: Polygon[], where Polygon is Ring[], where Ring is [number, number][]
 */
export function toPolygonCoordinates(annotation: Annotation): polygonClipping.MultiPolygon | null {
  const { shape } = annotation;

  switch (shape.type) {
    case 'polygon':
      return [[shape.points.map(p => [p.x, p.y] as [number, number])]];

    case 'rectangle': {
      const { x, y, width, height } = shape;
      return [[
        [
          [x, y] as [number, number],
          [x + width, y] as [number, number],
          [x + width, y + height] as [number, number],
          [x, y + height] as [number, number],
          [x, y] as [number, number], // Close the ring
        ],
      ]];
    }

    case 'multipolygon':
      return shape.polygons.map(polygon => [polygon.map(p => [p.x, p.y] as [number, number])]);

    case 'freehand':
      if (shape.closed) {
        return [[shape.points.map(p => [p.x, p.y] as [number, number])]];
      }
      // Open freehand cannot be converted to polygon
      return null;

    case 'circle':
    case 'ellipse':
    case 'point':
    case 'line':
      // These types cannot be converted to polygons for clipping
      return null;

    default:
      return null;
  }
}

/**
 * Convert polygon coordinates back to Annota Point format
 */
function coordinatesToPoints(coords: number[][]): Point[] {
  return coords.map(([x, y]) => ({ x, y }));
}

/**
 * Calculate bounds for a set of points
 */
function calculateBounds(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Compute convex hull using Graham scan algorithm
 * Returns points in counter-clockwise order
 */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) {
    return points;
  }

  // Find the bottom-most point (or left-most if tied)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < points[start][1] ||
        (points[i][1] === points[start][1] && points[i][0] < points[start][0])) {
      start = i;
    }
  }

  // Sort points by polar angle with respect to start point
  const sorted = points.slice();
  const startPoint = sorted[start];
  sorted.splice(start, 1);

  sorted.sort((a, b) => {
    const angleA = Math.atan2(a[1] - startPoint[1], a[0] - startPoint[0]);
    const angleB = Math.atan2(b[1] - startPoint[1], b[0] - startPoint[0]);
    if (angleA !== angleB) {
      return angleA - angleB;
    }
    // If same angle, sort by distance
    const distA = (a[0] - startPoint[0]) ** 2 + (a[1] - startPoint[1]) ** 2;
    const distB = (b[0] - startPoint[0]) ** 2 + (b[1] - startPoint[1]) ** 2;
    return distA - distB;
  });

  // Build convex hull
  const hull: [number, number][] = [startPoint, sorted[0], sorted[1]];

  for (let i = 2; i < sorted.length; i++) {
    let top = hull.length - 1;

    // Remove points that make clockwise turn
    while (hull.length > 1 && ccw(hull[top - 1], hull[top], sorted[i]) <= 0) {
      hull.pop();
      top--;
    }

    hull.push(sorted[i]);
  }

  // Close the polygon
  hull.push(hull[0]);

  return hull;
}

/**
 * Cross product to determine orientation (counter-clockwise test)
 * Returns positive if counter-clockwise, negative if clockwise, 0 if collinear
 */
function ccw(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * Merge multiple separate polygons by computing convex hull
 * This creates a single polygon that bounds all input polygons
 */
function connectPolygons(multiPolygon: polygonClipping.MultiPolygon): [number, number][] {
  if (multiPolygon.length === 0) {
    return [];
  }

  if (multiPolygon.length === 1) {
    return multiPolygon[0][0];
  }

  // Collect all points from all polygons
  const allPoints: [number, number][] = [];
  for (const poly of multiPolygon) {
    // Only use outer ring (poly[0])
    for (const point of poly[0]) {
      allPoints.push(point);
    }
  }

  // Compute and return convex hull
  return convexHull(allPoints);
}

/**
 * Merge multiple annotations into a single annotation using polygon union
 *
 * @param annotations - Array of annotations to merge (must be polygon-compatible)
 * @returns Merged annotation, or null if merge fails
 *
 * @example
 * ```ts
 * const selected = annotator.getSelectedAnnotations();
 * const merged = mergeAnnotations(selected);
 * if (merged) {
 *   annotator.addAnnotation(merged);
 * }
 * ```
 */
export function mergeAnnotations(annotations: Annotation[]): Annotation | null {
  if (annotations.length === 0) {
    return null;
  }

  if (annotations.length === 1) {
    return annotations[0];
  }

  // Convert all annotations to polygon coordinates
  const polygonSets: polygonClipping.MultiPolygon[] = [];
  for (const annotation of annotations) {
    const coords = toPolygonCoordinates(annotation);
    if (!coords) {
      console.error('[mergeAnnotations] Cannot merge annotation of type:', annotation.shape.type);
      return null;
    }
    polygonSets.push(coords);
  }

  try {
    // Use polygon-clipping to compute union
    // Union all polygons together
    let result: polygonClipping.MultiPolygon = polygonSets[0];
    for (let i = 1; i < polygonSets.length; i++) {
      result = polygonClipping.union(result, polygonSets[i]) as polygonClipping.MultiPolygon;
    }

    if (!result || result.length === 0) {
      console.error('[mergeAnnotations] Union resulted in empty geometry');
      return null;
    }

    // Use first annotation's properties as base
    const baseAnnotation = annotations[0];
    const properties = { ...baseAnnotation.properties };

    // Create merged annotation
    // Always prefer single polygon if possible
    let shape: PolygonShape | MultiPolygonShape;

    if (result.length === 1) {
      // Single polygon (may have holes in result[0][1], result[0][2], etc.)
      // For now, only use the outer ring (result[0][0]) and ignore holes
      const points = coordinatesToPoints(result[0][0]);
      shape = {
        type: 'polygon',
        points,
        bounds: calculateBounds(points),
      };
    } else {
      // Multiple separate polygons - connect them into a single polygon
      const mergedPolygon = connectPolygons(result);
      const points = coordinatesToPoints(mergedPolygon);
      shape = {
        type: 'polygon',
        points,
        bounds: calculateBounds(points),
      };
    }

    return {
      id: generateId(),
      shape,
      properties,
      style: baseAnnotation.style,
      maskPolarity: baseAnnotation.maskPolarity,
    };
  } catch (error) {
    console.error('[mergeAnnotations] Failed to merge annotations:', error);
    return null;
  }
}

/**
 * Split an annotation into multiple parts using a cut line
 *
 * @param annotation - Annotation to split (must be polygon-compatible)
 * @param splitLine - Array of points defining the cut line
 * @returns Array of split annotations, or null if split fails
 *
 * @example
 * ```ts
 * const annotation = annotator.getAnnotation(id);
 * const splitLine = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
 * const pieces = splitAnnotation(annotation, splitLine);
 * if (pieces) {
 *   pieces.forEach(piece => annotator.addAnnotation(piece));
 * }
 * ```
 */
export function splitAnnotation(
  annotation: Annotation,
  splitLine: Point[]
): Annotation[] | null {
  if (splitLine.length < 2) {
    console.error('[splitAnnotation] Split line must have at least 2 points');
    return null;
  }

  // Convert annotation to polygon coordinates
  const targetPolygons = toPolygonCoordinates(annotation);
  if (!targetPolygons) {
    console.error('[splitAnnotation] Cannot split annotation of type:', annotation.shape.type);
    return null;
  }

  // Create a buffer polygon from the split line
  // The line needs width to act as a cutting shape
  const lineCoords = splitLine.map(p => [p.x, p.y] as [number, number]);

  // Calculate perpendicular offset for line buffer (use small width)
  const bufferWidth = 0.5;
  const bufferedLine = createLineBuffer(lineCoords, bufferWidth);

  try {
    // Use difference operation to cut the polygon
    const result = polygonClipping.difference(targetPolygons, [[bufferedLine]]) as polygonClipping.MultiPolygon;

    if (!result || result.length === 0) {
      console.error('[splitAnnotation] Split resulted in empty geometry');
      return null;
    }

    if (result.length === 1) {
      console.error('[splitAnnotation] Split did not divide the annotation (line may not intersect)');
      return null;
    }

    // Create new annotations from split pieces
    const pieces: Annotation[] = [];

    for (const poly of result) {
      const points = coordinatesToPoints(poly[0]);
      const shape: PolygonShape = {
        type: 'polygon',
        points,
        bounds: calculateBounds(points),
      };

      pieces.push({
        id: generateId(),
        shape,
        properties: { ...annotation.properties },
        style: annotation.style,
        maskPolarity: annotation.maskPolarity,
      });
    }

    return pieces;
  } catch (error) {
    console.error('[splitAnnotation] Failed to split annotation:', error);
    return null;
  }
}

/**
 * Create a buffer polygon around a line (for splitting operations)
 */
function createLineBuffer(lineCoords: [number, number][], width: number): [number, number][] {
  const buffer: [number, number][] = [];

  // Create offset on both sides of the line
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const [x1, y1] = lineCoords[i];
    const [x2, y2] = lineCoords[i + 1];

    // Calculate perpendicular vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / length) * width;
    const perpY = (dx / length) * width;

    // Add points on both sides
    if (i === 0) {
      buffer.push([x1 + perpX, y1 + perpY]);
    }
    buffer.push([x2 + perpX, y2 + perpY]);
  }

  // Add return path on opposite side
  for (let i = lineCoords.length - 1; i >= 0; i--) {
    const [x, y] = lineCoords[i];
    const dx = i > 0 ? lineCoords[i][0] - lineCoords[i - 1][0] : 0;
    const dy = i > 0 ? lineCoords[i][1] - lineCoords[i - 1][1] : 0;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = (-dy / length) * width;
    const perpY = (dx / length) * width;

    buffer.push([x - perpX, y - perpY]);
  }

  // Close the polygon
  buffer.push(buffer[0]);

  return buffer;
}

/**
 * Check if annotations are compatible for merging
 */
export function canMergeAnnotations(annotations: Annotation[]): boolean {
  if (annotations.length < 2) {
    return false;
  }

  // All annotations must be polygon-compatible
  return annotations.every(ann => {
    const coords = toPolygonCoordinates(ann);
    return coords !== null;
  });
}

/**
 * Check if annotation can be split
 */
export function canSplitAnnotation(annotation: Annotation): boolean {
  const coords = toPolygonCoordinates(annotation);
  return coords !== null;
}
