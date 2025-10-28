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
  mergeAnnotations,
  // splitAnnotation, // Will be used for split tool
  canMergeAnnotations,
  // canSplitAnnotation, // Will be used for split tool
} from '../../core/operations';
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
  editing: { current: string | undefined; mode: 'vertices' | undefined };
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
  const history = options.historyManager || createHistoryManager(options.historyOptions);
  const hover: { current: string | undefined } = { current: undefined };
  const selection: { selected: string[] } = { selected: [] };
  const editing: { current: string | undefined; mode: 'vertices' | undefined } = { current: undefined, mode: undefined };

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

  // Click and drag-to-select detection
  let lastPress: { x: number; y: number; imagePoint: { x: number; y: number } } | undefined;
  let selectionBox: {
    start: { x: number; y: number };
    current: { x: number; y: number };
    isActive: boolean;
  } | undefined;

  const onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent) => {
    const { x, y } = evt.position;
    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) return;

    lastPress = { x, y, imagePoint };

    // Check if click is on empty space (no annotation hit)
    const hitTolerance = 5 / viewer.viewport.getZoom();
    const hit = store.getAt(imagePoint.x, imagePoint.y, options.filter, hitTolerance);

    // Only start selection box if clicking on empty space
    if (!hit) {
      selectionBox = {
        start: { ...imagePoint },
        current: { ...imagePoint },
        isActive: false, // Will become active on drag
      };
    }
  };

  const onCanvasDrag = (evt: OpenSeadragon.CanvasDragEvent) => {
    if (!selectionBox || !lastPress) return;

    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) return;

    // Calculate distance from press point
    const dx = evt.position.x - lastPress.x;
    const dy = evt.position.y - lastPress.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Activate selection box if dragged more than 10px
    if (dist > 10) {
      selectionBox.isActive = true;
      selectionBox.current = { ...imagePoint };

      // Find all annotations within selection rectangle
      const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
      const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
      const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);

      // Use spatial index to find intersecting annotations
      const intersecting = store.getIntersecting(
        { minX, minY, maxX, maxY },
        options.filter
      );

      // Check modifier keys for additive selection
      const originalEvent = evt.originalEvent as MouseEvent;
      const isMultiSelectKey = originalEvent.ctrlKey || originalEvent.metaKey;

      if (isMultiSelectKey) {
        // Add to existing selection
        const newIds = intersecting.map(ann => ann.id);
        const combined = new Set([...selection.selected, ...newIds]);
        selection.selected = Array.from(combined);
      } else {
        // Replace selection
        selection.selected = intersecting.map(ann => ann.id);
      }

      stage.setSelected(selection.selected);

      // Trigger repaint to show selection box (if we add visual feedback)
      viewer.forceRedraw();
    }
  };

  const onCanvasRelease = (evt: OpenSeadragon.CanvasReleaseEvent) => {
    if (!lastPress) return;

    const { x, y } = evt.position;
    const dx = x - lastPress.x;
    const dy = y - lastPress.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if this was a drag-to-select operation
    if (selectionBox && selectionBox.isActive) {
      // Emit selection changed event
      emitEvent('selectionChanged', { selected: selection.selected });

      // Clean up selection box
      selectionBox = undefined;
      lastPress = undefined;
      return;
    }

    // Only treat as click if pointer didn't move much (< 5px)
    if (dist < 5) {
      const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
      if (!imagePoint) return;

      const hitTolerance = 5 / viewer.viewport.getZoom();
      const hit = store.getAt(imagePoint.x, imagePoint.y, options.filter, hitTolerance);

      // Check for modifier keys
      const originalEvent = evt.originalEvent as MouseEvent;
      const isMultiSelectKey = originalEvent.ctrlKey || originalEvent.metaKey;

      if (hit) {
        const previousSelection = [...selection.selected];

        if (isMultiSelectKey) {
          // Ctrl/Cmd+Click: Toggle annotation in selection (add/remove)
          if (selection.selected.includes(hit.id)) {
            // Remove from selection
            selection.selected = selection.selected.filter(id => id !== hit.id);
          } else {
            // Add to selection
            selection.selected = [...selection.selected, hit.id];
          }
        } else {
          // Regular click: Replace selection
          if (selection.selected.includes(hit.id) && selection.selected.length === 1) {
            // Already selected and only selection - keep it
            selection.selected = [hit.id];
          } else {
            // Replace with this annotation
            selection.selected = [hit.id];
          }
        }

        stage.setSelected(selection.selected);
        if (JSON.stringify(previousSelection) !== JSON.stringify(selection.selected)) {
          emitEvent('selectionChanged', { selected: selection.selected });
        }
      } else {
        // Click on empty area
        if (!isMultiSelectKey) {
          // Clear selection only if not holding Ctrl/Cmd
          if (selection.selected.length > 0) {
            selection.selected = [];
            stage.setSelected([]);
            emitEvent('selectionChanged', { selected: [] });
          }
        }
      }
    }

    // Clean up
    selectionBox = undefined;
    lastPress = undefined;
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
    state: { store, layerManager, history, hover, selection, editing },

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
      const selectedIds = selection.selected;
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
      selection.selected = [merged.id];
      stage.setSelected([merged.id]);
      emitEvent('selectionChanged', { selected: [merged.id] });

      return merged;
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
