/**
 * Polygon Tool - Draw polygon annotations by clicking vertices
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation, Point } from '../core/types';
import { calculateBounds } from '../core/types';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';

const SNAP_THRESHOLD = 10; // pixels in image space - snap to vertex within this distance
const DOUBLE_CLICK_TIME = 300; // ms - time window to detect double-click

/**
 * Tool for drawing polygon annotations
 */
export class PolygonTool extends BaseTool {
  private points: Point[] = [];
  private currentAnnotationId: string | null = null;
  private isDrawing = false;
  private previewPoint: Point | null = null;
  private lastClickTime = 0;

  constructor(options: ToolHandlerOptions = {}) {
    super('polygon', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });
  }

  /**
   * Handle mouse move - update preview line
   */
  private onPointerMove = (evt: PointerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator || !this.isDrawing) return;

    const movePoint = this.viewerToImageCoords(evt.offsetX, evt.offsetY);

    // Update preview point
    this.previewPoint = movePoint;

    // Update the annotation with preview
    this.updatePolygonWithPreview();
  };

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
    if (this.isDrawing && timeSinceLastClick < DOUBLE_CLICK_TIME) {
      // Check if double-click is near any existing vertex for snapping
      if (this.points.length >= 3) {
        let snapPoint: Point | null = null;
        for (const point of this.points) {
          const distance = Math.sqrt(
            Math.pow(clickPoint.x - point.x, 2) + Math.pow(clickPoint.y - point.y, 2)
          );
          if (distance < SNAP_THRESHOLD) {
            snapPoint = point;
            break;
          }
        }

        // If we found a snap point and it's not already the last point, add it
        if (snapPoint) {
          const lastPoint = this.points[this.points.length - 1];
          const isLastPoint = lastPoint.x === snapPoint.x && lastPoint.y === snapPoint.y;
          if (!isLastPoint) {
            this.points.push(snapPoint);
            this.updatePolygonWithPreview();
          }
        }
      }

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
    this.previewPoint = null; // Clear preview point when adding real vertex

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
    } else {
      // Update existing polygon (without preview since we just cleared it)
      this.updatePolygonWithPreview();
    }
  }

  /**
   * Update polygon annotation with current points and preview point
   */
  private updatePolygonWithPreview(): void {
    if (!this.currentAnnotationId || !this.annotator) return;

    const existing = this.annotator.state.store.get(this.currentAnnotationId);
    if (!existing) return;

    // Create points array with preview point if available
    const displayPoints = this.previewPoint
      ? [...this.points, this.previewPoint]
      : [...this.points];

    this.annotator.updateAnnotation(this.currentAnnotationId, {
      ...existing,
      shape: {
        type: 'polygon',
        points: displayPoints,
        bounds: calculateBounds({
          type: 'polygon',
          points: displayPoints,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        }),
      },
    });
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
    } else {
      // Select the newly created annotation
      if (this.currentAnnotationId) {
        this.selectAnnotation(this.currentAnnotationId);
      }
    }

    // Reset state
    this.points = [];
    this.isDrawing = false;
    this.currentAnnotationId = null;
    this.previewPoint = null;
  }

  /**
   * Override init to attach keyboard and pointer listeners
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);
    document.addEventListener('keydown', this.onKeyDown);

    // Attach pointer move listener to canvas for preview line
    const canvas = viewer.canvas;
    if (canvas) {
      canvas.addEventListener('pointermove', this.onPointerMove);
    }
  }

  /**
   * Override destroy to remove keyboard and pointer listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);

    // Remove pointer move listener from canvas
    if (this.viewer?.canvas) {
      this.viewer.canvas.removeEventListener('pointermove', this.onPointerMove);
    }

    // Cancel any in-progress drawing
    if (this.isDrawing && this.currentAnnotationId && this.annotator) {
      this.annotator.state.store.delete(this.currentAnnotationId);
      this.points = [];
      this.isDrawing = false;
      this.currentAnnotationId = null;
      this.previewPoint = null;
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
      this.previewPoint = null;
    }
  };
}
