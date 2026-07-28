import { beforeEach, describe, expect, it, vi } from 'vitest';

const stage = {
  addAnnotation: vi.fn(),
  updateAnnotation: vi.fn(),
  removeAnnotation: vi.fn(),
  redraw: vi.fn(),
  beginInteraction: vi.fn(),
  endInteraction: vi.fn(),
  resize: vi.fn(),
  setSelected: vi.fn(),
  setHovered: vi.fn(),
  setStyle: vi.fn(),
  setFilter: vi.fn(),
  setVisible: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../../src/rendering/pixi/stage', () => ({
  createPixiStage: vi.fn(async () => stage),
}));

import { createOpenSeadragonAnnotator } from '../../src/adapters/openseadragon/annotator';
import { createSelectionManager } from '../../src/core/selection';
import { PolygonTool } from '../../src/tools/polygon';
import { SplitTool } from '../../src/tools/split';
import {
  MemoryAnnotationStore,
  MemoryHistoryManager,
  MemoryLayerManager,
  MemorySelectionManager,
} from '../helpers/custom-managers';
import OpenSeadragon from 'openseadragon';

class ResizeObserverFake {
  observe = vi.fn();
  disconnect = vi.fn();
}

function createViewer() {
  const root = document.createElement('div');
  const canvas = document.createElement('div');
  canvas.className = 'openseadragon-canvas';
  Object.defineProperties(canvas, {
    offsetWidth: { value: 800 },
    offsetHeight: { value: 600 },
  });
  root.appendChild(canvas);
  document.body.appendChild(root);
  const handlers = new Map<string, Set<(event: never) => void>>();
  return {
    root,
    handlers,
    viewer: {
      canvas,
      element: root,
      viewport: {
        getZoom: () => 1,
        pointFromPixel: (point: { x: number; y: number }) => point,
        viewerElementToImageCoordinates: (point: { x: number; y: number }) => point,
      },
      world: {
        getItemAt: () => ({
          viewportToImageCoordinates: (point: { x: number; y: number }) => point,
        }),
      },
      addHandler: vi.fn((name: string, handler: (event: never) => void) => {
        const set = handlers.get(name) ?? new Set();
        set.add(handler);
        handlers.set(name, set);
      }),
      removeHandler: vi.fn((name: string, handler: (event: never) => void) => {
        handlers.get(name)?.delete(handler);
      }),
      forceRedraw: vi.fn(),
    },
  };
}

