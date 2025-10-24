/**
 * Polygon Tool - Draw polygon annotations by clicking vertices
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation, Point } from '../core/types';
import { calculateBounds } from '../core/types';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';

const DOUBLE_CLICK_THRESHOLD = 300; // ms
const CLOSE_THRESHOLD = 10; // pixels in image space

/**
 * Tool for drawing polygon annotations
 */
export class PolygonTool extends BaseTool {
  private points: Point[] = [];
  private currentAnnotationId: string | null = null;
  private lastClickTime = 0;
  private isDrawing = false;

  constructor(options: ToolHandlerOptions = {}) {
    super('polygon', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });
  }

  /**
   * Handle click event - add vertex or complete polygon
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);
    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;

    // Check for double-click to finish polygon
    if (this.isDrawing && timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
      this.finishPolygon();
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
      return;
    }

    this.lastClickTime = now;

    // If not drawing, check if click hit an existing annotation
    if (!this.isDrawing) {
      const hitAnnotation = this.checkAnnotationHit(clickPoint);
      if (hitAnnotation) {
        if (this.options.preventDefaultAction) {
          (evt as any).preventDefaultAction = true;
        }
        return;
      }
    }

    // Check if clicking near first point to close polygon
    if (this.isDrawing && this.points.length >= 3) {
      const firstPoint = this.points[0];
      const distance = Math.sqrt(
        Math.pow(clickPoint.x - firstPoint.x, 2) + Math.pow(clickPoint.y - firstPoint.y, 2)
      );

      if (distance < CLOSE_THRESHOLD) {
        this.finishPolygon();
        if (this.options.preventDefaultAction) {
          (evt as any).preventDefaultAction = true;
        }
        return;
      }
    }

    // Add vertex
    this.addVertex(clickPoint);

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Add a vertex to the current polygon
   */
  private addVertex(point: Point): void {
    if (!this.annotator) return;

    this.points.push(point);

    if (!this.isDrawing) {
      // Start new polygon
      this.isDrawing = true;
      this.currentAnnotationId = `polygon-${Date.now()}`;

      const annotation: Annotation = {
        id: this.currentAnnotationId,
        shape: {
          type: 'polygon',
          points: [...this.points],
          bounds: calculateBounds({
            type: 'polygon',
            points: [...this.points],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
          }),
        },
        style: this.options.annotationStyle,
        properties: this.options.annotationProperties || {},
      };

      this.annotator.state.store.add(annotation);
    } else if (this.currentAnnotationId) {
      // Update existing polygon
      const existing = this.annotator.state.store.get(this.currentAnnotationId);
      if (existing) {
        this.annotator.updateAnnotation(this.currentAnnotationId, {
          ...existing,
          shape: {
            type: 'polygon',
            points: [...this.points],
            bounds: calculateBounds({
              type: 'polygon',
              points: [...this.points],
              bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
            }),
          },
        });
      }
    }
  }

  /**
   * Finish the current polygon
   */
  private finishPolygon(): void {
    if (!this.isDrawing || this.points.length < 3) {
      // Cancel if less than 3 points
      if (this.currentAnnotationId && this.annotator) {
        this.annotator.state.store.delete(this.currentAnnotationId);
      }
    }

    // Reset state
    this.points = [];
    this.isDrawing = false;
    this.currentAnnotationId = null;
  }

  /**
   * Override init to attach keyboard listener
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);
    document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Override destroy to remove keyboard listener
   */
  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);

    // Cancel any in-progress drawing
    if (this.isDrawing && this.currentAnnotationId && this.annotator) {
      this.annotator.state.store.delete(this.currentAnnotationId);
      this.points = [];
      this.isDrawing = false;
      this.currentAnnotationId = null;
    }

    super.destroy();
  }

  /**
   * Cancel current drawing on escape key
   */
  private onKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === 'Escape' && this.isDrawing) {
      if (this.currentAnnotationId && this.annotator) {
        this.annotator.state.store.delete(this.currentAnnotationId);
      }
      this.points = [];
      this.isDrawing = false;
      this.currentAnnotationId = null;
    }
  };
}
