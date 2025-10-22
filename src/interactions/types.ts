/**
 * Interaction types and interfaces for Annota
 */

import type OpenSeadragon from 'openseadragon';
import type { OpenSeadragonAnnotator as Annotator } from '../adapters/openseadragon/annotator';
import type { Annotation } from '../core/types';

/**
 * Tool types supported by the framework
 */
export type ToolType = 'pan' | 'point' | 'push' | 'move' | 'cell-detect';

/**
 * Base interface for all interaction handlers
 */
export interface InteractionHandler {
  /** Unique identifier for this handler */
  readonly id: string;

  /** Whether this handler is currently enabled */
  enabled: boolean;

  /** Initialize the handler with viewer and annotator */
  init(viewer: OpenSeadragon.Viewer, annotator: Annotator): void;

  /** Cleanup the handler */
  destroy(): void;

  /** Handle canvas click events */
  onCanvasClick?(evt: OpenSeadragon.ViewerEvent): void;

  /** Handle canvas press events (mouse down) */
  onCanvasPress?(evt: OpenSeadragon.ViewerEvent): void;

  /** Handle canvas drag events */
  onCanvasDrag?(evt: OpenSeadragon.ViewerEvent): void;

  /** Handle canvas release events (mouse up) */
  onCanvasRelease?(evt: OpenSeadragon.ViewerEvent): void;
}

/**
 * Configuration options for tool handlers
 */
export interface ToolHandlerOptions {
  /** Whether to prevent default zoom/pan on interaction */
  preventDefaultAction?: boolean;

  /** Whether to check for annotation hits before performing tool action */
  checkAnnotationHits?: boolean;

  /** Custom style for newly created annotations */
  annotationStyle?: Partial<Annotation['style']>;

  /** Custom properties for newly created annotations (e.g., layer assignment) */
  annotationProperties?: Record<string, any>;
}

/**
 * Options for the push tool
 */
export interface PushToolOptions extends ToolHandlerOptions {
  /** Radius of influence for pushing vertices (in image coordinates) */
  pushRadius: number;

  /** Strength of the push effect (0-1) */
  pushStrength?: number;

  /** Whether to show cursor circle overlay */
  showCursor?: boolean;
}

/**
 * Options for the cell detection tool
 */
export interface CellDetectOptions extends ToolHandlerOptions {
  /** OpenCV instance */
  cv: any;

  /** Tile source for fetching image data */
  tileSource: OpenSeadragon.TileSource;

  /** Edge detection threshold */
  threshold?: number;
}

/**
 * Options for the move tool
 */
export interface MoveToolOptions extends ToolHandlerOptions {
  /** Whether to move all selected annotations or just one */
  moveAllSelected?: boolean;
}
