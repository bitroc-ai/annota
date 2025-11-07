/**
 * Curve Tool - Draw smooth closed curves by freehand drawing
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation, Point, ControlPoint } from '../core/types';
import { calculateBounds } from '../core/types';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';

/**
 * Tool for drawing smooth closed curve annotations
 * Supports freehand drawing with automatic curve smoothing
 */
export class CurveTool extends BaseTool {
  private points: Point[] = [];
  private currentAnnotationId: string | null = null;
  private isDrawing = false;

  constructor(options: ToolHandlerOptions = {}) {
    super('curve', {
      preventDefaultAction: true,
      checkAnnotationHits: false,
      ...options,
    });
  }

  /**
   * Handle canvas press - start drawing
   */
  onCanvasPress = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;
    const point = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // If not drawing, check if we're clicking on an existing annotation
    if (!this.isDrawing) {
      const hitAnnotation = this.checkAnnotationHit(point);
      if (hitAnnotation) {
        if (this.options.preventDefaultAction) {
          (evt as any).preventDefaultAction = true;
        }
        return;
      }
    }

    // Start drawing
    this.isDrawing = true;
    this.points = [point];
    this.currentAnnotationId = `curve-${Date.now()}`;

    // Create initial annotation (using polygon type for save/load symmetry)
    const annotation: Annotation = {
      id: this.currentAnnotationId,
      shape: {
        type: 'polygon',
        points: [{ x: point.x, y: point.y }],
        bounds: calculateBounds({
          type: 'polygon',
          points: [{ x: point.x, y: point.y }],
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        }),
      },
      style: this.options.annotationStyle,
      properties: {
        classification: 'positive', // Default to positive mask
        ...this.options.annotationProperties,
        _inProgress: true,
      },
    };

    this.annotator.state.store.add(annotation);

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle canvas drag - add points while drawing
   */
  onCanvasDrag = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator || !this.isDrawing) return;

    const { originalEvent } = evt as any;
    const point = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // Add point if it's far enough from the last point (simplification)
    const lastPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    );

    if (distance > 2) {
      // At least 2 pixels apart
      this.points.push(point);
      this.updateCurve();
    }

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle canvas release - finish drawing
   */
  onCanvasRelease = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator || !this.isDrawing) return;

    if (this.points.length < 3) {
      // Not enough points - cancel
      if (this.currentAnnotationId) {
        this.annotator.state.store.delete(this.currentAnnotationId);
      }
    } else {
      // Simplify and smooth the path
      const simplifiedPoints = this.simplifyPath(this.points);
      const controlPoints = this.convertToControlPoints(simplifiedPoints);

      // Update to final closed polygon (maintains symmetry with save/load)
      if (this.currentAnnotationId) {
        const annotation = this.annotator.state.store.get(this.currentAnnotationId);
        if (annotation) {
          const { _inProgress, ...cleanProperties } = annotation.properties || {};
          this.annotator.updateAnnotation(this.currentAnnotationId, {
            ...annotation,
            shape: {
              type: 'polygon',
              points: controlPoints,
              bounds: calculateBounds({
                type: 'polygon',
                points: controlPoints,
                bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
              }),
            },
            properties: cleanProperties,
          });
        }
        this.selectAnnotation(this.currentAnnotationId);
      }
    }

    // Reset state
    this.points = [];
    this.isDrawing = false;
    this.currentAnnotationId = null;

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Update the curve annotation with current points
   */
  private updateCurve(): void {
    if (!this.currentAnnotationId || !this.annotator) return;

    const existing = this.annotator.state.store.get(this.currentAnnotationId);
    if (!existing) return;

    // Convert points to control points for preview
    const controlPoints = this.convertToControlPoints(this.points);

    this.annotator.updateAnnotation(this.currentAnnotationId, {
      ...existing,
      shape: {
        type: 'polygon',
        points: controlPoints,
        bounds: calculateBounds({
          type: 'polygon',
          points: controlPoints,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        }),
      },
    });
  }

  /**
   * Simplify path using Douglas-Peucker algorithm
   */
  private simplifyPath(points: Point[], tolerance = 2): Point[] {
    if (points.length < 3) return points;

    // Find the point with maximum distance from line segment
    let maxDist = 0;
    let maxIndex = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const dist = this.perpendicularDistance(points[i], points[0], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
      const right = this.simplifyPath(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[0], points[end]];
    }
  }

  /**
   * Calculate perpendicular distance from point to line segment
   */
  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;

    const pdx = point.x - projX;
    const pdy = point.y - projY;

    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  /**
   * Convert simple points to control points
   */
  private convertToControlPoints(points: Point[]): ControlPoint[] {
    return points.map(p => ({ x: p.x, y: p.y }));
  }

  /**
   * Override init to attach event listeners
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);
    document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Override destroy to remove event listeners
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
