/**
 * Split Tool - Cut annotations into multiple pieces with a line
 */

import type OpenSeadragon from 'openseadragon';
import type { Annotation, Point } from '../core/types';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';
import { splitAnnotation, canSplitAnnotation } from '../core/operations';
import { SplitCommand } from '../core/history';

/**
 * Tool for splitting annotations into multiple pieces
 *
 * Usage:
 * 1. Click on an annotation to select it and start drawing the split line
 * 2. Click to add more vertices to the split line
 * 3. Double-click or press Enter to execute the split
 * 4. Press Escape to cancel
 *
 * Features:
 * - Orange line shows where the split will occur
 * - Gray dashed line shows preview from last vertex to cursor
 * - Prevents canvas panning while drawing
 */
export class SplitTool extends BaseTool {
  private state: 'idle' | 'drawing' = 'idle';
  private targetAnnotation: Annotation | null = null;
  private splitLinePoints: Point[] = [];
  private previewLineId: string | null = null;
  private livePreviewId: string | null = null;
  private currentMousePos: Point | null = null;

  constructor(options: ToolHandlerOptions = {}) {
    super('split', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });
  }

  /**
   * Update the visual preview of the split line
   */
  private updatePreviewLine(): void {
    if (!this.annotator || this.splitLinePoints.length < 1) return;

    const store = this.annotator.state.store;

    // Remove old preview line if exists
    if (this.previewLineId) {
      const existing = store.get(this.previewLineId);
      if (existing) {
        store.delete(this.previewLineId);
      }
    }

    // Create new preview line annotation
    if (this.splitLinePoints.length >= 1) {
      this.previewLineId = `split-line-${Date.now()}`;

      // Calculate bounds for the line
      let minX = this.splitLinePoints[0].x;
      let minY = this.splitLinePoints[0].y;
      let maxX = this.splitLinePoints[0].x;
      let maxY = this.splitLinePoints[0].y;

      for (const point of this.splitLinePoints) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }

      const previewAnnotation: Annotation = {
        id: this.previewLineId,
        shape: {
          type: 'freehand',
          points: [...this.splitLinePoints],
          closed: false,
          bounds: { minX, minY, maxX, maxY },
        },
        style: {
          stroke: '#ff6b00', // Orange color for split line
          strokeWidth: 3,
          strokeOpacity: 1,
          fill: 'transparent',
          fillOpacity: 0,
        },
        properties: {
          _isSplitPreview: true,
        },
      };

      store.add(previewAnnotation);
    }
  }

  /**
   * Remove the preview line
   */
  private removePreviewLine(): void {
    if (!this.annotator || !this.previewLineId) return;

    const store = this.annotator.state.store;
    const existing = store.get(this.previewLineId);
    if (existing) {
      store.delete(this.previewLineId);
    }
    this.previewLineId = null;
  }

  /**
   * Update live preview line from last vertex to current mouse position
   */
  private updateLivePreview(): void {
    if (!this.annotator || !this.currentMousePos || this.splitLinePoints.length < 1) {
      this.removeLivePreview();
      return;
    }

    const store = this.annotator.state.store;

    // Remove old live preview if exists
    if (this.livePreviewId) {
      const existing = store.get(this.livePreviewId);
      if (existing) {
        store.delete(this.livePreviewId);
      }
    }

    // Create live preview line from last vertex to cursor
    this.livePreviewId = `split-live-${Date.now()}`;
    const lastPoint = this.splitLinePoints[this.splitLinePoints.length - 1];
    const previewPoints = [lastPoint, this.currentMousePos];

    const minX = Math.min(lastPoint.x, this.currentMousePos.x);
    const minY = Math.min(lastPoint.y, this.currentMousePos.y);
    const maxX = Math.max(lastPoint.x, this.currentMousePos.x);
    const maxY = Math.max(lastPoint.y, this.currentMousePos.y);

    const livePreviewAnnotation: Annotation = {
      id: this.livePreviewId,
      shape: {
        type: 'freehand',
        points: previewPoints,
        closed: false,
        bounds: { minX, minY, maxX, maxY },
      },
      style: {
        stroke: '#999999', // Gray color for live preview
        strokeWidth: 2,
        strokeOpacity: 0.4,
        fill: 'transparent',
        fillOpacity: 0,
      },
      properties: {
        _isSplitLivePreview: true,
      },
    };

    store.add(livePreviewAnnotation);
  }

  /**
   * Remove live preview line
   */
  private removeLivePreview(): void {
    if (!this.annotator || !this.livePreviewId) return;

    const store = this.annotator.state.store;
    const existing = store.get(this.livePreviewId);
    if (existing) {
      store.delete(this.livePreviewId);
    }
    this.livePreviewId = null;
  }

  /**
   * Handle press event - prepare for potential click or drag
   */
  onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent): void => {
    if (!this.enabled) return;

    // Always prevent default when tool is active to stop panning
    (evt as any).preventDefaultAction = true;
  };

  /**
   * Handle drag event - update live preview as mouse moves
   */
  onCanvasDrag = (evt: OpenSeadragon.CanvasDragEvent): void => {
    if (!this.enabled || !this.viewer || this.state !== 'drawing') return;

    const { originalEvent } = evt as any;
    this.currentMousePos = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);
    this.updateLivePreview();

    (evt as any).preventDefaultAction = true;
  };

  /**
   * Handle click event - select annotation and start drawing, or add vertex
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    if (this.state === 'idle') {
      // Select an annotation and immediately start drawing the split line
      const hitAnnotation = this.checkAnnotationHit(clickPoint);

      if (hitAnnotation) {
        this.targetAnnotation = hitAnnotation;
        this.splitLinePoints = [clickPoint];
        this.state = 'drawing';
        this.selectAnnotation(hitAnnotation.id);
        this.updatePreviewLine();
        console.log('[SplitTool] Drawing split line. Click to add vertices, double-click or Enter to split.');
      }
    } else if (this.state === 'drawing') {
      // Check if we clicked on a different annotation
      const hitAnnotation = this.checkAnnotationHit(clickPoint);

      if (hitAnnotation && hitAnnotation.id !== this.targetAnnotation?.id) {
        // Clicked on a different annotation - cancel current operation and start new one
        console.log('[SplitTool] Switching to different annotation');
        this.removePreviewLine();
        this.removeLivePreview();
        this.targetAnnotation = hitAnnotation;
        this.splitLinePoints = [clickPoint];
        this.state = 'drawing';
        this.selectAnnotation(hitAnnotation.id);
        this.updatePreviewLine();
        console.log('[SplitTool] Drawing split line on new annotation. Click to add vertices, double-click or Enter to split.');
      } else {
        // Add point to split line
        this.splitLinePoints.push(clickPoint);
        this.updatePreviewLine();
        console.log(`[SplitTool] Added vertex ${this.splitLinePoints.length}`);

        // Check for double-click to complete (if very close to previous point)
        if (this.splitLinePoints.length >= 2) {
          const lastTwo = this.splitLinePoints.slice(-2);
          const dx = lastTwo[1].x - lastTwo[0].x;
          const dy = lastTwo[1].y - lastTwo[0].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If double-clicked (distance < 5 pixels in image space)
          if (dist < 5) {
            // Remove duplicate point
            this.splitLinePoints.pop();
            console.log('[SplitTool] Double-click detected, executing split...');
            this.completeSplit();
            return;
          }
        }
      }
    }

    if (this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle key events
   */
  onKeyDown = (evt: KeyboardEvent): void => {
    if (!this.enabled) return;

    if (evt.key === 'Enter') {
      // Complete split with Enter key
      if (this.state === 'drawing' && this.splitLinePoints.length >= 2) {
        evt.preventDefault();
        this.completeSplit();
      }
    } else if (evt.key === 'Escape') {
      // Cancel split
      evt.preventDefault();
      this.cancel();
    }
  };

  /**
   * Start drawing the split line
   */
  startDrawing(firstPoint: Point): void {
    if (!this.targetAnnotation) return;

    this.state = 'drawing';
    this.splitLinePoints = [firstPoint];
  }

  /**
   * Complete the split operation
   */
  private completeSplit(): void {
    if (!this.annotator || !this.targetAnnotation || this.splitLinePoints.length < 2) {
      this.cancel();
      return;
    }

    // Check if annotation can be split
    if (!canSplitAnnotation(this.targetAnnotation)) {
      console.error('[SplitTool] Cannot split annotation of type:', this.targetAnnotation.shape.type);
      this.cancel();
      return;
    }

    // Perform split operation
    const splitPieces = splitAnnotation(this.targetAnnotation, this.splitLinePoints);

    if (!splitPieces || splitPieces.length < 2) {
      console.error('[SplitTool] Split operation failed or did not divide annotation');
      this.cancel();
      return;
    }

    // Remove preview line before executing split
    this.removePreviewLine();

    // Execute split command through history
    const command = new SplitCommand(
      this.annotator.state.store,
      this.targetAnnotation,
      splitPieces
    );
    this.annotator.state.history.execute(command);

    // Select the first split piece
    if (splitPieces.length > 0) {
      this.selectAnnotation(splitPieces[0].id);
    }

    // Reset state
    this.reset();
  }

  /**
   * Cancel the current split operation
   */
  private cancel(): void {
    this.removePreviewLine();
    this.removeLivePreview();
    this.reset();
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'idle';
    this.targetAnnotation = null;
    this.splitLinePoints = [];
    this.currentMousePos = null;
  }

  /**
   * Initialize the tool
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);

    // Add keyboard event listener
    const canvas = viewer.canvas;
    if (canvas) {
      canvas.addEventListener('keydown', this.onKeyDown);
    }
  }

  /**
   * Destroy the tool
   */
  destroy(): void {
    // Remove keyboard event listener
    if (this.viewer?.canvas) {
      this.viewer.canvas.removeEventListener('keydown', this.onKeyDown);
    }

    this.reset();
    super.destroy();
  }

  /**
   * Get current split line for rendering (if needed for visual feedback)
   */
  getSplitLine(): Point[] {
    return this.splitLinePoints;
  }

  /**
   * Get target annotation (if needed for highlighting)
   */
  getTargetAnnotation(): Annotation | null {
    return this.targetAnnotation;
  }
}
