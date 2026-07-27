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
  AnnotationInput,
  AnnotationPatch,
  AnnotationProperties,
  Point,
  AnnotationStyle,
  Shape,
  ShapeInput,
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
export {
  AnnotaError,
  AnnotationExistsError,
  AnnotationNotFoundError,
  AnnotationValidationError,
} from "./core/errors";
export { applyAnnotationPatch, normalizeAnnotation } from "./core/normalization";
export {
  changeContext,
  createTransactionId,
  createTypedEvents,
} from "./core/events";
export type {
  AnnotatorEventMap,
  AnnotatorEvents,
  AnnotatorNotification,
  ChangeContext,
  ChangeSource,
} from "./core/events";
export { createGeometryController } from "./core/geometry";
export type { GeometryController } from "./core/geometry";
export { createAnnotationStore } from "./core/store";
export type {
  AnnotationStore,
  StoreAddAllOptions,
  StoreChangeEvent,
  StoreObserver,
  StoreWriteMode,
} from "./core/store";
export { createLayerManager } from "./core/layer";
export type { LayerManager } from "./core/layer";
export { createHistoryManager } from "./core/history";
export type { HistoryManager, HistoryManagerOptions } from "./core/history";
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

export { AnnotaProvider, useAnnotator } from "./react/provider";
export type { AnnotaProviderProps } from "./react/provider";

export { Annotator } from "./react/annotator";
export type { AnnotatorProps } from "./react/annotator";

export { Viewer as AnnotaViewer } from "./react/viewer";
export type { ViewerProps as AnnotaViewerProps } from "./react/viewer";

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

export { AnnotationPopup } from "./react/popup";
export type { PopupPosition, PopupAnchor, PopupOptions } from "./react/types";

export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
} from "./react/context-menu";
export type {
  ContextMenuProps,
  ContextMenuItemProps,
} from "./react/context-menu";

export {
  AnnotationEditor,
  registerShapeEditor,
  unregisterShapeEditor,
  getEditorConfig,
} from "./react/editor";
export type { AnnotationEditorProps, ShapeEditorConfig } from "./react/editor";

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

export {
  createAnnotator,
  createOpenSeadragonAnnotator,
  type OpenSeadragonAnnotator,
  type OpenSeadragonAnnotator as AnnotatorInstance,
  type OpenSeadragonAnnotatorOptions,
  type AnnotatorEvent,
  type AnnotatorEventHandler,
  type AnnotationController,
  type SelectionController,
  type LayerController,
  type SpatialQueryController,
  type HistoryController,
  type ToolController,
  type MutationOptions,
  type CreateAnnotatorOptions,
} from "./adapters/openseadragon/annotator";

export { pointerEventToImage } from "./adapters/openseadragon/coordinates";

export type { ToolHandler } from "./tools/types";

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

export { SamTool } from "./tools/sam";
export type {
  SamToolOptions,
  SamPredictFn,
  SamPredictInput,
  SamPredictOutput,
  MaskStats,
  // Backwards compatibility aliases
  SamRemotePredictInput,
  SamRemotePredictOutput,
} from "./tools/sam";

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

export { loadMaskPolygons, exportMasksToPng } from "./loaders/masks";
export type { MaskLoaderOptions } from "./loaders/masks";
export {
  decodeInstancePixels,
  decodeRgb16Pixel,
  loadInstanceMask,
} from "./loaders/instance-mask";
export type {
  DecodedInstance,
  DecodedInstanceRegion,
  DecodedPixelSource,
  ExtractedContour,
  InstanceMaskLoaderOptions,
  RgbaPixel,
} from "./loaders/instance-mask";

export { exportJson, downloadJson } from "./loaders/geojson";

// Geometry operations
export {
  mergeAnnotations,
  splitAnnotation,
  canMergeAnnotations,
  canSplitAnnotation,
  toPolygonCoordinates,
} from "./core/operations";

// ============================================
// ML/AI Utilities
// ============================================

export {
  loadNpyEmbedding,
  loadNpyEmbeddingCached,
  embeddingCache,
} from "./ml/embedding-utils";
export type { SamEmbedding } from "./ml/embedding-utils";

// ============================================
// Extensions (OpenCV)
// ============================================

export { initOpenCV, isOpenCVReady } from "./extensions/opencv";
