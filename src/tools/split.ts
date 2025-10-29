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
 * Tool for splitting annotations with a simple 2-point line
 *
 * Workflow:
 * 1. Select an annotation (before activating tool)
 * 2. Activate split tool
 * 3. Click to set start point of split line
 * 4. Move mouse - line follows cursor
 * 5. Click to set end point and execute split immediately
 * 6. Tool auto-exits to pan mode
 *
 * Features:
 * - Orange line shows where the split will occur
 * - Line follows mouse movement
 * - Second click executes split
 * - Press Escape to cancel
 */
export class SplitTool extends BaseTool {
  private state: 'idle' | 'drawing' = 'idle';
  private targetAnnotation: Annotation | null = null;
  private startPoint: Point | null = null;
  private currentMousePos: Point | null = null;
  private previewLineId: string | null = null;

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
    if (!this.annotator || !this.startPoint || !this.currentMousePos) return;

    const store = this.annotator.state.store;

    // Remove old preview line if exists
    if (this.previewLineId) {
      const existing = store.get(this.previewLineId);
      if (existing) {
        store.delete(this.previewLineId);
      }
    }

    // Create new preview line annotation from start to current mouse position
    this.previewLineId = `split-line-${Date.now()}`;

    const minX = Math.min(this.startPoint.x, this.currentMousePos.x);
    const minY = Math.min(this.startPoint.y, this.currentMousePos.y);
    const maxX = Math.max(this.startPoint.x, this.currentMousePos.x);
    const maxY = Math.max(this.startPoint.y, this.currentMousePos.y);

    const previewAnnotation: Annotation = {
      id: this.previewLineId,
      shape: {
        type: 'freehand',
        points: [this.startPoint, this.currentMousePos],
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
   * Handle press event - prevent default to stop panning
   */
  onCanvasPress = (evt: OpenSeadragon.CanvasPressEvent): void => {
    if (!this.enabled) return;
    // Always prevent default when tool is active to stop panning
    (evt as any).preventDefaultAction = true;
  };

  /**
   * Handle mouse move event - update line preview during movement
   */
  private onMouseMove = (evt: MouseEvent): void => {
    if (!this.enabled || !this.viewer) return;

    // Get mouse position relative to viewer element
    const rect = this.viewer.element.getBoundingClientRect();
    const offsetX = evt.clientX - rect.left;
    const offsetY = evt.clientY - rect.top;

    this.currentMousePos = this.viewerToImageCoords(offsetX, offsetY);

    // Update preview line if we're in drawing mode
    if (this.state === 'drawing' && this.startPoint) {
      this.updatePreviewLine();
    }
  };

  /**
   * Handle click event - set start point or end point
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    if (this.state === 'idle') {
      // First click: get target annotation and set start point
      // Check if there's already a selected annotation we can use
      const selectedIds = this.annotator.state.selection.getSelected();
      let targetToUse: Annotation | null = null;

      if (selectedIds.length === 1) {
        const selectedAnnotation = this.annotator.state.store.get(selectedIds[0]);
        if (selectedAnnotation && canSplitAnnotation(selectedAnnotation)) {
          targetToUse = selectedAnnotation;
          console.log('[SplitTool] Using already-selected annotation');
        }
      }

      // If no suitable selected annotation, check if we clicked on one
      if (!targetToUse) {
        targetToUse = this.checkAnnotationHit(clickPoint);
      }

      if (targetToUse) {
        this.targetAnnotation = targetToUse;
        this.startPoint = clickPoint;
        this.currentMousePos = clickPoint;
        this.state = 'drawing';
        this.selectAnnotation(targetToUse.id);
        console.log('[SplitTool] Start point set. Move mouse and click to set end point.');
      }
    } else if (this.state === 'drawing') {
      // Second click: execute split immediately
      console.log('[SplitTool] End point set, executing split...');
      this.completeSplit(clickPoint);
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
      if (this.state === 'drawing' && this.startPoint && this.currentMousePos) {
        evt.preventDefault();
        this.completeSplit(this.currentMousePos);
      }
    } else if (evt.key === 'Escape') {
      // Cancel split
      evt.preventDefault();
      this.cancel();
    }
  };

  /**
   * Complete the split operation
   */
  private completeSplit(endPoint: Point): void {
    if (!this.annotator || !this.targetAnnotation || !this.startPoint) {
      this.cancel();
      return;
    }

    // Check if annotation can be split
    if (!canSplitAnnotation(this.targetAnnotation)) {
      console.error('[SplitTool] Cannot split annotation of type:', this.targetAnnotation.shape.type);
      this.cancel();
      return;
    }

    // Create split line with start and end points
    const splitLine = [this.startPoint, endPoint];

    // Perform split operation
    const splitPieces = splitAnnotation(this.targetAnnotation, splitLine);

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

    console.log('[SplitTool] Split completed successfully');

    // Select the first split piece
    if (splitPieces.length > 0) {
      this.selectAnnotation(splitPieces[0].id);
    }

    // Reset state for next split
    this.reset();
  }

  /**
   * Cancel the current split operation
   */
  private cancel(): void {
    console.log('[SplitTool] Split cancelled');
    this.removePreviewLine();
    this.reset();
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'idle';
    this.targetAnnotation = null;
    this.startPoint = null;
    this.currentMousePos = null;
  }

  /**
   * Initialize the tool
   */
  init(viewer: OpenSeadragon.Viewer, annotator: any): void {
    super.init(viewer, annotator);

    // Add keyboard and mouse event listeners
    const canvas = viewer.canvas;
    if (canvas) {
      canvas.addEventListener('keydown', this.onKeyDown);
    }

    // Add mouse move listener to the viewer element
    if (viewer.element) {
      viewer.element.addEventListener('mousemove', this.onMouseMove);
    }
  }

  /**
   * Destroy the tool
   */
  destroy(): void {
    // Remove keyboard and mouse event listeners
    if (this.viewer?.canvas) {
      this.viewer.canvas.removeEventListener('keydown', this.onKeyDown);
    }

    if (this.viewer?.element) {
      this.viewer.element.removeEventListener('mousemove', this.onMouseMove);
    }

    this.reset();
    super.destroy();
  }

  /**
   * Get current split line for debugging
   */
  getSplitLine(): Point[] {
    if (this.startPoint && this.currentMousePos) {
      return [this.startPoint, this.currentMousePos];
    }
    return [];
  }

  /**
   * Get target annotation (if needed for highlighting)
   */
  getTargetAnnotation(): Annotation | null {
    return this.targetAnnotation;
  }
}
