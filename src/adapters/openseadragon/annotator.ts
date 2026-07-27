/**
 * Annota Adapter - OpenSeadragon Annotator
 * Main annotator factory for OpenSeadragon integration
 */

import OpenSeadragon from 'openseadragon';
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
  type LayerChangeEvent,
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
import type {
  Annotation,
  AnnotationInput,
  AnnotationPatch,
  AnnotationProperties,
  Bounds,
  Filter,
  StyleExpression,
} from '../../core/types';
import { translateShape } from '../../core/types';
import { applyAnnotationPatch, normalizeAnnotation } from '../../core/normalization';
import {
  changeContext,
  createTransactionId,
  createTypedEvents,
  type AnnotatorEventMap,
  type AnnotatorEvents,
  type ChangeContext,
  type ChangeSource,
} from '../../core/events';
import { createGeometryController, type GeometryController } from '../../core/geometry';
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
  annotations?: readonly AnnotationInput[];
  reportError?: (error: unknown) => void;
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
  activeTool: { current: { enabled?: boolean; destroy?(): void } | undefined };
}

/**
 * Event types for annotator
 */
export type AnnotatorEvent =
  | 'createAnnotation'
  | 'updateAnnotation'
  | 'deleteAnnotation'
  | 'selectionChanged'
  | 'notification';

export type AnnotatorEventHandler = (data: any) => void;

export interface MutationOptions {
  source?: ChangeSource;
  transactionId?: string;
  transient?: boolean;
}

export interface AnnotationController {
  add<P extends AnnotationProperties>(
    annotation: AnnotationInput<P>,
    options?: MutationOptions
  ): Annotation<P>;
  addAll<P extends AnnotationProperties>(
    annotations: readonly AnnotationInput<P>[],
    options?: MutationOptions
  ): Annotation<P>[];
  update<P extends AnnotationProperties>(
    id: string,
    patch: AnnotationPatch<P>,
    options?: MutationOptions
  ): Annotation<P>;
  remove(id: string, options?: MutationOptions): void;
  clear(options?: MutationOptions): void;
  replaceAll<P extends AnnotationProperties>(
    annotations: readonly AnnotationInput<P>[],
    options?: MutationOptions
  ): Annotation<P>[];
  get(id: string): Annotation | undefined;
  list(): Annotation[];
}

export interface SelectionController {
  set(ids: string | readonly string[], options?: MutationOptions): void;
  clear(options?: MutationOptions): void;
  get(): string[];
}

export interface LayerController {
  create(id: string, config: LayerConfig, options?: MutationOptions): Layer;
  update(id: string, updates: Partial<LayerConfig>, options?: MutationOptions): void;
  remove(id: string, options?: MutationOptions): void;
  get(id: string): Layer | undefined;
  list(): Layer[];
  setVisibility(id: string, visible: boolean, options?: MutationOptions): void;
  setLocked(id: string, locked: boolean, options?: MutationOptions): void;
  setOpacity(id: string, opacity: number, options?: MutationOptions): void;
  setZIndex(id: string, zIndex: number, options?: MutationOptions): void;
}

export interface SpatialQueryController {
  search(bounds: Bounds, filter?: Filter): Annotation[];
}

export interface HistoryController {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export interface ToolController {
  readonly active: { current: { enabled?: boolean; destroy?(): void } | undefined };
}

/**
 * OpenSeadragon Annotator
 * Integrates annotation system with OpenSeadragon viewer
 */
export interface OpenSeadragonAnnotator {
  viewer: OpenSeadragon.Viewer;
  readonly annotations: AnnotationController;
  readonly selection: SelectionController;
  readonly layers: LayerController;
  readonly spatial: SpatialQueryController;
  readonly geometry: GeometryController;
  readonly history: HistoryController;
  readonly events: AnnotatorEvents<AnnotatorEventMap>;
  readonly tools: ToolController;
  readonly unsafeState: OpenSeadragonAnnotatorState;
  /** @deprecated Since 0.11.0. Use the capability controllers or unsafeState. */
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
  const history = options.historyManager || createHistoryManager({
    enableMerging: false,
    ...options.historyOptions,
  });
  const hover: { current: string | undefined } = { current: undefined };
  const editing: { current: string | undefined; mode: 'vertices' | undefined } = { current: undefined, mode: undefined };
  const toolDrawing: { active: boolean } = { active: false };
  const activeTool: {
    current: { enabled?: boolean; destroy?(): void } | undefined;
  } = { current: undefined };
  let currentFilter: Filter | undefined = options.filter;
  let suppressHoverUntil = 0;
  let interactionEndTimer: number | null = null;
  let destroyed = false;
  let activeChangeContext: ChangeContext | undefined;
  let activeUpdatePreviousOverride: Annotation | undefined;
  const disposers: Array<() => void> = [];
  const events = createTypedEvents<AnnotatorEventMap>(options.reportError);
  const geometry = createGeometryController();

