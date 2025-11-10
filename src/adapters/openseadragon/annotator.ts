/**
 * Annota Adapter - OpenSeadragon Annotator
 * Main annotator factory for OpenSeadragon integration
 */

import type OpenSeadragon from 'openseadragon';
import {
  createAnnotationStore,
  type AnnotationStore,
  type StoreChangeEvent,
} from '../../core/store';
import {
  createLayerManager,
  type LayerManager,
  type LayerConfig,
  type Layer,
} from '../../core/layer';
import {
  createHistoryManager,
  type HistoryManager,
  type HistoryManagerOptions,
  CreateCommand,
  UpdateCommand,
  DeleteCommand,
  MergeCommand,
  // SplitCommand, // Will be used for split tool
} from '../../core/history';
import {
  createSelectionManager,
  type SelectionManager,
  type SelectionChangeEvent,
} from '../../core/selection';
import {
  mergeAnnotations,
  // splitAnnotation, // Will be used for split tool
  canMergeAnnotations,
  // canSplitAnnotation, // Will be used for split tool
} from '../../core/operations';
import type { Filter, StyleExpression } from '../../core/types';
import { translateShape } from '../../core/types';
import { createPixiStage } from '../../rendering/pixi/stage';
import { pointerEventToImage } from './coordinates';

/**
 * Annotator options
 */
export interface OpenSeadragonAnnotatorOptions {
  store?: AnnotationStore;
  layerManager?: LayerManager;
  selectionManager?: SelectionManager;
  historyManager?: HistoryManager;
  historyOptions?: HistoryManagerOptions;
  style?: StyleExpression;
  filter?: Filter;
  visible?: boolean;
}

/**
 * Annotator state
 */
export interface OpenSeadragonAnnotatorState {
  store: AnnotationStore;
  layerManager: LayerManager;
  selection: SelectionManager;
  history: HistoryManager;
  hover: { current: string | undefined };
  editing: { current: string | undefined; mode: 'vertices' | undefined };
  toolDrawing: { active: boolean }; // Flag for tools to signal they're drawing
}

/**
 * Event types for annotator
 */
export type AnnotatorEvent =
  | 'createAnnotation'
  | 'updateAnnotation'
  | 'deleteAnnotation'
  | 'selectionChanged';

export type AnnotatorEventHandler = (data: any) => void;

/**
 * OpenSeadragon Annotator
 * Integrates annotation system with OpenSeadragon viewer
 */
export interface OpenSeadragonAnnotator {
  viewer: OpenSeadragon.Viewer;
  state: OpenSeadragonAnnotatorState;

  // Annotation management (convenience methods)
  addAnnotation(annotation: import('../../core/types').Annotation): void;
  addAnnotations(annotations: import('../../core/types').Annotation[]): void;
  updateAnnotation(id: string, annotation: import('../../core/types').Annotation): void;
  deleteAnnotation(id: string): void;
  removeAnnotation(id: string): void; // Alias for deleteAnnotation
  clearAnnotations(): void;
  getAnnotations(): import('../../core/types').Annotation[];

  // Geometry operations
  mergeSelected(): import('../../core/types').Annotation | null;

  // Selection management
  setSelected(id: string | string[]): void;
  getSelected(): string[];

