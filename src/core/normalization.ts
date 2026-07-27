import { AnnotationValidationError } from './errors';
import { calculateBounds } from './types';
import type {
  Annotation,
  AnnotationInput,
  AnnotationPatch,
  AnnotationProperties,
  AnnotationStyle,
  Point,
  Shape,
  ShapeInput,
} from './types';

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new AnnotationValidationError(`${label} must be a finite number`);
  }
}

function clonePoint(point: Point, label: string): Point {
  assertFinite(point.x, `${label}.x`);
  assertFinite(point.y, `${label}.y`);
  return { x: point.x, y: point.y };
}

function normalizeShape(shape: ShapeInput | Shape): Shape {
  if (!shape || typeof shape !== 'object' || typeof shape.type !== 'string') {
    throw new AnnotationValidationError('Annotation shape is required');
  }

  let normalized: Shape;
  switch (shape.type) {
    case 'point':
      normalized = { type: 'point', point: clonePoint(shape.point, 'shape.point'), bounds: emptyBounds() };
      break;
    case 'circle':
      assertFinite(shape.radius, 'shape.radius');
      if (shape.radius < 0) throw new AnnotationValidationError('shape.radius cannot be negative');
      normalized = {
        type: 'circle',
        center: clonePoint(shape.center, 'shape.center'),
        radius: shape.radius,
        bounds: emptyBounds(),
      };
      break;
    case 'ellipse':
      assertFinite(shape.radiusX, 'shape.radiusX');
      assertFinite(shape.radiusY, 'shape.radiusY');
      if (shape.radiusX < 0 || shape.radiusY < 0) {
        throw new AnnotationValidationError('ellipse radii cannot be negative');
      }
      normalized = {
        type: 'ellipse',
        center: clonePoint(shape.center, 'shape.center'),
        radiusX: shape.radiusX,
        radiusY: shape.radiusY,
        ...(shape.rotation === undefined ? {} : { rotation: shape.rotation }),
        bounds: emptyBounds(),
      };
      break;
    case 'rectangle':
      assertFinite(shape.x, 'shape.x');
      assertFinite(shape.y, 'shape.y');
      assertFinite(shape.width, 'shape.width');
      assertFinite(shape.height, 'shape.height');
      normalized = {
        type: 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        bounds: emptyBounds(),
      };
      break;
    case 'line':
      normalized = {
        type: 'line',
        start: clonePoint(shape.start, 'shape.start'),
        end: clonePoint(shape.end, 'shape.end'),
        bounds: emptyBounds(),
      };
      break;
    case 'polygon':
      if (shape.points.length < 3) {
        throw new AnnotationValidationError('polygon requires at least three points');
      }
      normalized = {
        type: 'polygon',
        points: shape.points.map((point, index) => clonePoint(point, `shape.points[${index}]`)),
        bounds: emptyBounds(),
      };
      break;
    case 'freehand':
      if (shape.points.length === 0) {
        throw new AnnotationValidationError('freehand requires at least one point');
      }
      normalized = {
        type: 'freehand',
        points: shape.points.map((point, index) => clonePoint(point, `shape.points[${index}]`)),
        ...(shape.closed === undefined ? {} : { closed: shape.closed }),
        bounds: emptyBounds(),
      };
      break;
    case 'multipolygon':
      if (shape.polygons.length === 0 || shape.polygons.some(points => points.length < 3)) {
        throw new AnnotationValidationError('multipolygon requires non-empty polygons');
      }
      normalized = {
        type: 'multipolygon',
        polygons: shape.polygons.map((points, polygonIndex) =>
          points.map((point, pointIndex) =>
            clonePoint(point, `shape.polygons[${polygonIndex}][${pointIndex}]`)
          )
        ),
        bounds: emptyBounds(),
      };
      break;
    case 'image':
      assertFinite(shape.x, 'shape.x');
      assertFinite(shape.y, 'shape.y');
      assertFinite(shape.width, 'shape.width');
      assertFinite(shape.height, 'shape.height');
      if (!shape.url) throw new AnnotationValidationError('image url is required');
      normalized = {
        type: 'image',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        url: shape.url,
        ...(shape.opacity === undefined ? {} : { opacity: shape.opacity }),
        bounds: emptyBounds(),
      };
      break;
    case 'path':
      if (shape.points.length === 0) {
        throw new AnnotationValidationError('path requires at least one point');
      }
      normalized = {
        type: 'path',
        points: shape.points.map((point, index) => ({
          ...clonePoint(point, `shape.points[${index}]`),
          ...(point.handleIn ? { handleIn: clonePoint(point.handleIn, 'handleIn') } : {}),
          ...(point.handleOut ? { handleOut: clonePoint(point.handleOut, 'handleOut') } : {}),
          ...(point.smooth === undefined ? {} : { smooth: point.smooth }),
        })),
        closed: shape.closed,
        ...(shape.smoothing === undefined ? {} : { smoothing: shape.smoothing }),
        bounds: emptyBounds(),
      };
      break;
    default:
      throw new AnnotationValidationError(
        `Unsupported shape type: ${String((shape as { type?: unknown }).type)}`
      );
  }

  normalized.bounds = calculateBounds(normalized);
  return normalized;
}

