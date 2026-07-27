/**
 * Compatibility entry for applications that previously imported React bindings
 * and framework-neutral APIs from the package root.
 *
 * @deprecated Since 1.0.0. Import framework-neutral APIs from `annota` and React
 * bindings from `annota/react`. Planned removal: 2.0.0.
 */
export * from './index';

import * as ReactEntry from './react-entry';

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const AnnotaProvider = ReactEntry.AnnotaProvider;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type AnnotaProviderProps = ReactEntry.AnnotaProviderProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useAnnotator = ReactEntry.useAnnotator;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const Annotator = ReactEntry.Annotator;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type AnnotatorProps = ReactEntry.AnnotatorProps;

/** @deprecated Since 1.0.0. Import `Viewer` from `annota/react`. Planned removal: 2.0.0. */
export const AnnotaViewer = ReactEntry.Viewer;
/** @deprecated Since 1.0.0. Import `ViewerProps` from `annota/react`. Planned removal: 2.0.0. */
export type AnnotaViewerProps = ReactEntry.ViewerProps;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useAnnotations = ReactEntry.useAnnotations;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useAnnotation = ReactEntry.useAnnotation;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useSelection = ReactEntry.useSelection;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useTool = ReactEntry.useTool;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const usePushToolCursor = ReactEntry.usePushToolCursor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useViewer = ReactEntry.useViewer;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const usePopup = ReactEntry.usePopup;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useAnnotationDoubleClick = ReactEntry.useAnnotationDoubleClick;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useLayers = ReactEntry.useLayers;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useLayer = ReactEntry.useLayer;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useLayerManager = ReactEntry.useLayerManager;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useImageLayerVisibility = ReactEntry.useImageLayerVisibility;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useHistory = ReactEntry.useHistory;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useCanUndo = ReactEntry.useCanUndo;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useCanRedo = ReactEntry.useCanRedo;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useContextMenu = ReactEntry.useContextMenu;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useContextMenuBinding = ReactEntry.useContextMenuBinding;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const useEditing = ReactEntry.useEditing;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type UseLayerManagerResult = ReactEntry.UseLayerManagerResult;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type UseHistoryResult = ReactEntry.UseHistoryResult;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type UseContextMenuResult = ReactEntry.UseContextMenuResult;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type ContextMenuState = ReactEntry.ContextMenuState;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type UseEditingResult = ReactEntry.UseEditingResult;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const AnnotationPopup = ReactEntry.AnnotationPopup;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type PopupPosition = ReactEntry.PopupPosition;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type PopupAnchor = ReactEntry.PopupAnchor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type PopupOptions = ReactEntry.PopupOptions;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const ContextMenu = ReactEntry.ContextMenu;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const ContextMenuItem = ReactEntry.ContextMenuItem;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const ContextMenuDivider = ReactEntry.ContextMenuDivider;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type ContextMenuProps = ReactEntry.ContextMenuProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type ContextMenuItemProps = ReactEntry.ContextMenuItemProps;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const AnnotationEditor = ReactEntry.AnnotationEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const registerShapeEditor = ReactEntry.registerShapeEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const unregisterShapeEditor = ReactEntry.unregisterShapeEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const getEditorConfig = ReactEntry.getEditorConfig;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type AnnotationEditorProps = ReactEntry.AnnotationEditorProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type ShapeEditorConfig = ReactEntry.ShapeEditorConfig;

/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const PointEditor = ReactEntry.PointEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const RectangleEditor = ReactEntry.RectangleEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const PolygonEditor = ReactEntry.PolygonEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export const FreehandEditor = ReactEntry.FreehandEditor;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type PointEditorProps = ReactEntry.PointEditorProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type RectangleEditorProps = ReactEntry.RectangleEditorProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type PolygonEditorProps = ReactEntry.PolygonEditorProps;
/** @deprecated Since 1.0.0. Import from `annota/react`. Planned removal: 2.0.0. */
export type FreehandEditorProps = ReactEntry.FreehandEditorProps;
