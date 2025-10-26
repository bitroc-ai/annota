/**
 * Annota React Hooks
 * All React hooks for Annota (annotations, interactions, popup, layers, history, context menu)
 */

// Annotation hooks
export { useAnnotations } from './useAnnotations';
export { useAnnotation } from './useAnnotation';
export { useHover } from './useHover';
export { useSelection } from './useSelection';

// Tool hooks
export { useTool, type UseToolOptions } from './useTool';
export { usePushToolCursor } from './usePushToolCursor';

// Viewer control hooks
export { useViewer, type UseViewerResult } from './useViewer';

// Popup hooks
export { usePopup, type UsePopupResult } from './usePopup';
export { useAnnotationDoubleClick } from './useAnnotationDoubleClick';

// Layer management hooks
export { useLayers } from './useLayers';
export { useLayer } from './useLayer';
export { useLayerManager, type UseLayerManagerResult } from './useLayerManager';
export { useImageLayerVisibility } from './useImageLayerVisibility';

// History management hooks
export { useHistory, type UseHistoryResult } from './useHistory';
export { useCanUndo } from './useCanUndo';
export { useCanRedo } from './useCanRedo';

// Context menu hooks
export { useContextMenu, type ContextMenuState, type UseContextMenuResult } from './useContextMenu';
export { useContextMenuBinding } from './useContextMenuBinding';

// Editing hooks
export { useEditing, type UseEditingResult } from './useEditing';
