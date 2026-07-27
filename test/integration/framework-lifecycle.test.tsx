import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { destroy, create } = vi.hoisted(() => {
  const destroy = vi.fn();
  return { destroy, create: vi.fn(async () => ({ destroy })) };
});

vi.mock('../../src/adapters/openseadragon/annotator', () => ({
  createOpenSeadragonAnnotator: create,
}));

import { Annotator } from '../../src/react/annotator';
import { AnnotaProvider } from '../../src/react/provider';

describe('React annotator lifecycle', () => {
  it('protects StrictMode and route unmount during async initialization', async () => {
    const target = document.createElement('div');
    const root = createRoot(target);
    await act(async () => {
      root.render(
        <StrictMode>
          <AnnotaProvider>
            <Annotator viewer={{ canvas: document.createElement('div') } as never} />
          </AnnotaProvider>
        </StrictMode>
      );
      await Promise.resolve();
    });
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(create).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });
});
