/**
 * Annota React - Hooks
 * All React hooks for Annota (annotations, interactions, popup)
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import OpenSeadragon from 'openseadragon';
import { useAnnotator, useAnnotationStore } from './Provider';
import type { Annotation } from '../core/types';
import type { Layer, LayerConfig } from '../core/layer';
import type { ToolHandler } from '../tools/types';
import type { HistoryStateEvent } from '../core/history';

/**
 * Hook to get all annotations
 */
export function useAnnotations(): Annotation[] {
  const store = useAnnotationStore();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!store) return;

    const handleChange = () => {
      setAnnotations(store.all());
    };

    // Initial load
    handleChange();

    store.observe(handleChange);
    return () => store.unobserve(handleChange);
  }, [store]);

  return annotations;
}

/**
 * Hook to get a specific annotation by ID
 */
export function useAnnotation(id: string): Annotation | undefined {
  const store = useAnnotationStore();
  const [annotation, setAnnotation] = useState<Annotation | undefined>(store?.get(id));

  useEffect(() => {
    if (!store) return;

    const handleChange = (event: any) => {
      const updated = event.updated.find((u: any) => u.oldValue.id === id || u.newValue.id === id);

      if (updated) {
        setAnnotation(updated.newValue);
      }

      const deleted = event.deleted.find((a: any) => a.id === id);
      if (deleted) {
        setAnnotation(undefined);
      }
    };

    // Initial load
    setAnnotation(store.get(id));

    store.observe(handleChange);
    return () => store.unobserve(handleChange);
  }, [store, id]);

  return annotation;
}

/**
 * Hook to get currently hovered annotation
 */
export function useHover(): Annotation | undefined {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const [hoveredId, setHoveredId] = useState<string>();

  useEffect(() => {
    if (!annotator) return;

    // Poll hover state (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const currentId = annotator.state.hover.current;
      if (currentId !== hoveredId) {
        setHoveredId(currentId);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [annotator, hoveredId]);

  return hoveredId && store ? store.get(hoveredId) : undefined;
}

/**
 * Hook to get currently selected annotations
 */
export function useSelection(): Annotation[] {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!annotator) return;

    // Poll selection state (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const currentIds = annotator.state.selection.selected;
      // Use functional update to avoid including selectedIds in dependencies
      setSelectedIds(prev => {
        if (JSON.stringify(currentIds) !== JSON.stringify(prev)) {
          return [...currentIds];
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [annotator]); // Remove selectedIds from dependencies

  if (!store) return [];

  return selectedIds.map(id => store.get(id)).filter(Boolean) as Annotation[];
}

/**
 * Options for useTool hook
 */
export interface UseToolOptions {
  /** OpenSeadragon viewer instance */
  viewer: OpenSeadragon.Viewer | undefined;

  /** The tool handler to use (can be null if not yet initialized) */
  handler: ToolHandler | null;

  /** Whether the tool is enabled */
  enabled: boolean;
}

/**
 * Hook for managing an interaction handler's lifecycle
 *
 * Automatically initializes and destroys the handler based on viewer/annotator availability
 * and enabled state.
 *
 * @example
 * ```tsx
 * const moveInteraction = useMemo(() => new MoveInteraction(), []);
 * useTool({
 *   viewer,
 *   handler: moveInteraction,
 *   enabled: tool === 'pan' || tool === 'move'
 * });
 * ```
 */
export function useTool({ viewer, handler, enabled }: UseToolOptions): void {
  const annotator = useAnnotator();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!handler || !viewer || !annotator) {
      if (initializedRef.current && handler) {
        handler.destroy();
        initializedRef.current = false;
      }
      return;
    }

    if (enabled && !initializedRef.current) {
      handler.init(viewer, annotator);
      initializedRef.current = true;
    } else if (!enabled && initializedRef.current) {
      handler.destroy();
      initializedRef.current = false;
    }

    // Update enabled state
    handler.enabled = enabled;

    return () => {
      if (initializedRef.current && handler) {
        handler.destroy();
        initializedRef.current = false;
      }
    };
  }, [viewer, annotator, handler, enabled]);
}

/**
 * Hook for managing the push tool cursor visualization
 *
 * Returns cursor position and radius for rendering the push cursor overlay.
 */
