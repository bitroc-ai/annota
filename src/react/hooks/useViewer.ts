/**
 * Hook for controlling the viewer (zoom, pan, etc.)
 *
 * @example
 * ```tsx
 * const viewer = useViewer(viewerInstance);
 * <button onClick={() => viewer.zoomIn()}>Zoom In</button>
 * <button onClick={() => viewer.zoomOut()}>Zoom Out</button>
 * <button onClick={() => viewer.zoomToFit()}>Fit</button>
 * ```
 */

import { useCallback } from 'react';
import OpenSeadragon from 'openseadragon';

export interface UseViewerResult {
  /** Zoom in by a factor */
  zoomIn: (factor?: number) => void;

  /** Zoom out by a factor */
  zoomOut: (factor?: number) => void;

  /** Zoom to fit the entire image */
  zoomToFit: () => void;

  /** Reset zoom to 1:1 */
  zoomToActualSize: () => void;

  /** Pan to a specific point */
  panTo: (x: number, y: number) => void;

  /** Get current zoom level */
  getZoom: () => number;

  /** Set zoom level */
  setZoom: (zoom: number) => void;
}

export function useViewer(viewer: OpenSeadragon.Viewer | undefined): UseViewerResult {
  const zoomIn = useCallback(
    (factor = 1.2) => {
      if (!viewer) return;
      const currentZoom = viewer.viewport.getZoom();
      viewer.viewport.zoomTo(currentZoom * factor);
    },
    [viewer]
  );

  const zoomOut = useCallback(
    (factor = 1.2) => {
      if (!viewer) return;
      const currentZoom = viewer.viewport.getZoom();
      viewer.viewport.zoomTo(currentZoom / factor);
    },
    [viewer]
  );

  const zoomToFit = useCallback(() => {
    if (!viewer) return;
    viewer.viewport.goHome();
  }, [viewer]);

  const zoomToActualSize = useCallback(() => {
    if (!viewer) return;
    viewer.viewport.zoomTo(1.0);
  }, [viewer]);

  const panTo = useCallback(
    (x: number, y: number) => {
      if (!viewer) return;
      viewer.viewport.panTo(new OpenSeadragon.Point(x, y));
    },
    [viewer]
  );

  const getZoom = useCallback(() => {
    if (!viewer) return 1;
    return viewer.viewport.getZoom();
  }, [viewer]);

  const setZoom = useCallback(
    (zoom: number) => {
      if (!viewer) return;
      viewer.viewport.zoomTo(zoom);
    },
    [viewer]
  );

  return {
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActualSize,
    panTo,
    getZoom,
    setZoom,
  };
}
