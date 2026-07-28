import polygonClipping from 'polygon-clipping';
import { AnnotaError } from './errors';
import { normalizeAnnotation } from './normalization';
import { splitAnnotation, toPolygonCoordinates } from './operations';
import { containsPoint, type Bounds, type Point, type Shape, type ShapeInput } from './types';

export interface GeometryController {
  intersects(a: Shape, b: Shape): boolean;
  contains(container: Shape, target: Shape): boolean;
  intersection(a: Shape, b: Shape): Shape | null;
  iou(a: Shape, b: Shape): number;
  merge(shapes: readonly Shape[]): Shape | null;
  split(shape: Shape, line: readonly Point[]): Shape[];
}

function toCoordinates(shape: Shape): polygonClipping.MultiPolygon {
  const coordinates = toPolygonCoordinates({ id: 'geometry', shape, layerId: 'default' });
  if (!coordinates) {
    throw new AnnotaError(
      'GEOMETRY_UNSUPPORTED',
      `Exact polygon geometry is not supported for shape type ${shape.type}`
    );
  }
  return coordinates;
}

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    area += ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
  }
  return Math.abs(area) / 2;
}

function multiPolygonArea(polygons: polygonClipping.MultiPolygon): number {
  return polygons.reduce(
    (total, polygon) =>
      total + polygon.reduce((area, ring, index) => area + (index === 0 ? 1 : -1) * ringArea(ring), 0),
    0
  );
}

function coordinatesToShape(result: polygonClipping.MultiPolygon): Shape | null {
  if (result.length === 0) return null;
  if (result.some(polygon => polygon.length > 1)) {
    throw new AnnotaError(
      'GEOMETRY_UNSUPPORTED',
      'Geometry result contains holes, which the current Shape model cannot represent'
    );
  }
  if (result.length === 1) {
    const points = result[0][0].map(([x, y]) => ({ x, y }));
    return normalizeAnnotation({
      id: 'geometry',
      shape: { type: 'polygon', points },
    }).shape;
  }
  return normalizeAnnotation({
    id: 'geometry',
    shape: {
      type: 'multipolygon',
      polygons: result.map(polygon => polygon[0].map(([x, y]) => ({ x, y }))),
    },
  }).shape;
}

function boundsContain(container: Bounds, target: Bounds): boolean {
  return (
    container.minX <= target.minX &&
    container.minY <= target.minY &&
    container.maxX >= target.maxX &&
    container.maxY >= target.maxY
  );
}

export function createGeometryController(): GeometryController {
  return {
    intersects(a, b) {
      const result = polygonClipping.intersection(toCoordinates(a), toCoordinates(b));
      return result.length > 0 && multiPolygonArea(result) > 0;
    },
    contains(container, target) {
      if (!boundsContain(container.bounds, target.bounds)) return false;
      if (target.type === 'point') {
        return containsPoint(container, target.point.x, target.point.y);
      }
      const targetCoordinates = toCoordinates(target);
      const outside = polygonClipping.difference(targetCoordinates, toCoordinates(container));
      return multiPolygonArea(outside) <= 1e-9;
    },
    intersection(a, b) {
      return coordinatesToShape(polygonClipping.intersection(toCoordinates(a), toCoordinates(b)));
    },
    iou(a, b) {
      const left = toCoordinates(a);
      const right = toCoordinates(b);
      const intersection = polygonClipping.intersection(left, right);
      const union = polygonClipping.union(left, right);
      const unionArea = multiPolygonArea(union);
      return unionArea === 0 ? 0 : multiPolygonArea(intersection) / unionArea;
    },
    merge(shapes) {
      if (shapes.length === 0) return null;
      const [first, ...rest] = shapes;
      let result = toCoordinates(first);
      rest.forEach(shape => {
        result = polygonClipping.union(result, toCoordinates(shape));
      });
      return coordinatesToShape(result);
    },
    split(shape, line) {
      const pieces = splitAnnotation(
        { id: 'geometry', shape, layerId: 'default' },
        line.map(point => ({ ...point }))
      );
      return pieces?.map(piece => piece.shape) ?? [];
    },
  };
}

export function normalizeShapeInput(shape: ShapeInput): Shape {
  return normalizeAnnotation({ id: 'geometry', shape }).shape;
}
