/**
 * Annota - OpenSeadragon Adapter
 * Coordinate conversion for OpenSeadragon viewer
 */

import OpenSeadragon from 'openseadragon';

export class OpenSeadragonAdapter {
  constructor(private viewer: OpenSeadragon.Viewer) {}

  /**
   * Convert canvas event coordinates to image pixel coordinates
   */
  canvasToImage(event: MouseEvent): { x: number; y: number } | null {
    if (!this.viewer || !this.viewer.world) return null;

    const tiledImage = this.viewer.world.getItemAt(0);
    if (!tiledImage || !tiledImage.source) return null;

    const canvas = this.viewer.canvas;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Create OpenSeadragon Point
    const viewportPoint = this.viewer.viewport.pointFromPixel(
      new OpenSeadragon.Point(canvasX, canvasY)
    );

    const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint);

    return {
      x: Math.round(imagePoint.x),
      y: Math.round(imagePoint.y),
    };
  }

  /**
   * Get image dimensions
   */
  getImageSize(): { width: number; height: number } | null {
    const tiledImage = this.viewer.world.getItemAt(0);
    if (!tiledImage || !tiledImage.source || !tiledImage.source.dimensions) return null;

    const { x, y } = tiledImage.source.dimensions;
    return { width: x, height: y };
  }

  /**
   * Get viewport bounds in image coordinates
   */
  getViewportBounds(): { x: number; y: number; width: number; height: number } | null {
    const tiledImage = this.viewer.world.getItemAt(0);
    if (!tiledImage) return null;

    const bounds = this.viewer.viewport.getBounds();
    const topLeft = tiledImage.viewportToImageCoordinates(
      new OpenSeadragon.Point(bounds.x, bounds.y)
    );
    const bottomRight = tiledImage.viewportToImageCoordinates(
      new OpenSeadragon.Point(bounds.x + bounds.width, bounds.y + bounds.height)
    );

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Add viewport change listener
   */
  onViewportChange(callback: () => void): () => void {
    this.viewer.addHandler('update-viewport', callback);
    return () => this.viewer.removeHandler('update-viewport', callback);
  }
}