  // Layer management
  createLayer(id: string, config: LayerConfig): Layer;
  getLayer(id: string): Layer | undefined;
  getAllLayers(): Layer[];
  updateLayer(id: string, updates: Partial<LayerConfig>): void;
  deleteLayer(id: string): void;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerLocked(id: string, locked: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerZIndex(id: string, zIndex: number): void;

  // Rendering control
  setStyle(style?: StyleExpression): void;
  setFilter(filter?: Filter): void;
  setVisible(visible: boolean): void;

  // History management
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;

  // Event emitter methods
  on(event: AnnotatorEvent, handler: AnnotatorEventHandler): void;
  off(event: AnnotatorEvent, handler: AnnotatorEventHandler): void;
  emit(event: AnnotatorEvent, data: any): void;

  // Lifecycle
  destroy(): void;
}

/**
 * Create OpenSeadragon annotator
 */
export async function createOpenSeadragonAnnotator(
  viewer: OpenSeadragon.Viewer,
  options: OpenSeadragonAnnotatorOptions = {}
): Promise<OpenSeadragonAnnotator> {
  const store = options.store || createAnnotationStore();
  const layerManager = options.layerManager || createLayerManager();
  const selection = options.selectionManager || createSelectionManager();
  const history = options.historyManager || createHistoryManager(options.historyOptions);
  const hover: { current: string | undefined } = { current: undefined };
  const editing: { current: string | undefined; mode: 'vertices' | undefined } = { current: undefined, mode: undefined };
  const toolDrawing: { active: boolean } = { active: false };

  // Event emitter state
  const eventHandlers: Map<AnnotatorEvent, Set<AnnotatorEventHandler>> = new Map([
    ['createAnnotation', new Set()],
    ['updateAnnotation', new Set()],
    ['deleteAnnotation', new Set()],
    ['selectionChanged', new Set()],
  ]);

  // Check if viewer canvas is ready
  if (!viewer.canvas) {
    throw new Error(
      'OpenSeadragon viewer canvas not ready. Wait for "open" event before creating annotator.'
    );
  }

  // Create rendering canvas
  // ANNOTORIOUS PATTERN: Canvas sizing following PixiLayer.svelte and PixiLayer.css
  const canvas = document.createElement('canvas');
  canvas.className = 'annota-pixi-canvas';

  // CSS layout sizing - canvas fills parent container
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'auto'; // Enable clicks for selection

  // Canvas resolution - matches viewer canvas pixel dimensions
  const { offsetWidth, offsetHeight } = viewer.canvas;
  canvas.width = offsetWidth;
  canvas.height = offsetHeight;

  // Append to OSD canvas container
  const osdCanvas = viewer.element.querySelector('.openseadragon-canvas');
  if (!osdCanvas) {
    throw new Error('OpenSeadragon canvas not found');
  }
  osdCanvas.appendChild(canvas);

  // Create PixiJS stage
  const stage = await createPixiStage(viewer, canvas, {
    style: options.style,
    filter: options.filter,
    visible: options.visible,
    layerManager,
  });

  // Load existing annotations from store
  store.all().forEach(annotation => {
    stage.addAnnotation(annotation);
  });

  // Helper to emit events to registered handlers
  const emitEvent = (event: AnnotatorEvent, data: any) => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  };

  // Sync with store changes
  const onStoreChange = (event: StoreChangeEvent) => {
    event.created.forEach(annotation => {
      stage.addAnnotation(annotation);
      emitEvent('createAnnotation', annotation);
    });
    event.updated.forEach(({ oldValue, newValue }) => {
      stage.updateAnnotation(oldValue, newValue);
      emitEvent('updateAnnotation', newValue);
    });
    event.deleted.forEach(annotation => {
      stage.removeAnnotation(annotation);
      emitEvent('deleteAnnotation', annotation);

      // Clean up selection if deleted annotation was selected
      if (selection.isSelected(annotation.id)) {
        selection.remove(annotation.id);
      }
    });
    stage.redraw();
  };

  store.observe(onStoreChange);

  // Sync with selection changes
  const onSelectionChange = (event: SelectionChangeEvent) => {
    stage.setSelected(event.current);
    emitEvent('selectionChanged', { selected: event.current });
  };

  selection.observe(onSelectionChange);

  // Sync with viewport changes
  // Use 'animation-start' for immediate sync at the START of pan/zoom
  // This keeps annotations perfectly in sync with image tiles during interaction
  const onViewportUpdate = () => {
    stage.redraw();
  };

  viewer.addHandler('animation-start', onViewportUpdate);
  viewer.addHandler('animation', onViewportUpdate);
  viewer.addHandler('update-viewport', onViewportUpdate);

  // Handle resize
  const onResize = () => {
    const { offsetWidth, offsetHeight } = viewer.canvas;
    canvas.width = offsetWidth;
    canvas.height = offsetHeight;
    stage.resize(offsetWidth, offsetHeight);
  };

  viewer.addHandler('resize', onResize);

