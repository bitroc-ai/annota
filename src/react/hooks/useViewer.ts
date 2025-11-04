/**
 * Hook for controlling the viewer (zoom, pan, etc.)
 *
 * @example
 * ```tsx
 * const viewer = useViewer(viewerInstance);
 * <button onClick={() => viewer.zoomIn()}>Zoom In</button>
 * <button onClick={() => viewer.zoomOut()}>Zoom Out</button>
 * <button onClick={() => viewer.zoomToFit()}>Fit</button>
 *
 * // Get viewport metrics for scale rulers
 * const metrics = viewer.getViewportMetrics();
 * const micronsPerPixel = mpp * metrics.imagePixelsPerScreenPixelX;
 * ```
 */

import { useCallback } from 'react';
import OpenSeadragon from 'openseadragon';

/**
 * Viewport metrics for scale calculations and measurements
 */
export interface ViewportMetrics {
  /** Number of image pixels visible horizontally */
  visibleImagePixelsX: number;
  /** Number of image pixels visible vertically */
  visibleImagePixelsY: number;
  /** Number of screen pixels in viewport width */
  screenPixelsX: number;
  /** Number of screen pixels in viewport height */
  screenPixelsY: number;
  /** Image pixels per screen pixel (horizontal) */
  imagePixelsPerScreenPixelX: number;
  /** Image pixels per screen pixel (vertical) */
  imagePixelsPerScreenPixelY: number;
}

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

  /**
   * Get current viewport metrics for scale calculations
   * Returns real-time metrics about visible image pixels and screen pixels
   */
  getViewportMetrics: () => ViewportMetrics;
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

  const getViewportMetrics = useCallback((): ViewportMetrics => {
    if (!viewer) {
      return {
        visibleImagePixelsX: 0,
        visibleImagePixelsY: 0,
        screenPixelsX: 0,
        screenPixelsY: 0,
        imagePixelsPerScreenPixelX: 1,
        imagePixelsPerScreenPixelY: 1,
      };
    }

    const viewport = viewer.viewport;
    const containerSize = viewport.getContainerSize();
    const viewportBounds = viewport.getBounds();

    // Convert viewport bounds to image coordinates
    const topLeft = viewport.viewportToImageCoordinates(
      viewportBounds.x,
      viewportBounds.y
    );
    const bottomRight = viewport.viewportToImageCoordinates(
      viewportBounds.x + viewportBounds.width,
      viewportBounds.y + viewportBounds.height
    );

    const visibleImagePixelsX = bottomRight.x - topLeft.x;
    const visibleImagePixelsY = bottomRight.y - topLeft.y;

    const screenPixelsX = containerSize.x;
    const screenPixelsY = containerSize.y;

    const imagePixelsPerScreenPixelX = visibleImagePixelsX / screenPixelsX;
    const imagePixelsPerScreenPixelY = visibleImagePixelsY / screenPixelsY;

    return {
      visibleImagePixelsX,
      visibleImagePixelsY,
      screenPixelsX,
      screenPixelsY,
      imagePixelsPerScreenPixelX,
      imagePixelsPerScreenPixelY,
    };
  }, [viewer]);

  return {
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActualSize,
    panTo,
    getZoom,
    setZoom,
    getViewportMetrics,
  };
}