export function usePushToolCursor(
  viewer: OpenSeadragon.Viewer | undefined,
  handler: { getCursorPosition(): { x: number; y: number } | null; getPushRadius(): number } | null,
  enabled: boolean
): { cursorPos: { x: number; y: number } | null; radiusInPixels: number } {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [radiusInPixels, setRadiusInPixels] = useState(0);

  useEffect(() => {
    if (!enabled || !handler || !viewer) {
      setCursorPos(null);
      return;
    }

    // Poll cursor position (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const pos = handler.getCursorPosition();
      setCursorPos(pos);

      if (pos && viewer) {
        // Calculate radius in screen pixels
        const radius = handler.getPushRadius();
        const radiusPixels = viewer.viewport.deltaPixelsFromPointsNoRotate(
          new OpenSeadragon.Point(radius, 0)
        ).x;
        setRadiusInPixels(radiusPixels);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [viewer, handler, enabled]);

  return { cursorPos, radiusInPixels };
}

// ============================================
// Viewer Control Hooks
// ============================================

export interface UseViewerResult {
  /** Zoom in by a factor */
  zoomIn: (factor?: number) => void;

  /** Zoom out by a factor */
  zoomOut: (factor?: number) => void;

  /** Zoom to fit the entire image */
  zoomToFit: () => void;

  /** Reset zoom to 1:1 */
  zoomToActualSize: () => void;

  /** Pan to a specific point */
  panTo: (x: number, y: number) => void;

  /** Get current zoom level */
  getZoom: () => number;

  /** Set zoom level */
  setZoom: (zoom: number) => void;
}

/**
 * Hook for controlling the viewer (zoom, pan, etc.)
 *
 * @example
 * ```tsx
 * const viewer = useViewer(viewerInstance);
 * <button onClick={() => viewer.zoomIn()}>Zoom In</button>
 * <button onClick={() => viewer.zoomOut()}>Zoom Out</button>
 * <button onClick={() => viewer.zoomToFit()}>Fit</button>
 * ```
 */
export function useViewer(viewer: OpenSeadragon.Viewer | undefined): UseViewerResult {
  const zoomIn = useCallback(
    (factor = 1.2) => {
      if (!viewer) return;
      const currentZoom = viewer.viewport.getZoom();
      viewer.viewport.zoomTo(currentZoom * factor);
    },
    [viewer]
  );

  const zoomOut = useCallback(
    (factor = 1.2) => {
      if (!viewer) return;
      const currentZoom = viewer.viewport.getZoom();
      viewer.viewport.zoomTo(currentZoom / factor);
    },
    [viewer]
  );

  const zoomToFit = useCallback(() => {
    if (!viewer) return;
    viewer.viewport.goHome();
  }, [viewer]);

  const zoomToActualSize = useCallback(() => {
    if (!viewer) return;
    viewer.viewport.zoomTo(1.0);
  }, [viewer]);

  const panTo = useCallback(
    (x: number, y: number) => {
      if (!viewer) return;
      viewer.viewport.panTo(new OpenSeadragon.Point(x, y));
    },
    [viewer]
  );

  const getZoom = useCallback(() => {
    if (!viewer) return 1;
    return viewer.viewport.getZoom();
  }, [viewer]);

  const setZoom = useCallback(
    (zoom: number) => {
      if (!viewer) return;
      viewer.viewport.zoomTo(zoom);
    },
    [viewer]
  );

  return {
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActualSize,
    panTo,
    getZoom,
    setZoom,
  };
}

// ============================================
// Popup Hooks
// ============================================

export interface UsePopupResult {
  /** Currently visible annotation */
  annotation: Annotation | null;

  /** Whether popup is visible */
  visible: boolean;

  /** Show popup for annotation */
  show: (annotationId: string) => void;

  /** Hide popup */
  hide: () => void;

  /** Toggle popup for annotation */
  toggle: (annotationId: string) => void;

  /** Update annotation properties */
  updateProperties: (annotationId: string, properties: Record<string, unknown>) => void;

  /** Update annotation style */
  updateStyle: (annotationId: string, style: Partial<Annotation['style']>) => void;

  /** Delete annotation */
  deleteAnnotation: (annotationId: string) => void;
}

/**
 * Hook for managing annotation popup state
 *
 * Automatically shows popup when annotation is selected.
 *
 * @param options Configuration options
 * @returns Popup state and control functions
 *
 * @example
 * ```tsx
 * function MyAnnotationPopup() {
 *   const popup = usePopup();
 *
 *   if (!popup.annotation) return null;
 *
 *   return (
 *     <OSDAnnotationPopup
 *       annotation={popup.annotation}
 *       onClose={popup.hide}
 *     >
 *       <div>
 *         <input
 *           value={popup.annotation.properties?.group || ''}
 *           onChange={(e) => popup.updateProperties(popup.annotation!.id, {
 *             group: e.target.value
 *           })}
 *         />
 *         <button onClick={() => popup.deleteAnnotation(popup.annotation!.id)}>
 *           Delete
 *         </button>
 *       </div>
 *     </OSDAnnotationPopup>
 *   );
 * }
 * ```
 */
export function usePopup(options: { autoShow?: boolean } = {}): UsePopupResult {
  const { autoShow = false } = options;
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const selection = useSelection();

  const [visibleAnnotationId, setVisibleAnnotationId] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState<Annotation | null>(null);

  // Memoize selectedId to prevent re-running effect when selection array reference changes
  // but the actual ID hasn't changed
  const selectedId = useMemo(() => {
    return selection.length === 1 ? (selection[0]?.id ?? null) : null;
  }, [selection.length, selection[0]?.id]);

  // Determine which annotation ID should be visible
  const activeAnnotationId = autoShow ? selectedId : visibleAnnotationId;

  // Subscribe to store changes to keep annotation data fresh
  useEffect(() => {
    if (!store || !activeAnnotationId) {
      setAnnotation(null);
      return;
    }

    const handleStoreChange = (event: any) => {
      // Check if our annotation was updated
      const updated = event.updated.find((u: any) => u.newValue.id === activeAnnotationId);
      if (updated) {
        setAnnotation(updated.newValue);
        return;
      }

      // Check if our annotation was deleted
      const deleted = event.deleted.find((a: any) => a.id === activeAnnotationId);
      if (deleted) {
        setAnnotation(null);
        setVisibleAnnotationId(null);
      }
    };

    // Initial load
    const ann = store.get(activeAnnotationId);
    setAnnotation(ann || null);

    // Subscribe to updates
    store.observe(handleStoreChange);
    return () => store.unobserve(handleStoreChange);
  }, [store, activeAnnotationId]);

  const show = useCallback((annotationId: string) => {
    setVisibleAnnotationId(annotationId);
  }, []);

  const hide = useCallback(() => {
    setVisibleAnnotationId(null);
    // Also clear selection when hiding popup
    if (annotator) {
      annotator.state.selection.selected = [];
    }
  }, [annotator]);

  const toggle = useCallback((annotationId: string) => {
    setVisibleAnnotationId(prev => (prev === annotationId ? null : annotationId));
  }, []);

  const updateProperties = useCallback(
    (annotationId: string, properties: Record<string, unknown>) => {
      if (!annotator) return;

      const ann = annotator.state.store.get(annotationId);
      if (!ann) return;

      annotator.state.store.update(annotationId, {
        ...ann,
        properties: { ...ann.properties, ...properties },
      });
    },
    [annotator]
  );

  const updateStyle = useCallback(
    (annotationId: string, style: Partial<Annotation['style']>) => {
      if (!annotator) return;

      const ann = annotator.state.store.get(annotationId);
      if (!ann) return;

      annotator.state.store.update(annotationId, {
        ...ann,
        style: { ...ann.style, ...style },
      });
    },
    [annotator]
  );

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      if (!annotator) return;
      annotator.state.store.delete(annotationId);
      hide();
    },
    [annotator, hide]
  );

  return {
    annotation,
    visible: annotation !== null,
    show,
    hide,
    toggle,
    updateProperties,
    updateStyle,
    deleteAnnotation,
  };
}