  // Observe canvas size changes
  const resizeObserver = new ResizeObserver(() => {
    onResize();
  });
  resizeObserver.observe(viewer.canvas);

  // Helper to create a filter that combines user filter with layer visibility
  const createVisibilityFilter = (userFilter?: Filter): Filter => {
    return (annotation: import('../../core/types').Annotation) => {
      // First check user filter
      if (userFilter && !userFilter(annotation)) {
        return false;
      }

      // Then check layer visibility
      const layer = layerManager.getLayerForAnnotation(annotation);
      if (layer && !layer.visible) {
        return false;
      }

      return true;
    };
  };

  // Hover detection
  const onPointerMove = (event: PointerEvent) => {
    const imagePoint = pointerEventToImage(viewer, event);
    if (!imagePoint) return;

    const hitTolerance = 5 / viewer.viewport.getZoom();
    const visibilityFilter = createVisibilityFilter(options.filter);
    const hit = store.getAt(imagePoint.x, imagePoint.y, visibilityFilter, hitTolerance);

    const hitId: string | undefined = hit ? hit.id : undefined;
    if (hitId !== hover.current) {
      hover.current = hitId;
      stage.setHovered(hitId);
    }
  };

  canvas.addEventListener('pointermove', onPointerMove);

  // Transient interaction state (exists only during press-drag-release cycle)
  let pressState: {
    viewportPos: { x: number; y: number };
    imagePos: { x: number; y: number };
    annotationId?: string;
    originalAnnotation?: import('../../core/types').Annotation;
  } | undefined;