function emptyBounds() {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

function cloneProperties<P extends AnnotationProperties>(properties?: P): P | undefined {
  return properties === undefined ? undefined : ({ ...properties } as P);
}

function cloneStyle(style?: AnnotationStyle): AnnotationStyle | undefined {
  return style === undefined ? undefined : { ...style };
}

function freezeAnnotation<P extends AnnotationProperties>(annotation: Annotation<P>): Annotation<P> {
  Object.freeze(annotation.shape.bounds);
  if ('points' in annotation.shape) {
    annotation.shape.points.forEach(Object.freeze);
    Object.freeze(annotation.shape.points);
  }
  if (annotation.shape.type === 'multipolygon') {
    annotation.shape.polygons.forEach(points => {
      points.forEach(Object.freeze);
      Object.freeze(points);
    });
    Object.freeze(annotation.shape.polygons);
  }
  if ('center' in annotation.shape) Object.freeze(annotation.shape.center);
  if (annotation.shape.type === 'point') Object.freeze(annotation.shape.point);
  if (annotation.shape.type === 'line') {
    Object.freeze(annotation.shape.start);
    Object.freeze(annotation.shape.end);
  }
  Object.freeze(annotation.shape);
  if (annotation.properties) Object.freeze(annotation.properties);
  if (annotation.style) Object.freeze(annotation.style);
  return Object.freeze(annotation);
}

export function normalizeAnnotation<P extends AnnotationProperties = AnnotationProperties>(
  input: AnnotationInput<P>
): Annotation<P> {
  if (!input || typeof input !== 'object') {
    throw new AnnotationValidationError('Annotation input is required');
  }
  if (typeof input.id !== 'string' || input.id.length === 0) {
    throw new AnnotationValidationError('Annotation id must be a non-empty string');
  }

  const properties = cloneProperties(input.properties);
  const legacyLayer = properties?.layer;
  const layerId =
    input.layerId ??
    (typeof legacyLayer === 'string' && legacyLayer.length > 0 ? legacyLayer : 'default');
  if (properties && 'layer' in properties) delete properties.layer;

  return freezeAnnotation({
    id: input.id,
    shape: normalizeShape(input.shape),
    layerId,
    ...(properties && Object.keys(properties).length > 0 ? { properties } : {}),
    ...(input.style ? { style: cloneStyle(input.style) } : {}),
  });
}

export function applyAnnotationPatch<P extends AnnotationProperties = AnnotationProperties>(
  current: Annotation<P>,
  patch: AnnotationPatch<P>
): Annotation<P> {
  const properties =
    patch.properties === null
      ? undefined
      : patch.properties === undefined
        ? current.properties
        : mergePatch(current.properties, patch.properties);
  const style =
    patch.style === null
      ? undefined
      : patch.style === undefined
        ? current.style
        : mergePatch(current.style, patch.style);

  return normalizeAnnotation({
    id: current.id,
    shape: patch.shape ?? current.shape,
    layerId: patch.layerId === null ? 'default' : (patch.layerId ?? current.layerId),
    ...(properties ? { properties } : {}),
    ...(style ? { style } : {}),
  });
}

function mergePatch<T extends object>(
  current: T | undefined,
  patch: Partial<T>
): T {
  const result = { ...current } as Record<string, unknown>;
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) delete result[key];
    else result[key] = value;
  });
  return result as T;
}

export function cloneAnnotation<P extends AnnotationProperties = AnnotationProperties>(
  annotation: Annotation<P>
): Annotation<P> {
  return normalizeAnnotation(annotation);
}
