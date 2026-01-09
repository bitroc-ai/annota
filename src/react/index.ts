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
} from './hooks';
export type {
  UseHistoryResult,
  UseViewerResult,
  UseToolOptions,
  UseLayerManagerResult,
  UsePopupResult,
  UseContextMenuResult,
  ContextMenuState,
} from './hooks';

export { AnnotationEditor } from './editor';
export type { AnnotationEditorProps } from './editor';

export { ContextMenu, ContextMenuItem, ContextMenuDivider } from './context-menu';
export type { ContextMenuProps, ContextMenuItemProps, ContextMenuPosition } from './context-menu';
