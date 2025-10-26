/**
 * Annota - Digital Pathology Annotation Framework
 *
 * A high-performance annotation library for whole slide imaging.
 */

// ============================================
// Core Types
// ============================================

export type { Annotation, Point, AnnotationStyle, MaskPolarity } from './core/types';
export type { Layer, LayerConfig } from './core/layer';
export {
  createPositiveMaskFilter,
  createNegativeMaskFilter,
  createMaskPolarityFilter,
} from './core/layer';

// ============================================
// React Components & Hooks
// ============================================

export { AnnotaProvider, useAnnotator } from './react/Provider';
export type { AnnotaProviderProps } from './react/Provider';

export { Annotator } from './react/Annotator';
export type { AnnotatorProps } from './react/Annotator';

export { Viewer as AnnotaViewer } from './react/Viewer';
export type { ViewerProps as AnnotaViewerProps } from './react/Viewer';

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
} from './react/hooks';
export type { UseLayerManagerResult, UseHistoryResult } from './react/hooks';

export { AnnotationPopup } from './react/Popup';

export { ContextMenu, ContextMenuItem, ContextMenuDivider } from './react/ContextMenu';
export type { ContextMenuProps, ContextMenuItemProps } from './react/ContextMenu';

export { AnnotationEditor, registerShapeEditor, unregisterShapeEditor } from './react/Editor';
export type { AnnotationEditorProps, ShapeEditorConfig } from './react/Editor';

export { PointEditor, RectangleEditor, PolygonEditor } from './react/editors';
export type { PointEditorProps, RectangleEditorProps, PolygonEditorProps } from './react/editors';

// ============================================
// Annotator Instance Type
// ============================================

export type {
  OpenSeadragonAnnotator as AnnotatorInstance,
  AnnotatorEvent,
  AnnotatorEventHandler,
} from './adapters/openseadragon/annotator';

// ============================================
// Keyboard Shortcuts
// ============================================

export { initKeyboardCommands } from './core/shortcuts';
export type { KeyboardCommandsOptions } from './core/shortcuts';

// ============================================
// Tools (High-Level Only)
// ============================================

export { PointTool, RectangleTool, PolygonTool, PushTool, ContourTool } from './tools';

// ============================================
// Loaders
// ============================================

export { loadH5Masks } from './loaders/h5';
export type { H5MaskLoaderOptions } from './loaders/h5';

export { loadH5Coordinates } from './loaders/h5-coordinates';
export type { H5CoordinateLoaderOptions } from './loaders/h5-coordinates';

export { loadPgmFile, loadPgmPolygons, annotationsToPgm, annotationToPgm } from './loaders/pgm';
export type { PgmLoaderOptions } from './loaders/pgm';

export { loadMaskPolygons } from './loaders/masks';