describe('OpenSeadragon annotator lifecycle', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    stage.destroy.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverFake);
  });

  it('pairs observers, handlers, RAF and idempotent destruction', async () => {
    const { viewer, handlers } = createViewer();
    const selection = createSelectionManager();
    const observe = vi.spyOn(selection, 'observe');
    const unobserve = vi.spyOn(selection, 'unobserve');
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 17));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    const annotator = await createOpenSeadragonAnnotator(viewer as never, {
      selectionManager: selection,
    });
    const overlay = document.querySelector('.annota-pixi-canvas') as HTMLCanvasElement;
    overlay.dispatchEvent(new PointerEvent('pointermove'));
    annotator.destroy();
    annotator.destroy();

    expect(observe).toHaveBeenCalledTimes(1);
    expect(unobserve).toHaveBeenCalledWith(observe.mock.calls[0][0]);
    for (const name of [
      'animation-start',
      'animation-finish',
      'update-viewport',
      'resize',
      'canvas-press',
      'canvas-drag',
      'canvas-release',
    ]) {
      expect(handlers.get(name)?.size ?? 0).toBe(0);
    }
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
    expect(stage.destroy).toHaveBeenCalledTimes(1);
    expect(overlay.isConnected).toBe(false);
  });

  it('connects façade, normalization, history, events, store and rendering once', async () => {
    const { viewer } = createViewer();
    const annotator = await createOpenSeadragonAnnotator(viewer as never);
    const updates: unknown[] = [];
    annotator.events.on('annotation:update', event => updates.push(event));
    annotator.annotations.add({
      id: 'a',
      layerId: 'default',
      shape: { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
    });
    annotator.annotations.update('a', {
      shape: {
        type: 'rectangle',
        x: 5,
        y: 5,
        width: 10,
        height: 10,
        bounds: { minX: -100, minY: -100, maxX: 100, maxY: 100 },
      },
    });

    expect(annotator.spatial.search({ minX: 5, minY: 5, maxX: 6, maxY: 6 }))
      .toHaveLength(1);
    expect(annotator.annotations.get('a')?.shape.bounds).toEqual({
      minX: 5,
      minY: 5,
      maxX: 15,
      maxY: 15,
    });
    expect(updates).toHaveLength(1);
    expect(stage.updateAnnotation).toHaveBeenCalledTimes(1);
    annotator.history.undo();
    expect(annotator.annotations.get('a')?.shape.bounds.minX).toBe(0);
    annotator.destroy();
  });

  it('exposes state as a distinct frozen read-only compatibility view', async () => {
    const { viewer } = createViewer();
    const annotator = await createOpenSeadragonAnnotator(viewer as never);

    expect(annotator.state).not.toBe(annotator.unsafeState);
    expect(Object.isFrozen(annotator.state)).toBe(true);
    expect(Object.isFrozen(annotator.state.store)).toBe(true);
    expect('add' in annotator.state.store).toBe(false);
    expect('select' in annotator.state.selection).toBe(false);
    expect('execute' in annotator.state.history).toBe(false);
    expect(Reflect.set(annotator.state.toolDrawing, 'active', true)).toBe(false);
    expect(annotator.unsafeState.toolDrawing.active).toBe(false);

    if (false) {
      // @ts-expect-error The compatibility store cannot be mutated.
      annotator.state.store.add({ id: 'forbidden', shape: { type: 'point', x: 0, y: 0 } });
      // @ts-expect-error The compatibility selection manager cannot be mutated.
      annotator.state.selection.select('forbidden');
      // @ts-expect-error Compatibility interaction snapshots are readonly.
      annotator.state.toolDrawing.active = true;
    }

    annotator.destroy();
  });

  it('runs the shared annotator contract with independently implemented managers', async () => {
    const { viewer } = createViewer();
    const store = new MemoryAnnotationStore();
    const layerManager = new MemoryLayerManager();
    const selectionManager = new MemorySelectionManager();
    const historyManager = new MemoryHistoryManager();
    const annotator = await createOpenSeadragonAnnotator(viewer as never, {
      store,
      layerManager,
      selectionManager,
      historyManager,
    });
    const events: string[] = [];
    annotator.events.on('annotation:create', event => events.push(`create:${event.context.source}`));
    annotator.events.on('selection:change', event => events.push(`select:${event.context.source}`));

    expect(annotator.unsafeState.store).toBe(store);
    expect(annotator.unsafeState.layerManager).toBe(layerManager);
    expect(annotator.unsafeState.selection).toBe(selectionManager);
    expect(annotator.unsafeState.history).toBe(historyManager);
    annotator.layers.create('custom', { zIndex: 4 });
    annotator.annotations.add({
      id: 'custom-managed',
      layerId: 'custom',
      shape: { type: 'point', point: { x: 3, y: 4 } },
    });
    annotator.selection.set('custom-managed');

    expect(store.get('custom-managed')?.shape.bounds).toEqual({
      minX: 3, minY: 4, maxX: 3, maxY: 4,
    });
    expect(layerManager.getLayerForAnnotation(store.get('custom-managed')!)?.id).toBe('custom');
    expect(selectionManager.getSelected()).toEqual(['custom-managed']);
    expect(events).toEqual(['create:api', 'select:api']);
    expect(historyManager.getUndoSize()).toBe(1);
    annotator.history.undo();
    expect(store.get('custom-managed')).toBeUndefined();
    annotator.destroy();
  });

  it('runs PolygonTool previews through one real façade transaction and one undo step', async () => {
    const { viewer } = createViewer();
    const annotator = await createOpenSeadragonAnnotator(viewer as never);
    const events: Array<{ context: { transient: boolean } }> = [];
    annotator.events.on('annotation:create', event => events.push(event));
    annotator.events.on('annotation:update', event => events.push(event));
    const tool = new PolygonTool();
    tool.init(viewer as never, annotator);
    const clock = vi.spyOn(Date, 'now');
    clock
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(400)
      .mockReturnValueOnce(800)
      .mockReturnValueOnce(900);
    const click = (x: number, y: number) =>
      tool.onCanvasClick({
        originalEvent: { offsetX: x, offsetY: y },
        preventDefaultAction: false,
      } as never);

    click(10, 10);
    expect(annotator.annotations.list()[0]?.shape.type).toBe('freehand');
    click(30, 10);
    click(20, 30);
    click(20, 30);

    expect(annotator.annotations.list()).toHaveLength(1);
    expect(annotator.annotations.list()[0].shape.type).toBe('polygon');
    expect(events.filter(event => !event.context.transient)).toHaveLength(1);
    expect(events.filter(event => event.context.transient).length).toBeGreaterThan(1);
    expect(annotator.history.canUndo()).toBe(true);
    annotator.history.undo();
    expect(annotator.annotations.list()).toEqual([]);
    clock.mockRestore();
    tool.destroy();
    annotator.destroy();
  });

  it('runs SplitTool preview, commit and cancel through façade transactions', async () => {
    const { viewer } = createViewer();
    const annotator = await createOpenSeadragonAnnotator(viewer as never);
    annotator.annotations.add({
      id: 'source',
      layerId: 'default',
      shape: {
        type: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
      },
    });
    annotator.history.clear();
    const changes: Array<{
      kind: string;
      id: string;
      transient: boolean;
      transactionId?: string;
    }> = [];
    for (const kind of ['create', 'update', 'delete'] as const) {
      annotator.events.on(`annotation:${kind}`, event => {
        changes.push({
          kind,
          id: event.annotation.id,
          transient: event.context.transient,
          transactionId: event.context.transactionId,
        });
      });
    }
    const tool = new SplitTool();
    tool.init(viewer as never, annotator);
    const click = (x: number, y: number) =>
      tool.onCanvasClick({
        originalEvent: { offsetX: x, offsetY: y },
        preventDefaultAction: false,
      } as never);

    click(-5, 5);
    click(15, 5);
    tool.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

    const pieces = annotator.annotations.list();
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.some(annotation => annotation.id === 'source')).toBe(false);
    expect(pieces.every(annotation => annotation.layerId === 'default')).toBe(true);
    const finalChanges = changes.filter(change => !change.transient);
    expect(finalChanges.some(change => change.kind === 'delete' && change.id === 'source')).toBe(true);
    expect(new Set(finalChanges.map(change => change.transactionId))).toHaveLength(1);
    expect(changes.some(change => change.transient && change.id.startsWith('split-preview-')))
      .toBe(true);
    expect(annotator.unsafeState.history.getUndoSize()).toBe(1);
    annotator.history.undo();
    expect(annotator.annotations.list().map(annotation => annotation.id)).toEqual(['source']);

    annotator.history.clear();
    changes.length = 0;
    click(-5, 5);
    click(15, 5);
    tool.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(annotator.annotations.list().map(annotation => annotation.id)).toEqual(['source']);
    expect(changes.every(change => change.transient)).toBe(true);
    expect(annotator.history.canUndo()).toBe(false);

    tool.destroy();
    annotator.destroy();
  });

  it('flushes a fast annotation drag on release and cancels conversion failures', async () => {
    const { viewer, handlers } = createViewer();
    let rafCallback: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
      rafCallback = callback;
      return 91;
    }));
    const annotator = await createOpenSeadragonAnnotator(viewer as never);
    annotator.annotations.add({
      id: 'drag',
      shape: { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
    });
    annotator.history.clear();
    const finalUpdates: unknown[] = [];
    annotator.events.on('annotation:update', event => {
      if (!event.context.transient) finalUpdates.push(event);
    });
    const emit = (name: string, event: unknown) =>
      handlers.get(name)?.forEach(handler => handler(event as never));
    const pointer = (x: number, y: number) =>
      new PointerEvent('pointermove', { clientX: x, clientY: y });

    emit('canvas-press', {
      position: { x: 5, y: 5 },
      originalEvent: pointer(5, 5),
      preventDefaultAction: false,
    });
    emit('canvas-drag', {
      position: { x: 15, y: 5 },
      originalEvent: pointer(15, 5),
      preventDefaultAction: false,
    });
    expect(rafCallback).toBeDefined();
    emit('canvas-release', {
      position: { x: 25, y: 5 },
      originalEvent: pointer(25, 5),
      preventDefaultAction: false,
    });
    expect(annotator.annotations.get('drag')?.shape).toMatchObject({ x: 20, y: 0 });
    expect(finalUpdates).toHaveLength(1);
    annotator.history.undo();
    expect(annotator.annotations.get('drag')?.shape).toMatchObject({ x: 0, y: 0 });

    annotator.history.clear();
    emit('canvas-press', {
      position: { x: 5, y: 5 },
      originalEvent: pointer(5, 5),
      preventDefaultAction: false,
    });
    emit('canvas-drag', {
      position: { x: 15, y: 5 },
      originalEvent: pointer(15, 5),
      preventDefaultAction: false,
    });
    rafCallback?.(0);
    expect(annotator.annotations.get('drag')?.shape).toMatchObject({ x: 10, y: 0 });
    viewer.world.getItemAt = () => undefined;
    emit('canvas-release', {
      position: { x: 15, y: 5 },
      originalEvent: pointer(15, 5),
      preventDefaultAction: false,
    });
    expect(annotator.annotations.get('drag')?.shape).toMatchObject({ x: 0, y: 0 });
    expect(annotator.history.canUndo()).toBe(false);
    annotator.destroy();
  });

  it('commits a drag released over another annotation as one undoable update', async () => {
    const { viewer, handlers } = createViewer();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 92));
    const annotator = await createOpenSeadragonAnnotator(viewer as never);
    annotator.annotations.addAll([
      {
        id: 'moving',
        shape: { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
      },
      {
        id: 'target',
        shape: { type: 'rectangle', x: 20, y: 0, width: 10, height: 10 },
      },
    ]);
    annotator.history.clear();
    const finalUpdates: string[] = [];
    annotator.events.on('annotation:update', event => {
      if (!event.context.transient) finalUpdates.push(event.annotation.id);
    });
    const emit = (name: string, event: unknown) =>
      handlers.get(name)?.forEach(handler => handler(event as never));
    const pointer = (x: number, y: number) =>
      new PointerEvent('pointermove', { clientX: x, clientY: y });

    emit('canvas-press', {
      position: { x: 5, y: 5 },
      originalEvent: pointer(5, 5),
      preventDefaultAction: false,
    });
    emit('canvas-drag', {
      position: { x: 25, y: 5 },
      originalEvent: pointer(25, 5),
      preventDefaultAction: false,
    });
    emit('canvas-release', {
      position: { x: 25, y: 5 },
      originalEvent: pointer(25, 5),
      preventDefaultAction: false,
    });

    expect(annotator.annotations.get('moving')?.shape).toMatchObject({ x: 20, y: 0 });
    expect(annotator.annotations.get('target')?.shape).toMatchObject({ x: 20, y: 0 });
    expect(finalUpdates).toEqual(['moving']);
    expect(annotator.history.canUndo()).toBe(true);
    annotator.history.undo();
    expect(annotator.annotations.get('moving')?.shape).toMatchObject({ x: 0, y: 0 });
    annotator.destroy();
  });

  it('mounts against a real OpenSeadragon viewer and its real canvas lifecycle', async () => {
    const element = document.createElement('div');
    Object.defineProperties(element, {
      clientWidth: { value: 800 },
      clientHeight: { value: 600 },
    });
    document.body.appendChild(element);
    const viewer = OpenSeadragon({
      element,
      showNavigationControl: false,
      immediateRender: true,
    });
    expect(viewer.canvas).toBeInstanceOf(HTMLElement);
    expect(element.querySelector('.openseadragon-canvas')).not.toBeNull();
    const annotator = await createOpenSeadragonAnnotator(viewer);
    expect(element.querySelector('.annota-pixi-canvas')).not.toBeNull();
    annotator.destroy();
    viewer.destroy();
    expect(element.querySelector('.annota-pixi-canvas')).toBeNull();
  });
});
