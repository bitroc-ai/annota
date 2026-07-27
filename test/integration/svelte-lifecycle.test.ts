import { mount, tick, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import OpenSeadragon from 'openseadragon';

const { stage } = vi.hoisted(() => ({
  stage: {
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
  },
}));

vi.mock('../../src/rendering/pixi/stage', () => ({
  createPixiStage: vi.fn(async () => stage),
}));

import Annotator from '../../src/svelte/components/annotator.svelte';

class ResizeObserverFake {
  observe = vi.fn();
  disconnect = vi.fn();
}

describe('Svelte annotator lifecycle', () => {
  it('uses the real annotator/OSD lifecycle and destroys on route teardown', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverFake);
    const viewerElement = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(viewerElement, target);
    const viewer = OpenSeadragon({
      element: viewerElement,
      showNavigationControl: false,
    });
    const component = mount(Annotator, {
      target,
      props: { viewer },
    });
    await tick();
    await Promise.resolve();
    await tick();
    expect(viewerElement.querySelector('.annota-pixi-canvas')).not.toBeNull();
    await unmount(component);
    await tick();
    expect(viewerElement.querySelector('.annota-pixi-canvas')).toBeNull();
    expect(stage.destroy).toHaveBeenCalled();
    viewer.destroy();
  });
});
