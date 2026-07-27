/**
 * Split Tool - Cut annotations into multiple pieces with a line
 */

import OpenSeadragon from 'openseadragon';
import type { Annotation, Point } from '../core/types';
import type { ToolMutationTransaction } from '../adapters/openseadragon/annotator';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';
import { splitAnnotation, canSplitAnnotation } from '../core/operations';
import { isAnnotationEditable } from '../core/layer';

/**
 * Tool for splitting annotations with a polyline (折线)
 *
 * Workflow:
 * 1. Activate split tool
 * 2. Click to add points to the split line
 * 3. Double-click or press Enter to execute split
 * 4. All intersecting, editable annotations are split
 *
 * Features:
 * - Polyline support (multiple segments)
 * - Batch splitting (cuts through all layers)
 * - Visual preview of the cutting line
 * - Notifications for success/failure
 * - Disables selection while drawing
 */
export class SplitTool extends BaseTool {
  private state: 'idle' | 'drawing' = 'idle';
  private points: Point[] = [];
  private currentMousePos: Point | null = null;
  private previewLineId: string | null = null;
  private transaction: ToolMutationTransaction | null = null;

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
    if (
      !this.annotator ||
      !this.transaction ||
      !this.previewLineId ||
      this.points.length === 0 ||
      !this.currentMousePos
    ) return;

    // Combine established points with current mouse position
    const previewPoints = [...this.points, this.currentMousePos];

