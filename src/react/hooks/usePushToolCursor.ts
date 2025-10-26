/**
 * Hook for managing the push tool cursor visualization
 *
 * Returns cursor position and radius for rendering the push cursor overlay.
 */

import { useEffect, useState } from 'react';
import OpenSeadragon from 'openseadragon';

export function usePushToolCursor(
  viewer: OpenSeadragon.Viewer | undefined,
  handler: { getCursorPosition(): { x: number; y: number } | null; getPushRadius(): number } | null,
  enabled: boolean
): { cursorPos: { x: number; y: number } | null; radiusInPixels: number } {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [radiusInPixels, setRadiusInPixels] = useState(0);

  useEffect(() => {
    if (!enabled || !handler || !viewer) {
      setCursorPos(null);
      return;
    }

    // Poll cursor position (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const pos = handler.getCursorPosition();
      setCursorPos(pos);

      if (pos && viewer) {
        // Calculate radius in screen pixels
        const radius = handler.getPushRadius();
        const radiusPixels = viewer.viewport.deltaPixelsFromPointsNoRotate(
          new OpenSeadragon.Point(radius, 0)
        ).x;
        setRadiusInPixels(radiusPixels);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [viewer, handler, enabled]);

  return { cursorPos, radiusInPixels };
}
