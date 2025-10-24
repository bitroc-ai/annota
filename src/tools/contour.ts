/**
 * Contour Detection Tool - Detect contours/edges using OpenCV
 */

import OpenSeadragon from 'openseadragon';
import type { Annotation, PolygonShape } from '../core/types';
import { calculateBounds } from '../core/types';
import { detectCellEdge, isOpenCVReady, initOpenCV } from '../extensions/opencv';
import { BaseTool } from './base';
import type { ContourDetectOptions } from './types';

/**
 * Tool for detecting contours/edges using OpenCV
 * OpenCV is automatically initialized when the tool is created
 */
export class ContourTool extends BaseTool {
  private detectOptions: Required<Omit<ContourDetectOptions, 'annotationProperties'>> & {
    annotationProperties?: Record<string, any>;
  };
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

    this.detectOptions = {
      cv: options.cv,
      tileSource: options.tileSource,
      threshold: options.threshold ?? 50,
      preventDefaultAction: options.preventDefaultAction ?? true,
      checkAnnotationHits: options.checkAnnotationHits ?? true,
      annotationStyle: options.annotationStyle ?? {},
      annotationProperties: options.annotationProperties,
    };

    // Auto-initialize OpenCV when tool is created (lazy loading)
    if (!isOpenCVReady() && !this.initializingOpenCV) {
      this.initializingOpenCV = true;
      initOpenCV()
        .then(() => {
          console.log('[CellDetect] OpenCV initialized');
          this.initializingOpenCV = false;
        })
        .catch(error => {
          console.error('[CellDetect] Failed to initialize OpenCV:', error);
          this.initializingOpenCV = false;
        });
    }
  }

  /**
   * Update threshold dynamically
   */
  setThreshold(threshold: number): void {
    this.detectOptions.threshold = threshold;
  }

  /**
   * Handle click event - detect cell edge at click point
   */
  onCanvasClick = async (evt: OpenSeadragon.ViewerEvent): Promise<void> => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    if (!isOpenCVReady()) {
      console.warn('[CellDetect] OpenCV not ready, still loading...');
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
      console.error('[CellDetect] No image loaded');
      return;
    }

    // Get canvas and context
    const canvas = (this.viewer.drawer as any).canvas as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[CellDetect] Failed to get canvas context');
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
      // Use threshold from options
      const result = detectCellEdge(
        imageData,
        { x: relativeClickX, y: relativeClickY },
        { threshold: this.detectOptions.threshold }
      );

      if (result) {
        const { polygon, confidence, area } = result;

        console.log(
          `[CellDetect] Detected cell with ${polygon.length} points, area: ${area}, confidence: ${confidence.toFixed(2)}`
        );

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
          id: `cell-${Date.now()}`,
          shape,
          style: this.options.annotationStyle,
          properties: {
            type: 'cell',
            area,
            confidence,
            ...this.options.annotationProperties,
          },
        };

        this.annotator.state.store.add(annotation);
        console.log('[CellDetect] Cell annotation added');
      } else {
        console.warn('[CellDetect] No cell detected at click point');
      }
    } catch (error) {
      console.error('[CellDetect] Error during cell detection:', error);
    }

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };
}