/**
 * Hook to listen for double-click on annotations
 *
 * @param viewer OpenSeadragon viewer instance
 * @param onDoubleClick Callback when annotation is double-clicked
 *
 * @example
 * ```tsx
 * const popup = usePopup({ autoShow: false });
 * useAnnotationDoubleClick(viewer, (annotation) => {
 *   popup.show(annotation.id);
 * });
 * ```
 */
export function useAnnotationDoubleClick(
  viewer: OpenSeadragon.Viewer | undefined,
  onDoubleClick: (annotation: Annotation) => void
): void {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  useEffect(() => {
    if (!viewer || !annotator || !store || !viewer.element) return;

    const handleClick = (event: any) => {
      // Get annotation at click position
      const canvas = viewer.element.querySelector('.openseadragon-canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const imageCoords = viewer.viewport.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(offsetX, offsetY)
      );

      const annotation = store.getAt(imageCoords.x, imageCoords.y);
      if (!annotation) return;

      const now = Date.now();
      const lastClick = lastClickRef.current;

      // Check if this is a double-click (within 300ms and same annotation)
      if (lastClick && lastClick.id === annotation.id && now - lastClick.time < 300) {
        onDoubleClick(annotation);
        lastClickRef.current = null; // Reset after double-click
      } else {
        lastClickRef.current = { id: annotation.id, time: now };
      }
    };

    viewer.element.addEventListener('click', handleClick);

    return () => {
      // Check if viewer.element still exists before removing listener
      if (viewer?.element) {
        viewer.element.removeEventListener('click', handleClick);
      }
    };
  }, [viewer, annotator, store, onDoubleClick]);
}

