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
 * 1. Click on annotation to select it for splitting
 * 2. Click to draw split line vertices
 * 3. Double-click or Enter to execute split
 * 4. Escape to cancel
 */
export class SplitTool extends BaseTool {
  private state: 'idle' | 'selected' | 'drawing' = 'idle';
  private targetAnnotation: Annotation | null = null;
  private splitLinePoints: Point[] = [];

  constructor(options: ToolHandlerOptions = {}) {
    super('split', {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    });
  }

  /**
   * Handle click event - select annotation or add split line vertex
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    if (this.state === 'idle' || this.state === 'selected') {
      // Check if click hit an annotation
      const hitAnnotation = this.checkAnnotationHit(clickPoint);

      if (hitAnnotation) {
        // Select annotation for splitting
        this.targetAnnotation = hitAnnotation;
        this.splitLinePoints = [];
        this.state = 'selected';
        this.selectAnnotation(hitAnnotation.id);
      }
    } else if (this.state === 'drawing') {
      // Add point to split line
      this.splitLinePoints.push(clickPoint);

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
          this.completeSplit();
          return;
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
    this.reset();
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'idle';
    this.targetAnnotation = null;
    this.splitLinePoints = [];
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
