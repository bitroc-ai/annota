/**
 * Base class for interaction handlers
 */

import OpenSeadragon from 'openseadragon';
import type { OpenSeadragonAnnotator as Annotator } from '../adapters/openseadragon/annotator';
import type { Annotation } from '../core/types';
import { isAnnotationEditable } from '../core/layer';
import type { ToolHandler, ToolHandlerOptions } from './types';

/**
 * Abstract base class for all interaction handlers
 */
export abstract class BaseTool implements ToolHandler {
  readonly id: string;
  enabled: boolean = false;

  protected viewer?: OpenSeadragon.Viewer;
  protected annotator?: Annotator;
  protected options: ToolHandlerOptions;

  constructor(id: string, options: ToolHandlerOptions = {}) {
    this.id = id;
    this.options = {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      ...options,
    };
  }

  /**
   * Initialize the handler with viewer and annotator
   */
  init(viewer: OpenSeadragon.Viewer, annotator: Annotator): void {
    this.viewer = viewer;
    this.annotator = annotator;
    this.enabled = true;
    this.attachEventHandlers();
  }

  /**
   * Cleanup the handler
   */
  destroy(): void {
    this.detachEventHandlers();
    this.enabled = false;
    this.viewer = undefined;
    this.annotator = undefined;
  }

  /**
   * Attach OpenSeadragon event handlers
   */
  protected attachEventHandlers(): void {
    if (!this.viewer) return;

    if (this.onCanvasClick) {
      this.viewer.addHandler('canvas-click', this.onCanvasClick.bind(this));
    }
    if (this.onCanvasPress) {
      this.viewer.addHandler('canvas-press', this.onCanvasPress.bind(this));
    }
    if (this.onCanvasDrag) {
      this.viewer.addHandler('canvas-drag', this.onCanvasDrag.bind(this));
    }
    if (this.onCanvasRelease) {
      this.viewer.addHandler('canvas-release', this.onCanvasRelease.bind(this));
    }
  }

  /**
   * Detach OpenSeadragon event handlers
   */
  protected detachEventHandlers(): void {
    if (!this.viewer) return;

    if (this.onCanvasClick) {
      this.viewer.removeHandler('canvas-click', this.onCanvasClick.bind(this));
    }
    if (this.onCanvasPress) {
      this.viewer.removeHandler('canvas-press', this.onCanvasPress.bind(this));
    }
    if (this.onCanvasDrag) {
      this.viewer.removeHandler('canvas-drag', this.onCanvasDrag.bind(this));
    }
    if (this.onCanvasRelease) {
      this.viewer.removeHandler('canvas-release', this.onCanvasRelease.bind(this));
    }
  }

  /**
   * Check if a click point hits any existing annotation
   * Only returns annotations that are editable (not on locked layers)
   */
  protected checkAnnotationHit(clickPoint: { x: number; y: number }): Annotation | null {
    if (!this.annotator || !this.options.checkAnnotationHits) {
      return null;
    }

    const annotations = this.annotator.state.store.all();
    const layerManager = this.annotator.state.layerManager;

    return (
      annotations.find((ann: Annotation) => {
        // Skip annotations on locked layers
        if (layerManager && !isAnnotationEditable(ann, layerManager)) {
          return false;
        }

        // For point annotations, use a radius-based hit detection
        if (ann.shape.type === 'point') {
          const HIT_RADIUS = 10; // pixels in image coordinates
          const dx = clickPoint.x - ann.shape.point.x;
          const dy = clickPoint.y - ann.shape.point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= HIT_RADIUS;
        }

        // For other shapes, use bounds-based detection
        const { bounds } = ann.shape;
        return (
          clickPoint.x >= bounds.minX &&
          clickPoint.x <= bounds.maxX &&
          clickPoint.y >= bounds.minY &&
          clickPoint.y <= bounds.maxY
        );
      }) || null
    );
  }

  /**
   * Convert viewer element coordinates to image coordinates
   */
  protected viewerToImageCoords(offsetX: number, offsetY: number): { x: number; y: number } {
    if (!this.viewer) {
      return { x: 0, y: 0 };
    }

    const imageCoords = this.viewer.viewport.viewerElementToImageCoordinates(
      new OpenSeadragon.Point(offsetX, offsetY)
    );
    return { x: imageCoords.x, y: imageCoords.y };
  }

  // Optional event handlers (to be implemented by subclasses)
  onCanvasClick?(evt: OpenSeadragon.ViewerEvent): void;
  onCanvasPress?(evt: OpenSeadragon.ViewerEvent): void;
  onCanvasDrag?(evt: OpenSeadragon.ViewerEvent): void;
  onCanvasRelease?(evt: OpenSeadragon.ViewerEvent): void;
}
