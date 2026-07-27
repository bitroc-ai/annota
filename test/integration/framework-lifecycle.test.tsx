import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
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

import { Annotator } from '../../src/react/annotator';
import { AnnotaProvider } from '../../src/react/provider';

class ResizeObserverFake {
  observe = vi.fn();
  disconnect = vi.fn();
}

describe('React annotator lifecycle', () => {
  it('uses the real annotator/OSD lifecycle through StrictMode route teardown', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverFake);
    const viewerElement = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(viewerElement, target);
    const viewer = OpenSeadragon({
      element: viewerElement,
      showNavigationControl: false,
    });
    const root = createRoot(target);
    await act(async () => {
      root.render(
        <StrictMode>
          <AnnotaProvider>
            <Annotator viewer={viewer} />
          </AnnotaProvider>
        </StrictMode>
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(viewerElement.querySelector('.annota-pixi-canvas')).not.toBeNull();
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(viewerElement.querySelector('.annota-pixi-canvas')).toBeNull();
    expect(stage.destroy).toHaveBeenCalled();
    viewer.destroy();
  });
});
