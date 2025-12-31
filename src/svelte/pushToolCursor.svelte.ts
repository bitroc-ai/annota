/**
 * Function for managing the push tool cursor visualization
 *
 * Returns cursor position and radius for rendering the push cursor overlay.
 * Uses Svelte's reactivity to automatically track changes to viewer, handler, and enabled state.
 */

import type OpenSeadragon from 'openseadragon';

export function pushToolCursor(
  viewer: () => OpenSeadragon.Viewer | undefined,
  handler: () => { getCursorPosition(): { x: number; y: number } | null; getPushRadius(): number } | null,
  enabled: () => boolean
): { cursorPos: { x: number; y: number } | null; radiusInPixels: number } {
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
        const pos = h.getCursorPosition();
        cursorPos = pos;

        if (pos && v) {
          // Calculate radius in screen pixels
          const radius = h.getPushRadius();
          const radiusPixels = v.viewport.deltaPixelsFromPointsNoRotate(
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

  return { cursorPos, radiusInPixels };
}

