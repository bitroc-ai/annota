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
});
