/**
 * Annota - Digital Pathology Annotation Framework
 *
 * A high-performance annotation library for whole slide imaging.
 */

// ============================================
// Core Types
// ============================================

export type { Annotation, Point, AnnotationStyle } from './core/types';
export type { Layer, LayerConfig } from './core/layer';

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
  useInteraction,
  usePushToolCursor,
  useViewer,
  usePopup,
  useAnnotationDoubleClick,
  useLayers,
  useLayer,
  useLayerManager,
} from './react/hooks';
export type { UseLayerManagerResult } from './react/hooks';

export { AnnotationPopup } from './react/Popup';

export { AnnotationEditor, registerShapeEditor, unregisterShapeEditor } from './react/Editor';
export type { AnnotationEditorProps, ShapeEditorConfig } from './react/Editor';

export { PointEditor, RectangleEditor, PolygonEditor } from './react/editors';
export type { PointEditorProps, RectangleEditorProps, PolygonEditorProps } from './react/editors';

// ============================================
// Annotator Instance Type
// ============================================

export type { OpenSeadragonAnnotator as AnnotatorInstance } from './adapters/openseadragon/annotator';

// ============================================
// Tools (High-Level Only)
// ============================================

export { PointTool, RectangleTool, PolygonTool, PushTool, CellDetectTool } from './interactions';

// ============================================
// Loaders
// ============================================

export { loadH5Masks } from './loaders/h5';
export type { H5MaskLoaderOptions } from './loaders/h5';
