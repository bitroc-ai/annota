/**
 * Annota Core
 * Framework-agnostic annotation engine
 */

// Types
export type {
  Annotation,
  AnnotationInput,
  AnnotationPatch,
  AnnotationProperties,
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
  ShapeInput,
  ShapeType,
  StyleExpression,
} from './types';

export { boundsIntersect, calculateBounds, containsPoint } from './types';

// Store
export type { AnnotationStore, StoreChangeEvent, StoreObserver } from './store';

export { createAnnotationStore } from './store';
export type { StoreAddAllOptions, StoreWriteMode } from './store';

export {
  AnnotaError,
  AnnotationExistsError,
  AnnotationNotFoundError,
  AnnotationValidationError,
} from './errors';

export { applyAnnotationPatch, cloneAnnotation, normalizeAnnotation } from './normalization';

export type {
  AnnotatorEventMap,
  AnnotatorEvents,
  AnnotatorNotification,
  ChangeContext,
  ChangeSource,
} from './events';
export { changeContext, createTransactionId, createTypedEvents } from './events';

export type { GeometryController } from './geometry';
export { createGeometryController, normalizeShapeInput } from './geometry';

export type { PopupAnchor, PopupOptions, PopupPosition } from './popup';

// Spatial
export { createSpatialIndex, SpatialIndex } from './spatial';

// History
export type {
  Command,
  HistoryManager,
  HistoryManagerOptions,
  HistoryObserver,
  HistoryStateEvent,
} from './history';

export {
  BatchCommand,
  CreateCommand,
  DeleteCommand,
  UpdateCommand,
  createHistoryManager,
} from './history';

// Selection
export type {
  SelectionManager,
  SelectionChangeEvent,
  SelectionObserver,
} from './selection';

export { createSelectionManager } from './selection';

export type {
  Layer,
  LayerChangeEvent,
  LayerConfig,
  LayerManager,
  LayerObserver,
} from './layer';
export {
  createLayerManager,
  createMaskPolarityFilter,
  createNegativeMaskFilter,
  createPositiveMaskFilter,
  createPropertyFilter,
  getEffectiveOpacity,
  getPropertySummary,
  getPropertyValues,
  isAnnotationEditable,
  isAnnotationVisible,
} from './layer';
