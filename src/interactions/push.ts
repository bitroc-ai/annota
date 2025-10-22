/**
 * Push Tool - Adjust polygon vertices by pushing/pulling them
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation } from '../core/types';
import { calculateBounds } from '../core/types';
import { BaseInteraction } from './base';
import type { PushToolOptions } from './types';

/**
 * Tool for pushing polygon vertices to adjust shapes
 */
export class PushTool extends BaseInteraction {
  private isPushing = false;
  private affectedAnnotations = new Map<string, { x: number; y: number }[]>();
  private cursorPos: { x: number; y: number } | null = null;
  private onMouseMove?: (e: MouseEvent) => void;
  private onMouseLeave?: () => void;
  private pushOptions: Required<Omit<PushToolOptions, 'annotationProperties'>> & {
    annotationProperties?: Record<string, any>;
  };

  constructor(options: PushToolOptions) {
    super('push', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });

    this.pushOptions = {
      pushRadius: options.pushRadius,
      pushStrength: options.pushStrength ?? 0.5,
      showCursor: options.showCursor ?? true,
      preventDefaultAction: options.preventDefaultAction ?? true,
      checkAnnotationHits: options.checkAnnotationHits ?? true,
      annotationStyle: options.annotationStyle ?? {},
      annotationProperties: options.annotationProperties,
    };
  }

  /**
   * Get cursor position for rendering
   */
  getCursorPosition(): { x: number; y: number } | null {
    return this.cursorPos;
  }

  /**
   * Get push radius for cursor rendering
   */
  getPushRadius(): number {
    return this.pushOptions.pushRadius;
  }

  /**
   * Update push radius dynamically
   */
  setPushRadius(radius: number): void {
    this.pushOptions.pushRadius = radius;
  }

  /**
   * Initialize and attach mouse tracking for cursor visualization
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);

    if (this.pushOptions.showCursor && viewer.canvas) {
      // Track mouse movement for cursor visualization
      this.onMouseMove = (e: MouseEvent) => {
        const canvas = viewer.canvas;
        const rect = canvas.getBoundingClientRect();
        this.cursorPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      this.onMouseLeave = () => {
        this.cursorPos = null;
      };

      viewer.canvas.addEventListener('mousemove', this.onMouseMove);
      viewer.canvas.addEventListener('mouseenter', this.onMouseMove);
      viewer.canvas.addEventListener('mouseleave', this.onMouseLeave);
    }
  }

  /**
   * Cleanup mouse tracking
   */
  destroy(): void {
    if (this.viewer?.canvas) {
      if (this.onMouseMove) {
        this.viewer.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.viewer.canvas.removeEventListener('mouseenter', this.onMouseMove);
      }
      if (this.onMouseLeave) {
        this.viewer.canvas.removeEventListener('mouseleave', this.onMouseLeave);
      }
    }

    this.cursorPos = null;
    this.isPushing = false;
    this.affectedAnnotations.clear();
    super.destroy();
  }

  /**
   * Handle press event - start pushing
   */
  onCanvasPress = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // Check if clicking directly on annotation center (not on vertices)
    const annotations = this.annotator.state.store.all();
    const clickedOnAnnotation = annotations.some((ann: Annotation) => {
      const { bounds } = ann.shape;
      const isInBounds =
        clickPoint.x >= bounds.minX &&
        clickPoint.x <= bounds.maxX &&
        clickPoint.y >= bounds.minY &&
        clickPoint.y <= bounds.maxY;

      if (!isInBounds || ann.shape.type !== 'polygon') return false;

      // Check if near any vertex
      const nearVertex = ann.shape.points.some(point => {
        const dx = point.x - clickPoint.x;
        const dy = point.y - clickPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.pushOptions.pushRadius;
      });

      // If in bounds but NOT near vertex, it's a body click
      return isInBounds && !nearVertex;
    });

    // If clicked on annotation body (not vertices), let selection happen
    if (clickedOnAnnotation) {
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
      return;
    }

    this.isPushing = true;
    this.affectedAnnotations.clear();

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle drag event - push vertices
   */
  onCanvasDrag = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.isPushing || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get current cursor position in image coordinates
    const cursorPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    // Find all polygon annotations and push their vertices
    const annotator = this.annotator; // Capture in local variable for type narrowing
    const annotations = annotator.state.store.all();
    const polygonAnnotations = annotations.filter((a: Annotation) => a.shape.type === 'polygon');

    polygonAnnotations.forEach((annotation: Annotation) => {
      if (annotation.shape.type !== 'polygon') return;

      // Store original points if not already stored
      if (!this.affectedAnnotations.has(annotation.id)) {
        this.affectedAnnotations.set(
          annotation.id,
          annotation.shape.points.map(p => ({ ...p }))
        );
      }

      const originalPoints = this.affectedAnnotations.get(annotation.id)!;
      const newPoints = originalPoints.map(point => {
        // Calculate distance from cursor to vertex
        const dx = point.x - cursorPoint.x;
        const dy = point.y - cursorPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If within push radius, move the vertex
        if (distance < this.pushOptions.pushRadius && distance > 0.1) {
          // Calculate push strength (stronger when closer to cursor)
          const strength =
            (1 - distance / this.pushOptions.pushRadius) * this.pushOptions.pushStrength;
          const pushAmount = strength * 10; // Base push amount

          // Push in direction away from cursor
          const angle = Math.atan2(dy, dx);
          return {
            x: point.x + Math.cos(angle) * pushAmount,
            y: point.y + Math.sin(angle) * pushAmount,
          };
        }

        return { ...point };
      });

      // Update annotation with new points
      annotator.state.store.update(annotation.id, {
        ...annotation,
        shape: {
          ...annotation.shape,
          points: newPoints,
          bounds: calculateBounds({
            type: 'polygon',
            points: newPoints,
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
          }),
        },
      });
    });

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle release event - finish pushing
   */
  onCanvasRelease = (evt: OpenSeadragon.ViewerEvent): void => {
    if (this.isPushing) {
      if (this.options.preventDefaultAction) {
        (evt as any).preventDefaultAction = true;
      }
    }

    this.isPushing = false;
    this.affectedAnnotations.clear();
  };
}
