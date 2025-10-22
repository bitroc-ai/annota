/**
 * Annota Core
 * Framework-agnostic annotation engine
 */

// Types
export type {
  Annotation,
  AnnotationStyle,
  Bounds,
  CircleShape,
  Filter,
  MultiPolygonShape,
  Point,
  PointShape,
  PolygonShape,
  RectangleShape,
  Shape,
  ShapeType,
  StyleExpression,
} from './types';

export { boundsIntersect, calculateBounds, containsPoint } from './types';

// Store
export type { AnnotationStore, StoreChangeEvent, StoreObserver } from './store';

export { createAnnotationStore } from './store';

// Spatial
export { createSpatialIndex, SpatialIndex } from './spatial';