  const withContext = <T>(context: ChangeContext, operation: () => T): T => {
    const previous = activeChangeContext;
    activeChangeContext = context;
    try {
      return operation();
    } finally {
      activeChangeContext = previous;
    }
  };

  const contextFor = (options: MutationOptions = {}, fallback: ChangeSource = 'api') =>
    changeContext(options.source ?? fallback, options);

  const getLiveViewerCanvas = () => {
    const viewerCanvas = viewer.canvas;

    if (!(viewerCanvas instanceof HTMLElement) || !viewerCanvas.isConnected) {
      return undefined;
    }

    return viewerCanvas;
  };

  const markViewportInteraction = () => {
    // During fast pan/zoom the pointer position changes constantly; hover hit-testing is wasted work.
    // Keep this short so hover resumes quickly after interaction ends.
    suppressHoverUntil = Math.max(suppressHoverUntil, performance.now() + 80);

    stage.beginInteraction();
    if (interactionEndTimer !== null) {
      window.clearTimeout(interactionEndTimer);
    }
    interactionEndTimer = window.setTimeout(() => {
      interactionEndTimer = null;
      stage.endInteraction();
    }, 120);
  };

  // Event emitter state
  const eventHandlers: Map<AnnotatorEvent, Set<AnnotatorEventHandler>> = new Map([
    ['createAnnotation', new Set()],
    ['updateAnnotation', new Set()],
    ['deleteAnnotation', new Set()],
    ['selectionChanged', new Set()],
    ['notification', new Set()],
  ]);

