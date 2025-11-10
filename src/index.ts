/**
 * Annota - Digital Pathology Annotation Framework
 *
 * A high-performance annotation library for whole slide imaging.
 */

// ============================================
// Core Types
// ============================================

export type {
  Annotation,
  Point,
  AnnotationStyle,
  Shape,
  ShapeType,
  ImageShape,
  RectangleShape,
  CircleShape,
  EllipseShape,
  PointShape,
  LineShape,
  PolygonShape,
  FreehandShape,
  MultiPolygonShape,
  PathShape,
  ControlPoint,
  Bounds,
} from "./core/types";
export { containsPoint, calculateBounds, translateShape } from "./core/types";
export type { Layer, LayerConfig } from "./core/layer";
export {
  createPositiveMaskFilter,
  createNegativeMaskFilter,
  createMaskPolarityFilter,
  createPropertyFilter,
  getPropertyValues,
  getPropertySummary,
} from "./core/layer";
export type { SelectionManager, SelectionChangeEvent } from "./core/selection";
export { createSelectionManager } from "./core/selection";

// ============================================
// React Components & Hooks
// ============================================

export { AnnotaProvider, useAnnotator } from "./react/Provider";
export type { AnnotaProviderProps } from "./react/Provider";

export { Annotator } from "./react/Annotator";
export type { AnnotatorProps } from "./react/Annotator";

export { Viewer as AnnotaViewer } from "./react/Viewer";
export type { ViewerProps as AnnotaViewerProps } from "./react/Viewer";

export {
  useAnnotations,
  useAnnotation,
  useSelection,
  useTool,
  usePushToolCursor,
  useViewer,
  usePopup,
  useAnnotationDoubleClick,
  useLayers,
  useLayer,
  useLayerManager,
  useImageLayerVisibility,
  useHistory,
  useCanUndo,
  useCanRedo,
  useContextMenu,
  useContextMenuBinding,
  useEditing,
} from "./react/hooks";
export type {
  UseLayerManagerResult,
  UseHistoryResult,
  UseContextMenuResult,
  ContextMenuState,
  UseEditingResult,
} from "./react/hooks";

export { AnnotationPopup } from "./react/Popup";

export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
} from "./react/ContextMenu";
export type {
  ContextMenuProps,
  ContextMenuItemProps,
} from "./react/ContextMenu";

export {
  AnnotationEditor,
  registerShapeEditor,
  unregisterShapeEditor,
  getEditorConfig,
} from "./react/Editor";
export type { AnnotationEditorProps, ShapeEditorConfig } from "./react/Editor";

export {
  PointEditor,
  RectangleEditor,
  PolygonEditor,
  FreehandEditor,
} from "./react/editors";
export type {
  PointEditorProps,
  RectangleEditorProps,
  PolygonEditorProps,
  FreehandEditorProps,
} from "./react/editors";

// ============================================
// Annotator Instance Type
// ============================================

export type {
  OpenSeadragonAnnotator as AnnotatorInstance,
  AnnotatorEvent,
  AnnotatorEventHandler,
} from "./adapters/openseadragon/annotator";

// ============================================
// Keyboard Shortcuts
// ============================================

export { initKeyboardCommands } from "./core/shortcuts";
export type { KeyboardCommandsOptions } from "./core/shortcuts";

// ============================================
// Tools (High-Level Only)
// ============================================

export {
  PointTool,
  RectangleTool,
  PolygonTool,
  CurveTool,
  PushTool,
  ContourTool,
  SplitTool,
} from "./tools";

export type {
  CurveToolOptions,
  PushToolOptions,
  ContourDetectOptions,
  MoveToolOptions,
} from "./tools/types";

// ============================================
// Loaders
// ============================================

export { loadH5Masks } from "./loaders/h5";
export type { H5MaskLoaderOptions } from "./loaders/h5";

export { loadH5Coordinates } from "./loaders/h5-coordinates";
export type { H5CoordinateLoaderOptions } from "./loaders/h5-coordinates";

export {
  loadPgmFile,
  loadPgmPolygons,
  annotationsToPgm,
  annotationToPgm,
} from "./loaders/pgm";
export type { PgmLoaderOptions } from "./loaders/pgm";

export { loadMaskPolygons, exportMasksToPng } from "./loaders/masks";

export { exportJson, downloadJson } from "./loaders/geojson";

// Geometry operations
export {
  mergeAnnotations,
  splitAnnotation,
  canMergeAnnotations,
  canSplitAnnotation,
  toPolygonCoordinates,
} from "./core/operations";