    const previewAnnotation = {
      id: this.previewLineId,
      shape: {
        type: 'freehand' as const,
        points: previewPoints,
        closed: false,
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

    if (this.annotator.annotations.get(this.previewLineId)) {
      this.transaction.update(this.previewLineId, {
        shape: previewAnnotation.shape,
        style: previewAnnotation.style,
        properties: previewAnnotation.properties,
      });
    } else {
      this.transaction.add(previewAnnotation);
    }
  }

  /**
   * Remove the preview line
   */
  private removePreviewLine(): void {
    if (!this.annotator || !this.transaction || !this.previewLineId) return;

    if (this.annotator.annotations.get(this.previewLineId)) {
      this.transaction.remove(this.previewLineId);
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
    if (this.state === 'drawing') {
      this.updatePreviewLine();
    }
  };

  /**
   * Handle click event - add point to split line
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(originalEvent.offsetX, originalEvent.offsetY);

    if (this.state === 'idle') {
      // First point
      this.state = 'drawing';
      this.points = [clickPoint];
      this.currentMousePos = clickPoint;
      this.transaction = this.annotator.tools.beginTransaction();
      this.previewLineId = `split-preview-${this.transaction.id}`;

      // Disable selection while drawing
      this.annotator.unsafeState.toolDrawing.active = true;

      console.log('[SplitTool] Started drawing split line.');
    } else {
      // Add subsequent points
      this.points.push(clickPoint);
      this.currentMousePos = clickPoint;
      this.updatePreviewLine();
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
      if (this.state === 'drawing' && this.points.length > 0) {
        evt.preventDefault();
        // If mouse position is different from last point, include it?
        // Standard behavior is usually just established points + current cursor if desirable,
        // but for polyline tools usually valid points are clicks. 
        // Let's use established points.
        if (this.points.length < 2 && this.currentMousePos) {
          // If only 1 point, use current mouse pos as second point
          this.points.push(this.currentMousePos);
        }
        this.completeSplit();
      }
    } else if (evt.key === 'Escape') {
      // Cancel split
      evt.preventDefault();
      this.cancel();
    }
  };

  /**
   * Handle double click - finish split
   */
  // Note: OpenSeadragon doesn't have a native 'canvas-double-click' event exposed easily in the same way,
  // but we can listen to the canvas element directly or use the click count.
  // However, BaseTool doesn't wrap dblclick. We'll add a listener in init.
  private onDoubleClick = (evt: MouseEvent): void => {
    if (!this.enabled || this.state !== 'drawing') return;

    evt.preventDefault();
    evt.stopPropagation();

    // Add the double click location as final point?
    // Usually double click fires two clicks, so points might already be added.
    // Let's just complete.
    this.completeSplit();
  };


  /**
   * Complete the split operation
   */
  private completeSplit(): void {
    const annotator = this.annotator;
    if (!annotator) return;

    // Handle 1-point case
    if (this.points.length < 2) {
      if (this.points.length === 1 && this.currentMousePos) {
        this.points.push(this.currentMousePos);
      } else {
        this.emitNotification('Need at least 2 points to split', 'warning');
        this.cancel();
        return;
      }
    }

    // Deduplicate points (remove consecutive identical points)
    const uniquePoints: Point[] = [];
    if (this.points.length > 0) {
      uniquePoints.push(this.points[0]);
      for (let i = 1; i < this.points.length; i++) {
        const prev = uniquePoints[uniquePoints.length - 1];
        const curr = this.points[i];
        if (Math.abs(curr.x - prev.x) > 1e-6 || Math.abs(curr.y - prev.y) > 1e-6) {
          uniquePoints.push(curr);
        }
      }
    }

    // Check if we have enough points after deduplication
    if (uniquePoints.length < 2) {
      if (uniquePoints.length === 1 && this.currentMousePos) {
        // If we have 1 valid point and a current mouse pos, use that
        // But check if current mouse pos is same as the one point
        const last = uniquePoints[0];
        const curr = this.currentMousePos;
        if (Math.abs(curr.x - last.x) > 1e-6 || Math.abs(curr.y - last.y) > 1e-6) {
          uniquePoints.push(curr);
        } else {
          this.emitNotification('Need at least 2 distinct points to split', 'warning');
          this.cancel();
          return;
        }
      } else {
        this.emitNotification('Need at least 2 distinct points to split', 'warning');
        this.cancel();
        return;
      }
    }

    // Calculate bounding box of the split line for querying
    let minX = uniquePoints[0].x;
    let minY = uniquePoints[0].y;
    let maxX = uniquePoints[0].x;
    let maxY = uniquePoints[0].y;

    for (const p of uniquePoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Expand bounds slightly to catch touching edges
    const buffer = 1;
    const searchBounds = {
      minX: minX - buffer,
      minY: minY - buffer,
      maxX: maxX + buffer,
      maxY: maxY + buffer,
    };

    // Find candidate annotations
    const candidates = annotator.spatial.search(searchBounds);
    const splitOps: Array<{ original: Annotation, pieces: Annotation[] }> = [];

    const layerManager = annotator.unsafeState.layerManager;

    for (const candidate of candidates) {
      // check editability
      if (!isAnnotationEditable(candidate, layerManager)) continue;

      // check if splittable (must be polygon-like)
      if (!canSplitAnnotation(candidate)) continue;

      // Attempt split
      // splitAnnotation in operations.ts supports polyline if createLineBuffer supports it.
      // We verified createLineBuffer supports multiple segments.
      const pieces = splitAnnotation(candidate, uniquePoints);

      if (pieces && pieces.length > 1) {
        splitOps.push({ original: candidate, pieces });
      }
    }

    if (splitOps.length === 0) {
      this.emitNotification('No annotations split', 'warning');
      this.cancel();
      return;
    }

    const transaction = this.transaction;
    if (!transaction) {
      this.cancel();
      return;
    }
    const newSelection: string[] = [];

    this.removePreviewLine();
    for (const op of splitOps) {
      transaction.remove(op.original.id);
      op.pieces.forEach(piece => {
        const created = transaction.add({
          ...piece,
          layerId: op.original.layerId,
        });
        newSelection.push(created.id);
      });
    }
    transaction.commit();
    this.transaction = null;

    // Success notification
    this.emitNotification(`Split ${splitOps.length} annotation${splitOps.length > 1 ? 's' : ''}`, 'success');

    // Select new pieces
    annotator.selection.set(newSelection, {
      source: 'tool',
      transactionId: transaction.id,
    });

    // Reset state for next split
    this.reset();
  }

  private emitNotification(message: string, type: 'success' | 'warning' | 'error' | 'info'): void {
    if (this.annotator) {
      this.annotator.emit('notification', { message, type });
    }
  }

  /**
   * Cancel the current split operation
   */
  private cancel(): void {
    console.log('[SplitTool] Split cancelled');
    this.transaction?.cancel();
    this.transaction = null;
    this.reset();
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'idle';
    this.points = [];
    this.currentMousePos = null;
    this.previewLineId = null;

    // Re-enable external selection
    if (this.annotator) {
      this.annotator.unsafeState.toolDrawing.active = false;
    }
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
      canvas.addEventListener('dblclick', this.onDoubleClick);
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
      this.viewer.canvas.removeEventListener('dblclick', this.onDoubleClick);
    }

    if (this.viewer?.element) {
      this.viewer.element.removeEventListener('mousemove', this.onMouseMove);
    }

    if (this.transaction) this.cancel();
    else this.reset();
    super.destroy();
  }

  /**
   * Get current split line for debugging
   */
  getSplitLine(): Point[] {
    return this.points;
  }
}
