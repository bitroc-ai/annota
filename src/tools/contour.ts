/**
 * Contour Detection Tool - Detect object contours/edges using OpenCV
 */

import OpenSeadragon from 'openseadragon';
import type { Annotation, PolygonShape } from '../core/types';
import { calculateBounds } from '../core/types';
import { detectContour as defaultDetector, isOpenCVReady, initOpenCV } from '../extensions/opencv';
import { BaseTool } from './base';
import type { ContourDetectOptions, ContourDetector } from './types';

/**
 * Tool for detecting object contours/edges
 * Supports custom detector functions or uses built-in OpenCV flood fill by default
 */
export class ContourTool extends BaseTool {
  private detector: ContourDetector;
  private threshold: number;
  private detectorOptions: Record<string, any>;
  private initializingOpenCV = false;

  constructor(options: ContourDetectOptions) {
    super('contour', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      annotationStyle: {
        fill: '#FF00FF',
        fillOpacity: 0.3,
        stroke: '#FF00FF',
        strokeWidth: 2,
      },
      ...options,
    });

    // Use custom detector or default OpenCV detector
    this.detector = options.detector || defaultDetector;
    this.threshold = options.threshold ?? 50;
    this.detectorOptions = options.detectorOptions || {};

    // Auto-initialize OpenCV only if using default detector and not using custom detector
    if (!options.detector && !isOpenCVReady() && !this.initializingOpenCV) {
      this.initializingOpenCV = true;
      initOpenCV()
        .then(() => {
          this.initializingOpenCV = false;
        })
        .catch(error => {
          console.error('[ContourTool] Failed to initialize OpenCV:', error);
          this.initializingOpenCV = false;
        });
    }
  }

  /**
   * Update threshold dynamically
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * Handle click event - detect contour/edge at click point
   */
  onCanvasClick = async (evt: OpenSeadragon.ViewerEvent): Promise<void> => {
    if (!this.enabled || !this.viewer || !this.annotator) {
      return;
    }

    // Only check OpenCV if using default detector
    if (this.detector === defaultDetector && !isOpenCVReady()) {
      console.warn('[ContourTool] OpenCV is still loading, please wait...');
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
      return;
    }

    const { originalEvent } = evt as any;

    // Check if click hit an existing annotation - if so, let selection happen instead
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);
    const hitAnnotation = this.checkAnnotationHit(clickPoint);

    if (hitAnnotation) {
      // Let selection happen instead
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
      return;
    }

    // Get the source image element
    const tiledImage = this.viewer.world.getItemAt(0);
    if (!tiledImage) {
      console.error('[ContourTool] No image loaded');
      return;
    }

    // Get canvas and context
    const canvas = (this.viewer.drawer as any).canvas as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[ContourTool] Failed to get canvas context');
      return;
    }

    // Canvas pixel coordinates - account for device pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasX = Math.floor(originalEvent.offsetX * pixelRatio);
    const canvasY = Math.floor(originalEvent.offsetY * pixelRatio);

    // Extract a region around the click point from canvas
    const regionSize = 500;
    const halfSize = regionSize / 2;

    // Calculate region bounds in canvas pixel coordinates
    const regionX = Math.max(0, Math.floor(canvasX - halfSize));
    const regionY = Math.max(0, Math.floor(canvasY - halfSize));
    const regionWidth = Math.min(regionSize, canvas.width - regionX);
    const regionHeight = Math.min(regionSize, canvas.height - regionY);

    // Get ImageData for just this region
    const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);

    // Adjust click point to be relative to extracted region
    const relativeClickX = canvasX - regionX;
    const relativeClickY = canvasY - regionY;

    try {
      // Call the detector function (custom or default OpenCV)
      const result = await this.detector(
        imageData,
        { x: relativeClickX, y: relativeClickY },
        {
          threshold: this.threshold,
          ...this.detectorOptions,
        }
      );

      if (result) {
        const { polygon, confidence, area, metadata } = result;

        // Convert region-relative polygon points to image coordinates
        const imagePolygon = polygon.map(point => {
          // Convert from region-relative to canvas pixel coordinates
          const canvasPixelX = point.x + regionX;
          const canvasPixelY = point.y + regionY;

          // Convert canvas pixels back to CSS pixels (divide by device pixel ratio)
          const cssX = canvasPixelX / pixelRatio;
          const cssY = canvasPixelY / pixelRatio;

          // Convert CSS pixels to viewport, then to image coordinates
          const viewportPoint = this.viewer!.viewport.pointFromPixel(
            new OpenSeadragon.Point(cssX, cssY)
          );
          const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint);
          return { x: imagePoint.x, y: imagePoint.y };
        });

        const shape: PolygonShape = {
          type: 'polygon',
          points: imagePolygon,
          bounds: calculateBounds({
            type: 'polygon',
            points: imagePolygon,
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
          }),
        };

        const annotation: Annotation = {
          id: `contour-${Date.now()}`,
          shape,
          style: this.options.annotationStyle,
          properties: {
            type: 'contour',
            area,
            confidence,
            ...(metadata || {}),
            ...this.options.annotationProperties,
          },
        };

        this.annotator.state.store.add(annotation);

        // Select the newly created annotation
        this.selectAnnotation(annotation.id);
      } else {
        console.warn('[ContourTool] No contour detected at click point');
      }
    } catch (error) {
      console.error('[ContourTool] Error during contour detection:', error);
    }

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };
}
