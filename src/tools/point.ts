/**
 * Point Tool - Add point annotations by clicking
 */

import OpenSeadragon from "openseadragon";
import type { Annotation } from "../core/types";
import { calculateBounds } from "../core/types";
import { BaseTool } from "./base";
import type { ToolHandlerOptions } from "./types";

/**
 * Tool for adding point annotations
 */
export class PointTool extends BaseTool {
  constructor(options: ToolHandlerOptions = {}) {
    super("point", {
      preventDefaultAction: true,
      checkAnnotationHits: true,
      // Don't set default style - let global style function handle it
      ...options,
    });
  }

  /**
   * Handle press event - prevent panning
   */
  onCanvasPress = (evt: OpenSeadragon.ViewerEvent): void => {
    // IMPORTANT: Set preventDefaultAction to stop OpenSeadragon panning
    if (this.enabled && this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }
  };

  /**
   * Handle click event - add new point or select existing annotation
   */
  onCanvasClick = (evt: OpenSeadragon.ViewerEvent): void => {
    // IMPORTANT: Set preventDefaultAction FIRST to stop OpenSeadragon default click behavior
    if (this.enabled && this.options.preventDefaultAction) {
      (evt as any).preventDefaultAction = true;
    }

    if (!this.enabled || !this.viewer || !this.annotator) return;

    const { originalEvent } = evt as any;

    // Get click point in image coordinates
    const clickPoint = this.viewerToImageCoords(
      originalEvent.offsetX,
      originalEvent.offsetY
    );

    // Check if click hit an existing annotation
    const hitAnnotation = this.checkAnnotationHit(clickPoint);

    if (hitAnnotation) {
      // Let selection system handle this
      return;
    }

    // Add new point annotation
    const annotation: Annotation = {
      id: `point-${Date.now()}`,
      shape: {
        type: "point",
        point: clickPoint,
        bounds: calculateBounds({
          type: "point",
          point: clickPoint,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        }),
      },
      style: this.options.annotationStyle,
      properties: this.options.annotationProperties || {},
    };

    this.annotator.addAnnotation(annotation);

    // Select the newly created annotation
    this.selectAnnotation(annotation.id);
  };
}
