/**
 * Annota Adapter - OpenSeadragon Coordinate Transforms
 * Coordinate conversion utilities for OpenSeadragon
 */

import OpenSeadragon from 'openseadragon';
import type { Point } from '../../core/types';

/**
 * Convert viewport coordinates to image coordinates
 */
export function viewportToImage(
  viewer: OpenSeadragon.Viewer,
  viewportPoint: OpenSeadragon.Point
): Point | null {
  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return null;

  const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint);
  return {
    x: imagePoint.x,
    y: imagePoint.y,
  };
}

/**
 * Convert image coordinates to viewport coordinates
 */
export function imageToViewport(
  viewer: OpenSeadragon.Viewer,
  imagePoint: Point
): OpenSeadragon.Point | null {
  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return null;

  return tiledImage.imageToViewportCoordinates(new OpenSeadragon.Point(imagePoint.x, imagePoint.y));
}

/**
 * Convert pixel coordinates (screen) to viewport coordinates
 */
export function pixelToViewport(
  viewer: OpenSeadragon.Viewer,
  pixelPoint: Point
): OpenSeadragon.Point {
  return viewer.viewport.pointFromPixel(new OpenSeadragon.Point(pixelPoint.x, pixelPoint.y));
}

/**
 * Convert viewport coordinates to pixel coordinates (screen)
 */
export function viewportToPixel(
  viewer: OpenSeadragon.Viewer,
  viewportPoint: OpenSeadragon.Point
): Point {
  const pixelPoint = viewer.viewport.pixelFromPoint(viewportPoint);
  return {
    x: pixelPoint.x,
    y: pixelPoint.y,
  };
}

/**
 * Convert pointer event to image coordinates
 */
export function pointerEventToImage(
  viewer: OpenSeadragon.Viewer,
  event: PointerEvent
): Point | null {
  const canvas = viewer.canvas;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;

  const viewportPoint = pixelToViewport(viewer, { x: pixelX, y: pixelY });
  return viewportToImage(viewer, viewportPoint);
}

/**
 * Get viewport bounds in image coordinates
 */
export function getViewportBounds(viewer: OpenSeadragon.Viewer): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return null;

  const bounds = viewer.viewport.getBounds(true);
  const topLeft = tiledImage.viewportToImageCoordinates(
    new OpenSeadragon.Point(bounds.x, bounds.y)
  );
  const bottomRight = tiledImage.viewportToImageCoordinates(
    new OpenSeadragon.Point(bounds.x + bounds.width, bounds.y + bounds.height)
  );

  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
  };
}
