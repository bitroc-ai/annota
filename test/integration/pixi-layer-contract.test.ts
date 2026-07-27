import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { createLayerManager } from '../../src/core/layer';
import { normalizeAnnotation } from '../../src/core/normalization';
import { PixiStage } from '../../src/rendering/pixi/stage';

describe('Pixi layer rendering contract', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 44));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('orders real Pixi display objects by layer z-index and composes image opacity', () => {
    const layers = createLayerManager();
    layers.createLayer('low', { zIndex: -10, opacity: 0.4 });
    layers.createLayer('high', { zIndex: 10, opacity: 0.8 });
    const app = {
      stage: new PIXI.Container(),
      ticker: { stop: vi.fn() },
      renderer: {
        width: 800,
        height: 600,
        render: vi.fn(),
        resize: vi.fn(),
      },
      destroy: vi.fn(),
    };
    const stage = new (PixiStage as unknown as new (
      app: unknown,
      viewer: unknown,
      options: unknown
    ) => PixiStage)(app, {}, { layerManager: layers });
    const high = normalizeAnnotation({
      id: 'high',
      layerId: 'high',
      shape: {
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        url: 'high.png',
        opacity: 0.5,
      },
    });
    const lowFirst = normalizeAnnotation({
      id: 'low-first',
      layerId: 'low',
      shape: { type: 'image', x: 0, y: 0, width: 10, height: 10, url: 'low-first.png' },
    });
    const lowSecond = normalizeAnnotation({
      id: 'low-second',
      layerId: 'low',
      shape: { type: 'image', x: 0, y: 0, width: 10, height: 10, url: 'low-second.png' },
    });

    stage.addAnnotation(high);
    stage.addAnnotation(lowFirst);
    stage.addAnnotation(lowSecond);
    const entries = (stage as unknown as {
      annotationMap: Map<string, { graphics: PIXI.Graphics; sprite: PIXI.Sprite }>;
      container: PIXI.Container;
    }).annotationMap;
    const container = (stage as unknown as { container: PIXI.Container }).container;
    const index = (id: string) => container.getChildIndex(entries.get(id)!.graphics);
    expect(index('low-first')).toBeLessThan(index('low-second'));
    expect(index('low-second')).toBeLessThan(index('high'));
    expect(entries.get('low-first')!.sprite.alpha).toBeCloseTo(0.4);
    expect(entries.get('high')!.sprite.alpha).toBeCloseTo(0.4);

    layers.setLayerZIndex('high', -20);
    expect(index('high')).toBeLessThan(index('low-first'));
    stage.destroy();
  });
});