  // Check if viewer canvas is ready and still mounted
  const viewerCanvas = getLiveViewerCanvas();
  if (!viewerCanvas) {
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
  const { offsetWidth, offsetHeight } = viewerCanvas;
  canvas.width = offsetWidth;
  canvas.height = offsetHeight;

  // Find the OSD canvas container before async Pixi initialization, but don't
  // attach the overlay until initialization succeeds. React/Svelte dev
  // lifecycles can cancel an annotator while Pixi is still starting.
  const osdCanvas = viewer.element.querySelector('.openseadragon-canvas');
  if (!osdCanvas) {
    throw new Error('OpenSeadragon canvas not found');
  }

  // Create PixiJS stage
  const stage = await createPixiStage(viewer, canvas, {
    style: options.style,
    filter: options.filter,
    visible: options.visible,
    layerManager,
  });

  if (!getLiveViewerCanvas() || !osdCanvas.isConnected) {
    stage.destroy();
    canvas.remove();
    throw new Error('OpenSeadragon viewer was destroyed before annotator initialization completed.');
  }

  osdCanvas.appendChild(canvas);

  if (options.annotations && options.annotations.length > 0) {
    store.addAll(options.annotations, { mode: 'upsert' });
  }

  // Load existing annotations from store
  store.all().forEach(annotation => {
    stage.addAnnotation(annotation);
  });

  // Helper to emit events to registered handlers
  const emitEvent = (event: AnnotatorEvent, data: unknown) => {
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
    const context = activeChangeContext ?? changeContext('api');
    event.created.forEach(annotation => {
      stage.addAnnotation(annotation);
      emitEvent('createAnnotation', annotation);
      events.emit('annotation:create', { annotation, context });
    });
    event.updated.forEach(({ oldValue, newValue }) => {
      stage.updateAnnotation(oldValue, newValue);
      emitEvent('updateAnnotation', newValue);
      events.emit('annotation:update', {
        previous:
          activeUpdatePreviousOverride?.id === newValue.id
            ? activeUpdatePreviousOverride
            : oldValue,
        annotation: newValue,
        context,
      });
    });
    event.deleted.forEach(annotation => {
      stage.removeAnnotation(annotation);
      emitEvent('deleteAnnotation', annotation);
      events.emit('annotation:delete', { annotation, context });

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
    const context = activeChangeContext ?? changeContext('user');
    stage.setSelected(event.current);
    emitEvent('selectionChanged', { selected: event.current });
    events.emit('selection:change', {
      previous: [...event.previous],
      current: [...event.current],
      context,
    });
  };

  selection.observe(onSelectionChange);

  // Sync with viewport changes
  // Use 'animation-start' for immediate sync at the START of pan/zoom
  // This keeps annotations perfectly in sync with image tiles during interaction
  const onViewportUpdateStart = () => {
    markViewportInteraction();
    stage.redraw();
  };

  // Coalesce bursts of viewport events so panning doesn't trigger redundant redraws
  const onViewportUpdate = () => {
    markViewportInteraction();
    // IMPORTANT: keep overlay in lockstep with OSD tile drawing.
    // Scheduling via RAF can introduce a visible 1-frame lag during fast pans.
    stage.redraw();
  };

  const onViewportUpdateFinish = () => {
    // Ensure a final vector redraw after zoom/pan finishes so zoom-dependent
    // annotation rendering (e.g. point size) settles correctly.
    stage.endInteraction();
    stage.redraw();
  };

  viewer.addHandler('animation-start', onViewportUpdateStart);
  viewer.addHandler('animation-finish', onViewportUpdateFinish);
  viewer.addHandler('update-viewport', onViewportUpdate);

  // Handle resize
  const onResize = () => {
    if (destroyed || !canvas.isConnected) return;

    const liveViewerCanvas = getLiveViewerCanvas();
    if (!liveViewerCanvas) return;

    const { offsetWidth, offsetHeight } = liveViewerCanvas;
    canvas.width = offsetWidth;
    canvas.height = offsetHeight;
    stage.resize(offsetWidth, offsetHeight);
  };

  viewer.addHandler('resize', onResize);

  // Observe canvas size changes
  const resizeObserver = new ResizeObserver(() => {
    onResize();
  });

  const observedCanvas = getLiveViewerCanvas();
  if (!observedCanvas) {
    resizeObserver.disconnect();
    stage.destroy();
    canvas.remove();
    throw new Error('OpenSeadragon viewer canvas was removed before annotator initialization completed.');
  }
  resizeObserver.observe(observedCanvas);

  // Helper to create a filter that combines user filter with layer visibility
  const createVisibilityFilter = (): Filter => {
    return (annotation: import('../../core/types').Annotation) => {
      // First check user filter
      if (currentFilter && !currentFilter(annotation)) {
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

  // Hover detection - Throttled
  let pointerMoveRafId: number | null = null;
  const onPointerMove = (event: PointerEvent) => {
    if (destroyed) return;
    if (pointerMoveRafId) return;

    pointerMoveRafId = requestAnimationFrame(() => {
      pointerMoveRafId = null;
      if (destroyed) return;

      if (performance.now() < suppressHoverUntil) return;

      const imagePoint = pointerEventToImage(viewer, event);
      if (!imagePoint) return;

      const hitTolerance = 5 / viewer.viewport.getZoom();
      const visibilityFilter = createVisibilityFilter();
      const hit = store.getAt(imagePoint.x, imagePoint.y, visibilityFilter, hitTolerance);

      const hitId: string | undefined = hit ? hit.id : undefined;
      if (hitId !== hover.current) {
        hover.current = hitId;
        stage.setHovered(hitId);
      }
    });
  };

  canvas.addEventListener('pointermove', onPointerMove);

  // Transient interaction state (exists only during press-drag-release cycle)
  let pressState: {
    viewportPos: { x: number; y: number };
    imagePos: { x: number; y: number };
    annotationId?: string;
    originalAnnotation?: import('../../core/types').Annotation;
    transactionId: string;
  } | undefined;

  const onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent) => {
    // If a tool is currently drawing, let it handle all events exclusively
    if (toolDrawing.active) {
      return;
    }

    // If a drawing tool is active, prevent default and let it handle the event
    // Drawing tools need exclusive access to mouse events to create annotations
    if (activeTool.current && activeTool.current.enabled) {
      (evt as any).preventDefaultAction = true;
      return;
    }

    const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
    if (!imagePoint) return;

    const hitTolerance = 5 / viewer.viewport.getZoom();
    const visibilityFilter = createVisibilityFilter();
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
      originalAnnotation: hit ? normalizeAnnotation(hit) : undefined,
      transactionId: createTransactionId('drag'),
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

  // Throttled drag handler
  let dragRafId: number | null = null;
  const onCanvasDrag = (evt: OpenSeadragon.CanvasDragEvent) => {
    // If a tool already handled this event, skip
    if ((evt as any).preventDefaultAction) {
      return;
    }

    if (!pressState) return;

    // Drag-to-move: if we pressed on an annotation, prevent OSD panning synchronously
    if (
      pressState.annotationId &&
      pressState.originalAnnotation &&
      !layerManager.getLayerForAnnotation(pressState.originalAnnotation)?.locked
    ) {
      (evt as any).preventDefaultAction = true;
    }

    if (dragRafId) return;
    dragRafId = requestAnimationFrame(() => {
      dragRafId = null;
      if (destroyed) return;

      const imagePoint = pointerEventToImage(viewer, evt.originalEvent as PointerEvent);
      if (!imagePoint) return;

      // Drag-to-move: if we pressed on an annotation, move it
      if (
        pressState?.annotationId &&
        pressState?.originalAnnotation &&
        !layerManager.getLayerForAnnotation(pressState.originalAnnotation)?.locked
      ) {
        // Calculate delta from ORIGINAL press position (not mutating pressState!)
        const dx = imagePoint.x - pressState.imagePos.x;
        const dy = imagePoint.y - pressState.imagePos.y;

        // Translate from original annotation shape
        const translatedShape = translateShape(pressState.originalAnnotation.shape, dx, dy);

        // Update annotation in store
        withContext(
          changeContext('user', {
            transactionId: pressState.transactionId,
            transient: true,
          }),
          () =>
            store.update(pressState!.annotationId!, {
              ...pressState!.originalAnnotation!,
              shape: translatedShape,
            })
        );

        return;
      }

      // Drag-to-select: if we pressed on empty space (no annotationId)
      if (pressState) {
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

          const visibilityFilter = createVisibilityFilter();
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
      }
    });
  };

  const onCanvasRelease = (evt: OpenSeadragon.CanvasReleaseEvent) => {
    // If a tool already handled this event, skip
    if ((evt as any).preventDefaultAction) {
      if (pressState?.annotationId && pressState.originalAnnotation) {
        withContext(
          changeContext('user', {
            transactionId: pressState.transactionId,
            transient: true,
          }),
          () => store.update(pressState!.annotationId!, pressState!.originalAnnotation!)
        );
      }
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
    const visibilityFilter = createVisibilityFilter();
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
      if (
        currentAnnotation &&
        !layerManager.getLayerForAnnotation(pressState.originalAnnotation)?.locked
      ) {
        const transactionId = pressState.transactionId;
        const originalAnnotation = pressState.originalAnnotation;
        activeUpdatePreviousOverride = originalAnnotation;
        try {
          withContext(
            changeContext('user', { transactionId, transient: false }),
            () => history.execute(new UpdateCommand(store, originalAnnotation, currentAnnotation))
          );
        } finally {
          activeUpdatePreviousOverride = undefined;
        }
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
  const onLayerChange = (event: LayerChangeEvent) => {
    const context = activeChangeContext ?? changeContext('api');
    event.layers.forEach(layer => {
      if (event.type === 'created') events.emit('layer:create', { layer, context });
      else if (event.type === 'deleted') events.emit('layer:delete', { layer, context });
      else events.emit('layer:update', { layer, context });
    });
  };
  layerManager.observe(onLayerChange);

  const annotationController: AnnotationController = {
    add(input, mutationOptions) {
      const annotation = normalizeAnnotation(input);
      const context = contextFor(mutationOptions);
      withContext(context, () => history.execute(new CreateCommand(store, annotation)));
      return store.get(annotation.id) as typeof annotation;
    },
    addAll(inputs, mutationOptions) {
      const annotations = inputs.map(input => normalizeAnnotation(input));
      const duplicateIds = new Set<string>();
      annotations.forEach(annotation => {
        if (duplicateIds.has(annotation.id)) {
          throw new Error(`Duplicate annotation id ${annotation.id} in the same batch`);
        }
        duplicateIds.add(annotation.id);
      });
      const context = contextFor({
        ...mutationOptions,
        transactionId: mutationOptions?.transactionId ?? createTransactionId('batch'),
      });
      withContext(context, () => {
        history.beginBatch('Add annotations');
        try {
          annotations.forEach(annotation => {
            const previous = store.get(annotation.id);
            history.execute(
              previous
                ? new UpdateCommand(store, previous, annotation)
                : new CreateCommand(store, annotation)
            );
          });
        } finally {
          history.endBatch();
        }
      });
      return annotations.map(annotation => store.get(annotation.id) as typeof annotation);
    },
    update<P extends AnnotationProperties>(
      id: string,
      patch: AnnotationPatch<P>,
      mutationOptions?: MutationOptions
    ) {
      const previous = store.get(id) as Annotation<P> | undefined;
      if (!previous) throw new Error(`Annotation ${id} does not exist`);
      const annotation = applyAnnotationPatch(previous, patch);
      withContext(
        contextFor(mutationOptions),
        () => history.execute(new UpdateCommand(store, previous, annotation))
      );
      return store.get(id) as typeof annotation;
    },
    remove(id, mutationOptions) {
      const annotation = store.get(id);
      if (!annotation) return;
      withContext(
        contextFor(mutationOptions),
        () => history.execute(new DeleteCommand(store, annotation))
      );
    },
    clear(mutationOptions) {
      const annotations = store.all();
      if (annotations.length === 0) return;
      const context = contextFor({
        ...mutationOptions,
        transactionId: mutationOptions?.transactionId ?? createTransactionId('clear'),
      });
      withContext(context, () => {
        history.beginBatch('Clear annotations');
        try {
          annotations.forEach(annotation =>
            history.execute(new DeleteCommand(store, annotation))
          );
        } finally {
          history.endBatch();
        }
      });
    },
    replaceAll(inputs, mutationOptions) {
      const annotations = inputs.map(input => normalizeAnnotation(input));
      const ids = new Set<string>();
      annotations.forEach(annotation => {
        if (ids.has(annotation.id)) throw new Error(`Duplicate annotation id ${annotation.id}`);
        ids.add(annotation.id);
      });
      const previous = store.all();
      const command = {
        execute: () => store.replaceAll(annotations),
        undo: () => store.replaceAll(previous),
        redo: () => store.replaceAll(annotations),
      };
      withContext(
        contextFor({
          ...mutationOptions,
          transactionId: mutationOptions?.transactionId ?? createTransactionId('replace'),
        }),
        () => history.execute(command)
      );
      return store.all() as typeof annotations;
    },
    get(id) {
      return store.get(id);
    },
    list() {
      return store.all();
    },
  };

  const selectionController: SelectionController = {
    set(ids, mutationOptions) {
      withContext(contextFor(mutationOptions), () => selection.select([...new Set(
        typeof ids === 'string' ? [ids] : ids
      )]));
    },
    clear(mutationOptions) {
      withContext(contextFor(mutationOptions), () => selection.clear());
    },
    get() {
      return [...selection.getSelected()];
    },
  };

  const layerController: LayerController = {
    create(id, config, mutationOptions) {
      return withContext(contextFor(mutationOptions), () => layerManager.createLayer(id, config));
    },
    update(id, updates, mutationOptions) {
      withContext(contextFor(mutationOptions), () => layerManager.updateLayer(id, updates));
    },
    remove(id, mutationOptions) {
      withContext(contextFor(mutationOptions), () => layerManager.deleteLayer(id));
    },
    get(id) {
      return layerManager.getLayer(id);
    },
    list() {
      return layerManager.getAllLayers();
    },
    setVisibility(id, visible, mutationOptions) {
      withContext(
        contextFor(mutationOptions),
        () => layerManager.setLayerVisibility(id, visible)
      );
    },
    setLocked(id, locked, mutationOptions) {
      withContext(contextFor(mutationOptions), () => layerManager.setLayerLocked(id, locked));
    },
    setOpacity(id, opacity, mutationOptions) {
      withContext(contextFor(mutationOptions), () => layerManager.setLayerOpacity(id, opacity));
    },
    setZIndex(id, zIndex, mutationOptions) {
      withContext(contextFor(mutationOptions), () => layerManager.setLayerZIndex(id, zIndex));
    },
  };

  const historyController: HistoryController = {
    undo() {
      withContext(changeContext('history'), () => history.undo());
    },
    redo() {
      withContext(changeContext('history'), () => history.redo());
    },
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    clear: () => history.clear(),
  };

  const unsafeState = {
    store,
    layerManager,
    history,
    hover,
    selection,
    editing,
    toolDrawing,
    activeTool,
  };

  return {
    viewer,
    annotations: annotationController,
    selection: selectionController,
    layers: layerController,
    spatial: { search: (bounds, filter) => store.search(bounds, filter) },
    geometry,
    history: historyController,
    events,
    tools: { active: activeTool },
    unsafeState,
    state: unsafeState,

    // Annotation management (convenience methods)
    addAnnotation(annotation) {
      const previous = annotationController.get(annotation.id);
      if (previous) {
        annotationController.update(annotation.id, annotation, { source: 'api' });
      } else {
        annotationController.add(annotation, { source: 'api' });
      }
    },

    addAnnotations(annotations) {
      annotationController.addAll(annotations, { source: 'api' });
    },

    updateAnnotation(id, annotation) {
      annotationController.update(id, annotation, { source: 'api' });
    },

    deleteAnnotation(id) {
      annotationController.remove(id, { source: 'api' });
    },

    removeAnnotation(id) {
      annotationController.remove(id, { source: 'api' });
    },

    clearAnnotations() {
      annotationController.clear({ source: 'api' });
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
      return annotationController.list();
    },

    // Selection management (delegate to selection manager)
    setSelected(id) {
      selectionController.set(id, { source: 'api' });
    },

    getSelected() {
      return selectionController.get();
    },

    // Layer management (delegate to layer manager)
    createLayer(id, config) {
      return layerController.create(id, config);
    },

    getLayer(id) {
      return layerController.get(id);
    },

    getAllLayers() {
      return layerController.list();
    },

    updateLayer(id, updates) {
      layerController.update(id, updates);
    },

    deleteLayer(id) {
      layerController.remove(id);
    },

    setLayerVisibility(id, visible) {
      layerController.setVisibility(id, visible);
    },

    setLayerLocked(id, locked) {
      layerController.setLocked(id, locked);
    },

    setLayerOpacity(id, opacity) {
      layerController.setOpacity(id, opacity);
    },

    setLayerZIndex(id, zIndex) {
      layerController.setZIndex(id, zIndex);
    },

    // Rendering control
    setStyle(style) {
      stage.setStyle(style);
    },

    setFilter(filter) {
      currentFilter = filter;
      stage.setFilter(filter);
    },

    setVisible(visible) {
      stage.setVisible(visible);
    },

    // History management
    undo() {
      historyController.undo();
    },

    redo() {
      historyController.redo();
    },

    canUndo() {
      return historyController.canUndo();
    },

    canRedo() {
      return historyController.canRedo();
    },

    clearHistory() {
      historyController.clear();
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
      if (destroyed) return;
      destroyed = true;

      if (pointerMoveRafId !== null) {
        cancelAnimationFrame(pointerMoveRafId);
        pointerMoveRafId = null;
      }
      if (dragRafId !== null) {
        cancelAnimationFrame(dragRafId);
        dragRafId = null;
      }
      if (interactionEndTimer !== null) {
        window.clearTimeout(interactionEndTimer);
        interactionEndTimer = null;
      }

      store.unobserve(onStoreChange);
      selection.unobserve(onSelectionChange);
      layerManager.unobserve(onLayerChange);
      viewer.removeHandler('update-viewport', onViewportUpdate);
      viewer.removeHandler('animation-start', onViewportUpdateStart);
      viewer.removeHandler('animation-finish', onViewportUpdateFinish);
      viewer.removeHandler('resize', onResize);
      viewer.removeHandler('canvas-press', onCanvasPress);
      viewer.removeHandler('canvas-drag', onCanvasDrag);
      viewer.removeHandler('canvas-release', onCanvasRelease);
      canvas.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      activeTool.current?.destroy?.();
      activeTool.current = undefined;
      for (let index = disposers.length - 1; index >= 0; index--) disposers[index]();
      stage.destroy();
      canvas.remove();
      // Clear all event handlers
      eventHandlers.forEach(handlers => handlers.clear());
      events.clear();
    },
  };
}

export interface CreateAnnotatorOptions extends OpenSeadragonAnnotatorOptions {
  viewer: OpenSeadragon.Viewer;
}

export function createAnnotator(
  options: CreateAnnotatorOptions
): Promise<OpenSeadragonAnnotator> {
  const { viewer, ...annotatorOptions } = options;
  return createOpenSeadragonAnnotator(viewer, annotatorOptions);
}
