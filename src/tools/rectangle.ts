/**
 * Rectangle Tool - Draw rectangle annotations by dragging
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation, Point } from '../core/types';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';

/**
 * Tool for drawing rectangle annotations
 */
export class RectangleTool extends BaseTool {
  private startPoint: Point | null = null;
  private isDragging = false;
  private currentAnnotationId: string | null = null;

  constructor(options: ToolHandlerOptions = {}) {
    super('rectangle', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });
  }

  /**
   * Handle mouse/pointer down - start drawing rectangle
   */
  onCanvasPress = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // Check if click hit an existing annotation
    const hitAnnotation = this.checkAnnotationHit(clickPoint);

    if (hitAnnotation) {
      // Let selection system handle this
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
      return;
    }

    // Start drawing new rectangle
    this.startPoint = clickPoint;
    this.isDragging = true;
    this.currentAnnotationId = `rectangle-${Date.now()}`;

    // Create initial rectangle (0 size)
    const annotation: Annotation = {
      id: this.currentAnnotationId,
      shape: {
        type: 'rectangle',
        x: clickPoint.x,
        y: clickPoint.y,
        width: 0,
        height: 0,
        bounds: { minX: clickPoint.x, minY: clickPoint.y, maxX: clickPoint.x, maxY: clickPoint.y },
      },
      style: this.options.annotationStyle,
      properties: this.options.annotationProperties || {},
    };

    this.annotator.state.store.add(annotation);

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle mouse/pointer drag - update rectangle size
   */
  onCanvasDrag = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.isDragging || !this.startPoint || !this.currentAnnotationId) return;
    if (!this.annotator || !this.viewer) return;

    const { originalEvent } = evt as any;
    const currentPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // Calculate rectangle bounds
    const minX = Math.min(this.startPoint.x, currentPoint.x);
    const minY = Math.min(this.startPoint.y, currentPoint.y);
    const maxX = Math.max(this.startPoint.x, currentPoint.x);
    const maxY = Math.max(this.startPoint.y, currentPoint.y);

    const width = maxX - minX;
    const height = maxY - minY;

    // Update rectangle
    const existing = this.annotator.state.store.get(this.currentAnnotationId);
    if (existing) {
      this.annotator.updateAnnotation(this.currentAnnotationId, {
        ...existing,
        shape: {
          type: 'rectangle',
          x: minX,
          y: minY,
          width,
          height,
          bounds: { minX, minY, maxX, maxY },
        },
      });
    }

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle mouse/pointer release - finish drawing rectangle
   */
  onCanvasRelease = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.isDragging) return;

    let shouldSelect = false;

    // If rectangle is too small, delete it
    if (this.currentAnnotationId && this.annotator) {
      const annotation = this.annotator.state.store.get(this.currentAnnotationId);
      if (annotation && annotation.shape.type === 'rectangle') {
        const { width, height } = annotation.shape;
        // Delete if smaller than 5 pixels in either dimension
        if (width < 5 || height < 5) {
          this.annotator.state.store.delete(this.currentAnnotationId);
        } else {
          shouldSelect = true;
        }
      }
    }

    // Select the newly created annotation
    if (shouldSelect && this.currentAnnotationId) {
      this.selectAnnotation(this.currentAnnotationId);
    }

    // Reset state
    this.startPoint = null;
    this.isDragging = false;
    this.currentAnnotationId = null;

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };
}
