import { mount, tick, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

const { destroy, create } = vi.hoisted(() => {
  const destroy = vi.fn();
  return { destroy, create: vi.fn(async () => ({ destroy })) };
});

vi.mock('annota', async importOriginal => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, createOpenSeadragonAnnotator: create };
});

import Annotator from '../../src/svelte/components/annotator.svelte';

describe('Svelte annotator lifecycle', () => {
  it('destroys a resolved instance and tolerates repeated route teardown', async () => {
    const target = document.createElement('div');
    const viewer = {
      canvas: document.createElement('div'),
      viewport: {
        getContainerSize: () => ({ x: 800, y: 600 }),
        getZoom: () => 1,
        getFlip: () => false,
        getBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
        viewportToImageRectangle: (bounds: unknown) => bounds,
        getRotation: () => 0,
      },
      world: { getContentFactor: () => 1 },
      addHandler: vi.fn(),
      removeHandler: vi.fn(),
    };
    const component = mount(Annotator, {
      target,
      props: { viewer: viewer as never },
    });
    await tick();
    await Promise.resolve();
    await tick();
    await unmount(component);
    expect(create).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
