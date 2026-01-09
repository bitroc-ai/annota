/**
 * Annota React Hooks
 * All React hooks for Annota (annotations, interactions, popup, layers, history, context menu)
 */

// Annotation hooks
export { useAnnotations } from './use-annotations';
export { useAnnotation } from './use-annotation';
export { useHover } from './use-hover';
export { useSelection } from './use-selection';

// Tool hooks
export { useTool, type UseToolOptions } from './use-tool';
export { usePushToolCursor } from './use-push-tool-cursor';

// Viewer control hooks
export { useViewer, type UseViewerResult } from './use-viewer';

// Popup hooks
export { usePopup, type UsePopupResult } from './use-popup';
export { useAnnotationDoubleClick } from './use-annotation-double-click';

// Layer management hooks
export { useLayers } from './use-layers';
export { useLayer } from './use-layer';
export { useLayerManager, type UseLayerManagerResult } from './use-layer-manager';
export { useImageLayerVisibility } from './use-image-layer-visibility';

// History management hooks
export { useHistory, type UseHistoryResult } from './use-history';
export { useCanUndo } from './use-can-undo';
export { useCanRedo } from './use-can-redo';

// Context menu hooks
export { useContextMenu, type ContextMenuState, type UseContextMenuResult } from './use-context-menu';
export { useContextMenuBinding } from './use-context-menu-binding';

// Editing hooks
export { useEditing, type UseEditingResult } from './use-editing';