// ============================================
// Layer Management Hooks
// ============================================

/**
 * Hook to get all layers
 */
export function useLayers(): Layer[] {
  const annotator = useAnnotator();
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    if (!annotator) return;

    const layerManager = annotator.state.layerManager;
    if (!layerManager) return;

    const handleChange = () => {
      setLayers(layerManager.getAllLayers());
    };

    // Initial load
    handleChange();

    layerManager.observe(handleChange);
    return () => layerManager.unobserve(handleChange);
  }, [annotator]);

  return layers;
}

/**
 * Hook to get a specific layer by ID
 */
export function useLayer(id: string): Layer | undefined {
  const annotator = useAnnotator();
  const [layer, setLayer] = useState<Layer | undefined>();

  useEffect(() => {
    if (!annotator) return;

    const layerManager = annotator.state.layerManager;
    if (!layerManager) return;

    const handleChange = () => {
      setLayer(layerManager.getLayer(id));
    };

    // Initial load
    handleChange();

    layerManager.observe(handleChange);
    return () => layerManager.unobserve(handleChange);
  }, [annotator, id]);

  return layer;
}

/**
 * Result of useLayerManager hook
 */
export interface UseLayerManagerResult {
  /** All layers */
  layers: Layer[];

  /** Create a new layer */
  createLayer: (id: string, config: LayerConfig) => Layer | undefined;

  /** Get a specific layer */
  getLayer: (id: string) => Layer | undefined;

  /** Update a layer */
  updateLayer: (id: string, updates: Partial<LayerConfig>) => void;

  /** Delete a layer */
  deleteLayer: (id: string) => void;

  /** Set layer visibility */
  setLayerVisibility: (id: string, visible: boolean) => void;

  /** Set layer locked state */
  setLayerLocked: (id: string, locked: boolean) => void;

  /** Set layer opacity */
  setLayerOpacity: (id: string, opacity: number) => void;

  /** Set layer z-index */
  setLayerZIndex: (id: string, zIndex: number) => void;

  /** Get layers sorted by z-index */
  getLayersByZIndex: () => Layer[];
}

/**
 * Hook for managing layers
 *
 * @example
 * ```tsx
 * function LayerPanel() {
 *   const layerManager = useLayerManager();
 *
 *   return (
 *     <div>
 *       {layerManager.layers.map(layer => (
 *         <div key={layer.id}>
 *           <input
 *             type="checkbox"
 *             checked={layer.visible}
 *             onChange={(e) => layerManager.setLayerVisibility(layer.id, e.target.checked)}
 *           />
 *           <span>{layer.name}</span>
 *           <input
 *             type="range"
 *             min="0"
 *             max="1"
 *             step="0.1"
 *             value={layer.opacity}
 *             onChange={(e) => layerManager.setLayerOpacity(layer.id, parseFloat(e.target.value))}
 *           />
 *         </div>
 *       ))}
 *       <button onClick={() => layerManager.createLayer('my-layer', { name: 'My Layer' })}>
 *         Add Layer
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayerManager(): UseLayerManagerResult {
  const annotator = useAnnotator();
  const layers = useLayers();

  const createLayer = useCallback(
    (id: string, config: LayerConfig) => {
      if (!annotator) return;
      return annotator.createLayer(id, config);
    },
    [annotator]
  );

  const getLayer = useCallback(
    (id: string) => {
      if (!annotator) return;
      return annotator.getLayer(id);
    },
    [annotator]
  );

  const updateLayer = useCallback(
    (id: string, updates: Partial<LayerConfig>) => {
      if (!annotator) return;
      annotator.updateLayer(id, updates);
    },
    [annotator]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      if (!annotator) return;
      annotator.deleteLayer(id);
    },
    [annotator]
  );

  const setLayerVisibility = useCallback(
    (id: string, visible: boolean) => {
      if (!annotator) return;
      annotator.setLayerVisibility(id, visible);
    },
    [annotator]
  );

  const setLayerLocked = useCallback(
    (id: string, locked: boolean) => {
      if (!annotator) return;
      annotator.setLayerLocked(id, locked);
    },
    [annotator]
  );

  const setLayerOpacity = useCallback(
    (id: string, opacity: number) => {
      if (!annotator) return;
      annotator.setLayerOpacity(id, opacity);
    },
    [annotator]
  );

  const setLayerZIndex = useCallback(
    (id: string, zIndex: number) => {
      if (!annotator) return;
      annotator.setLayerZIndex(id, zIndex);
    },
    [annotator]
  );

  const getLayersByZIndex = useCallback(() => {
    if (!annotator) return [];
    return annotator.state.layerManager.getLayersByZIndex();
  }, [annotator]);

  return {
    layers,
    createLayer,
    getLayer,
    updateLayer,
    deleteLayer,
    setLayerVisibility,
    setLayerLocked,
    setLayerOpacity,
    setLayerZIndex,
    getLayersByZIndex,
  };
}

/**
 * Hook to automatically control OpenSeadragon image layer visibility
 *
 * This hook observes the 'image' layer in the layer manager and controls
 * the OpenSeadragon canvas opacity accordingly.
 *
 * @param viewer OpenSeadragon viewer instance
 *
 * @example
 * ```tsx
 * function MyViewer() {
 *   const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();
 *   useImageLayerVisibility(viewer);
 *
 *   return <AnnotaViewer onViewerReady={setViewer} />;
 * }
 * ```
 */
