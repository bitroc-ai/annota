/**
 * Function for managing the push tool cursor visualization
 *
 * Returns getter functions for cursor position and radius for rendering the push cursor overlay.
 * Uses Svelte's reactivity to automatically track changes to viewer, handler, and enabled state.
 */

import OpenSeadragon from 'openseadragon';

export function pushToolCursor(
  viewer: () => OpenSeadragon.Viewer | undefined,
  handler: () => { getCursorPosition(): { x: number; y: number } | null; getPushRadius(): number } | null,
  enabled: () => boolean
): { cursorPos: () => { x: number; y: number } | null; radiusInPixels: () => number } {
  let cursorPos: { x: number; y: number } | null = $state(null);
  let radiusInPixels: number = $state(0);

  $effect(() => {
    if (typeof window === 'undefined') return;

    const v = viewer();
    const h = handler();
    const e = enabled();

    if (!e || !h || !v) {
      cursorPos = null;
      radiusInPixels = 0;
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    // Dynamic import to avoid SSR issues
    import('openseadragon').then((OSD) => {
      if (!e || !h || !v) return; // Check again after async import

      // Poll cursor position (simple approach - could be improved with events)
      interval = setInterval(() => {
        const currentHandler = handler();
        const currentViewer = viewer();

        if (!currentHandler || !currentViewer) return;

        const pos = currentHandler.getCursorPosition();
        cursorPos = pos;

        if (pos) {
          // Calculate radius in screen pixels
          const radius = currentHandler.getPushRadius();
          const radiusPixels = currentViewer.viewport.deltaPixelsFromPointsNoRotate(
            new OSD.default.Point(radius, 0)
          ).x;
          radiusInPixels = radiusPixels;
        }
      }, 16); // ~60fps
    });

    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  });

  // Return getter functions to maintain reactivity
  return { 
    cursorPos: () => cursorPos, 
    radiusInPixels: () => radiusInPixels 
  };
}

