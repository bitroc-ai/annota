/**
 * Annota React
 */

export { AnnotaProvider, useAnnotator, useAnnotationStore } from './provider';
export type { AnnotaProviderProps } from './provider';

export { Annotator } from './annotator';
export type { AnnotatorProps } from './annotator';

export { Viewer } from './viewer';
export type { ViewerProps } from './viewer';

export {
  useAnnotations,
  useAnnotation,
  useHover,
  useSelection,
  useAnnotationDoubleClick,
  useHistory,
  useCanUndo,
  useCanRedo,
  useViewer,
  useTool,
  useLayers,
  useLayer,
  useLayerManager,
  useImageLayerVisibility,
  usePopup,
  usePushToolCursor,
  useContextMenu,
  useContextMenuBinding,
  useEditing,
} from './hooks';
export type {
  UseHistoryResult,
  UseViewerResult,
  UseToolOptions,
  UseLayerManagerResult,
  UsePopupResult,
  UseContextMenuResult,
  ContextMenuState,
  UseEditingResult,
} from './hooks';

export {
  AnnotationEditor,
  registerShapeEditor,
  unregisterShapeEditor,
  getEditorConfig,
} from './editor';
export type { AnnotationEditorProps, ShapeEditorConfig } from './editor';

export { AnnotationPopup } from './popup';
export type { PopupPosition, PopupAnchor, PopupOptions } from './types';

export { PointEditor, RectangleEditor, PolygonEditor, FreehandEditor } from './editors';
export type {
  PointEditorProps,
  RectangleEditorProps,
  PolygonEditorProps,
  FreehandEditorProps,
} from './editors';

export { ContextMenu, ContextMenuItem, ContextMenuDivider } from './context-menu';
export type { ContextMenuProps, ContextMenuItemProps, ContextMenuPosition } from './context-menu';