export function useImageLayerVisibility(viewer: OpenSeadragon.Viewer | undefined): void {
  const imageLayer = useLayer('image');

  useEffect(() => {
    if (!viewer || !imageLayer) return;

    // Target the OpenSeadragon canvas element that contains the image
    const osdCanvas = viewer.element?.querySelector('.openseadragon-canvas');
    if (osdCanvas) {
      // Find the canvas element inside (the image canvas, not annotation canvas)
      const imageCanvas = osdCanvas.querySelector('canvas:not(.annota-pixi-canvas)');
      if (imageCanvas instanceof HTMLElement) {
        imageCanvas.style.opacity = imageLayer.visible ? '1' : '0';
      }
    }
  }, [viewer, imageLayer?.visible]);
}

// ============================================
// History Management Hooks
// ============================================

/**
 * Hook to get history state (canUndo, canRedo, etc.)
 *
 * @example
 * ```tsx
 * function HistoryControls() {
 *   const history = useHistory();
 *
 *   return (
 *     <div>
 *       <button onClick={history.undo} disabled={!history.canUndo}>
 *         Undo
 *       </button>
 *       <button onClick={history.redo} disabled={!history.canRedo}>
 *         Redo
 *       </button>
 *       <span>{history.undoSize} undos, {history.redoSize} redos</span>
 *     </div>
 *   );
 * }
 * ```
 */
export interface UseHistoryResult {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of items in undo stack */
  undoSize: number;
  /** Number of items in redo stack */
  redoSize: number;
  /** Perform undo */
  undo: () => void;
  /** Perform redo */
  redo: () => void;
  /** Clear all history */
  clear: () => void;
}

export function useHistory(): UseHistoryResult {
  const annotator = useAnnotator();
  const [historyState, setHistoryState] = useState<HistoryStateEvent>({
    canUndo: false,
    canRedo: false,
    undoSize: 0,
    redoSize: 0,
  });

  useEffect(() => {
    if (!annotator) return;

    const historyManager = annotator.state.history;
    if (!historyManager) return;

    const handleHistoryChange = (event: HistoryStateEvent) => {
      setHistoryState(event);
    };

    // Initial state
    setHistoryState({
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo(),
      undoSize: historyManager.getUndoSize(),
      redoSize: historyManager.getRedoSize(),
    });

    historyManager.observe(handleHistoryChange);
    return () => historyManager.unobserve(handleHistoryChange);
  }, [annotator]);

  const undo = useCallback(() => {
    if (!annotator) return;
    annotator.undo();
  }, [annotator]);

  const redo = useCallback(() => {
    if (!annotator) return;
    annotator.redo();
  }, [annotator]);

  const clear = useCallback(() => {
    if (!annotator) return;
    annotator.clearHistory();
  }, [annotator]);

  return {
    ...historyState,
    undo,
    redo,
    clear,
  };
}

/**
 * Hook that returns whether undo is available
 *
 * @example
 * ```tsx
 * const canUndo = useCanUndo();
 * <button disabled={!canUndo} onClick={() => annotator.undo()}>Undo</button>
 * ```
 */
export function useCanUndo(): boolean {
  const history = useHistory();
  return history.canUndo;
}

/**
 * Hook that returns whether redo is available
 *
 * @example
 * ```tsx
 * const canRedo = useCanRedo();
 * <button disabled={!canRedo} onClick={() => annotator.redo()}>Redo</button>
 * ```
 */
export function useCanRedo(): boolean {
  const history = useHistory();
  return history.canRedo;
}
