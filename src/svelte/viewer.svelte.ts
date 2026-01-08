/**
 * Function for controlling the viewer (zoom, pan, etc.)
 */

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

export interface ViewerResult {
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

export function viewerUtils(viewerInstance: OpenSeadragon.Viewer | undefined): ViewerResult {
  function zoomIn(factor = 1.2) {
    if (!viewerInstance) return;
    const currentZoom = viewerInstance.viewport.getZoom();
    viewerInstance.viewport.zoomTo(currentZoom * factor);
  }

  function zoomOut(factor = 1.2) {
    if (!viewerInstance) return;
    const currentZoom = viewerInstance.viewport.getZoom();
    viewerInstance.viewport.zoomTo(currentZoom / factor);
  }

  function zoomToFit() {
    if (!viewerInstance) return;
    viewerInstance.viewport.goHome();
  }

  function zoomToActualSize() {
    if (!viewerInstance) return;
    viewerInstance.viewport.zoomTo(1.0);
  }

  function panTo(x: number, y: number) {
    if (!viewerInstance) return;
    viewerInstance.viewport.panTo(new OpenSeadragon.Point(x, y));
  }

  function getZoom(): number {
    if (!viewerInstance) return 1;
    return viewerInstance.viewport.getZoom();
  }

  function setZoom(zoom: number) {
    if (!viewerInstance) return;
    viewerInstance.viewport.zoomTo(zoom);
  }

  function getViewportMetrics(): ViewportMetrics {
    if (!viewerInstance) {
      return {
        visibleImagePixelsX: 0,
        visibleImagePixelsY: 0,
        screenPixelsX: 0,
        screenPixelsY: 0,
        imagePixelsPerScreenPixelX: 1,
        imagePixelsPerScreenPixelY: 1,
      };
    }

    const viewport = viewerInstance.viewport;
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
  }

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