  const onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent) => {
    // If a tool is currently drawing, let it handle all events exclusively
    if (toolDrawing.active) {
      return;
    }

    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) return;

    const hitTolerance = 5 / viewer.viewport.getZoom();
    const visibilityFilter = createVisibilityFilter(options.filter);
    const hit = store.getAt(imagePoint.x, imagePoint.y, visibilityFilter, hitTolerance);

    // If we hit an in-progress annotation, let the tool handle it exclusively
    if (hit?.properties?._inProgress) {
      return;
    }

    // Save press state for drag/release handling
    pressState = {
      viewportPos: { x: evt.position.x, y: evt.position.y },
      imagePos: imagePoint,
      annotationId: hit?.id,
      originalAnnotation: hit ? { ...hit } : undefined
    };

    if (hit) {

      // Pressed on annotation - handle selection
      const originalEvent = evt.originalEvent as MouseEvent;
      const isMultiSelectKey = originalEvent.ctrlKey || originalEvent.metaKey;

      if (isMultiSelectKey) {
        selection.toggle(hit.id);
      } else {
        const currentSelection = selection.getSelected();
        const isAlreadySoleSelection = currentSelection.length === 1 && currentSelection[0] === hit.id;
        if (!isAlreadySoleSelection) {
          selection.select(hit.id);
        }
      }

      // Prevent panning - we'll drag the annotation instead
      (evt as any).preventDefaultAction = true;
    }
    // If pressed on empty space, pressState.annotationId will be undefined
    // which signals drag-to-select mode
  };

  const onCanvasDrag = (evt: OpenSeadragon.CanvasDragEvent) => {
    // If a tool already handled this event, skip
    if ((evt as any).preventDefaultAction) {
      return;
    }

    if (!pressState) return;

    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) return;

    // Drag-to-move: if we pressed on an annotation, move it
    if (pressState.annotationId && pressState.originalAnnotation) {
      (evt as any).preventDefaultAction = true;

      // Calculate delta from ORIGINAL press position (not mutating pressState!)
      const dx = imagePoint.x - pressState.imagePos.x;
      const dy = imagePoint.y - pressState.imagePos.y;

      // Translate from original annotation shape
      const translatedShape = translateShape(pressState.originalAnnotation.shape, dx, dy);

      // Update annotation in store
      store.update(pressState.annotationId, {
        ...pressState.originalAnnotation,
        shape: translatedShape
      });

      return;
    }

    // Drag-to-select: if we pressed on empty space (no annotationId)
    const dx = evt.position.x - pressState.viewportPos.x;
    const dy = evt.position.y - pressState.viewportPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only start selecting if dragged more than 10px
    if (dist > 10) {
      // Calculate selection rectangle from press start to current position
      const minX = Math.min(pressState.imagePos.x, imagePoint.x);
      const minY = Math.min(pressState.imagePos.y, imagePoint.y);
      const maxX = Math.max(pressState.imagePos.x, imagePoint.x);
      const maxY = Math.max(pressState.imagePos.y, imagePoint.y);

      const visibilityFilter = createVisibilityFilter(options.filter);
      const intersecting = store.getIntersecting({ minX, minY, maxX, maxY }, visibilityFilter);

      const originalEvent = evt.originalEvent as MouseEvent;
      const isMultiSelectKey = originalEvent.ctrlKey || originalEvent.metaKey;

      if (isMultiSelectKey) {
        selection.add(intersecting.map(ann => ann.id));
      } else {
        selection.select(intersecting.map(ann => ann.id));
      }

      viewer.forceRedraw();
    }
  };

  const onCanvasRelease = (evt: OpenSeadragon.CanvasReleaseEvent) => {
    // If a tool already handled this event, skip
    if ((evt as any).preventDefaultAction) {
      // Clean up pressState if it exists
      pressState = undefined;
      return;
    }

    if (!pressState) return;

    // Calculate movement distance
    const dx = evt.position.x - pressState.viewportPos.x;
    const dy = evt.position.y - pressState.viewportPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isClick = dist < 5;

    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) {
      pressState = undefined;
      return;
    }

    const hitTolerance = 5 / viewer.viewport.getZoom();
    const visibilityFilter = createVisibilityFilter(options.filter);
    const hitOnRelease = store.getAt(imagePoint.x, imagePoint.y, visibilityFilter, hitTolerance);
    const originalEvent = evt.originalEvent as MouseEvent;
    const isMultiSelectKey = originalEvent.ctrlKey || originalEvent.metaKey;

    // Handle different release scenarios
    if (pressState.annotationId && hitOnRelease && pressState.annotationId !== hitOnRelease.id) {
      // Released on different annotation - select it
      isMultiSelectKey ? selection.toggle(hitOnRelease.id) : selection.select(hitOnRelease.id);
    } else if (pressState.annotationId && !isClick && pressState.originalAnnotation) {
      // Dragged annotation - add to history for undo/redo
      const currentAnnotation = store.get(pressState.annotationId);
      if (currentAnnotation) {
        history.execute(new UpdateCommand(store, pressState.originalAnnotation, currentAnnotation));
      }
    } else if (!pressState.annotationId && isClick && !hitOnRelease && !isMultiSelectKey) {
      // Clicked empty space - clear selection
      selection.clear();
    }

    // Clean up state
    pressState = undefined;
  };

  viewer.addHandler('canvas-press', onCanvasPress);
  viewer.addHandler('canvas-drag', onCanvasDrag);
  viewer.addHandler('canvas-release', onCanvasRelease);

  // Initial render
  stage.redraw();

  // Sync with layer changes
  const onLayerChange = () => {
    stage.redraw();
  };
  layerManager.observe(onLayerChange);

  return {
    viewer,
    state: { store, layerManager, history, hover, selection, editing, toolDrawing },

    // Annotation management (convenience methods)
    addAnnotation(annotation) {
      const oldAnnotation = store.get(annotation.id);
      if (oldAnnotation) {
        // Update existing annotation with history
        history.execute(new UpdateCommand(store, oldAnnotation, annotation));
      } else {
        // Create new annotation with history
        history.execute(new CreateCommand(store, annotation));
      }
    },

    addAnnotations(annotations) {
      // Batch add annotations
      history.beginBatch('Add annotations');
      annotations.forEach(annotation => {
        const oldAnnotation = store.get(annotation.id);
        if (oldAnnotation) {
          history.execute(new UpdateCommand(store, oldAnnotation, annotation));
        } else {
          history.execute(new CreateCommand(store, annotation));
        }
      });
      history.endBatch();
    },

    updateAnnotation(id, annotation) {
      const oldAnnotation = store.get(id);
      if (oldAnnotation) {
        history.execute(new UpdateCommand(store, oldAnnotation, annotation));
      }
    },

    deleteAnnotation(id) {
      const annotation = store.get(id);
      if (annotation) {
        history.execute(new DeleteCommand(store, annotation));
      }
    },

    removeAnnotation(id) {
      // Alias for deleteAnnotation
      const annotation = store.get(id);
      if (annotation) {
        history.execute(new DeleteCommand(store, annotation));
      }
    },

    clearAnnotations() {
      // Clear all annotations with batch history
      const annotations = store.all();
      if (annotations.length > 0) {
        history.beginBatch('Clear annotations');
        annotations.forEach(annotation => {
          history.execute(new DeleteCommand(store, annotation));
        });
        history.endBatch();
      }
    },

    mergeSelected() {
      // Get selected annotations
      const selectedIds = selection.getSelected();
      if (selectedIds.length < 2) {
        console.warn('[mergeSelected] Need at least 2 annotations to merge');
        return null;
      }

      const annotations = selectedIds
        .map(id => store.get(id))
        .filter((ann): ann is import('../../core/types').Annotation => ann !== undefined);

      if (annotations.length < 2) {
        console.warn('[mergeSelected] Could not find all selected annotations');
        return null;
      }

      // Check if annotations can be merged
      if (!canMergeAnnotations(annotations)) {
        console.error('[mergeSelected] Cannot merge selected annotations (incompatible types)');
        return null;
      }

      // Perform merge operation
      const merged = mergeAnnotations(annotations);
      if (!merged) {
        console.error('[mergeSelected] Failed to merge annotations');
        return null;
      }

      // Execute merge command through history
      history.execute(new MergeCommand(store, annotations, merged));

      // Select the merged annotation
      selection.select(merged.id);

      return merged;
    },

    getAnnotations() {
      return store.all();
    },

    // Selection management (delegate to selection manager)
    setSelected(id) {
      selection.select(id);
    },

    getSelected() {
      return selection.getSelected();
    },

    // Layer management (delegate to layer manager)
    createLayer(id, config) {
      return layerManager.createLayer(id, config);
    },

    getLayer(id) {
      return layerManager.getLayer(id);
    },

    getAllLayers() {
      return layerManager.getAllLayers();
    },

    updateLayer(id, updates) {
      layerManager.updateLayer(id, updates);
    },

    deleteLayer(id) {
      layerManager.deleteLayer(id);
    },

    setLayerVisibility(id, visible) {
      layerManager.setLayerVisibility(id, visible);
      stage.redraw(); // Trigger re-render to show/hide annotations
    },

    setLayerLocked(id, locked) {
      layerManager.setLayerLocked(id, locked);
    },

    setLayerOpacity(id, opacity) {
      layerManager.setLayerOpacity(id, opacity);
      stage.redraw(); // Trigger re-render to update opacity
    },

    setLayerZIndex(id, zIndex) {
      layerManager.setLayerZIndex(id, zIndex);
      stage.redraw(); // Trigger re-render to update z-order
    },

    // Rendering control
    setStyle(style) {
      stage.setStyle(style);
    },

    setFilter(filter) {
      stage.setFilter(filter);
    },

    setVisible(visible) {
      stage.setVisible(visible);
    },

    // History management
    undo() {
      history.undo();
    },

    redo() {
      history.redo();
    },

    canUndo() {
      return history.canUndo();
    },

    canRedo() {
      return history.canRedo();
    },

    clearHistory() {
      history.clear();
    },

    // Event emitter methods
    on(event, handler) {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.add(handler);
      }
    },

    off(event, handler) {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    },

    emit(event, data) {
      emitEvent(event, data);
    },

    destroy() {
      store.unobserve(onStoreChange);
      layerManager.unobserve(onLayerChange);
      viewer.removeHandler('update-viewport', onViewportUpdate);
      viewer.removeHandler('animation', onViewportUpdate);
      viewer.removeHandler('resize', onResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      stage.destroy();
      canvas.remove();
      // Clear all event handlers
      eventHandlers.forEach(handlers => handlers.clear());
    },
  };
}
