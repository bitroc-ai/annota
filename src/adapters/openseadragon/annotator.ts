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
} from '../../core/history';
import type { Filter, StyleExpression } from '../../core/types';
import { createPixiStage } from '../../rendering/pixi/stage';
import { pointerEventToImage } from './coordinates';

/**
 * Annotator options
 */
export interface OpenSeadragonAnnotatorOptions {
  store?: AnnotationStore;
  layerManager?: LayerManager;
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
  history: HistoryManager;
  hover: { current: string | undefined };
  selection: { selected: string[] };
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
  const history = options.historyManager || createHistoryManager(options.historyOptions);
  const hover: { current: string | undefined } = { current: undefined };
  const selection: { selected: string[] } = { selected: [] };

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
      if (selection.selected.includes(annotation.id)) {
        const previousSelection = [...selection.selected];
        selection.selected = selection.selected.filter(id => id !== annotation.id);
        stage.setSelected(selection.selected);
        if (JSON.stringify(previousSelection) !== JSON.stringify(selection.selected)) {
          emitEvent('selectionChanged', { selected: selection.selected });
        }
      }
    });
    stage.redraw();
  };

  store.observe(onStoreChange);

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

  // Hover detection
  const onPointerMove = (event: PointerEvent) => {
    const imagePoint = pointerEventToImage(viewer, event);
    if (!imagePoint) return;

    const hitTolerance = 5 / viewer.viewport.getZoom();
    const hit = store.getAt(imagePoint.x, imagePoint.y, options.filter, hitTolerance);

    const hitId: string | undefined = hit ? hit.id : undefined;
    if (hitId !== hover.current) {
      hover.current = hitId;
      stage.setHovered(hitId);
    }
  };

  canvas.addEventListener('pointermove', onPointerMove);

  // Click detection following Annotorious pattern
  let lastPress: { x: number; y: number } | undefined;

  const onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent) => {
    const { x, y } = evt.position;
    lastPress = { x, y };
  };

  const onCanvasRelease = (evt: OpenSeadragon.CanvasReleaseEvent) => {
    if (!lastPress) return;

    const { x, y } = evt.position;
    const dx = x - lastPress.x;
    const dy = y - lastPress.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only treat as click if pointer didn't move much (< 5px)
    if (dist < 5) {
      const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
      if (!imagePoint) return;

      const hitTolerance = 5 / viewer.viewport.getZoom();
      const hit = store.getAt(imagePoint.x, imagePoint.y, options.filter, hitTolerance);

      if (hit) {
        // Toggle selection
        const previousSelection = [...selection.selected];
        if (selection.selected.includes(hit.id)) {
          selection.selected = selection.selected.filter(id => id !== hit.id);
        } else {
          selection.selected = [hit.id];
        }
        stage.setSelected(selection.selected);
        if (JSON.stringify(previousSelection) !== JSON.stringify(selection.selected)) {
          emitEvent('selectionChanged', { selected: selection.selected });
        }
      } else {
        // Click on empty area - clear selection
        if (selection.selected.length > 0) {
          selection.selected = [];
          stage.setSelected([]);
          emitEvent('selectionChanged', { selected: [] });
        }
      }
    }

    lastPress = undefined;
  };

  viewer.addHandler('canvas-press', onCanvasPress);
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
    state: { store, layerManager, history, hover, selection },

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

    getAnnotations() {
      return store.all();
    },

    // Selection management
    setSelected(id) {
      const ids = Array.isArray(id) ? id : [id];
      const previousSelection = [...selection.selected];
      selection.selected = ids;
      stage.setSelected(ids);
      if (JSON.stringify(previousSelection) !== JSON.stringify(ids)) {
        emitEvent('selectionChanged', { selected: ids });
      }
    },

    getSelected() {
      return selection.selected;
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
