/**
 * Interaction types and interfaces for Annota
 */

import type OpenSeadragon from 'openseadragon';
import type { OpenSeadragonAnnotator as Annotator } from '../adapters/openseadragon/annotator';
import type { Annotation } from '../core/types';

/**
 * Tool types supported by the framework
 */
export type ToolType = 'pan' | 'point' | 'push' | 'move' | 'contour';

/**
 * Base interface for all interaction handlers
 */
export interface ToolHandler {
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
 * Result from a contour detection algorithm
 */
export interface ContourDetectionResult {
  /** Detected contour boundary as polygon points */
  polygon: { x: number; y: number }[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Area in pixels */
  area: number;
  /** Additional metadata from the detector */
  metadata?: Record<string, any>;
}

/**
 * Custom contour detector function
 * Takes image data and click point, returns detected contour or null
 */
export type ContourDetector = (
  imageData: ImageData,
  clickPoint: { x: number; y: number },
  options?: Record<string, any>
) => ContourDetectionResult | null | Promise<ContourDetectionResult | null>;

/**
 * Options for the contour detection tool
 */
export interface ContourDetectOptions extends ToolHandlerOptions {
  /** OpenCV instance (optional if using custom detector) */
  cv?: any;

  /** Tile source for fetching image data (optional if using custom detector) */
  tileSource?: OpenSeadragon.TileSource;

  /** Edge detection threshold */
  threshold?: number;

  /**
   * Custom contour detector function
   * If not provided, will use built-in OpenCV flood fill detector
   */
  detector?: ContourDetector;

  /** Additional options to pass to the detector function */
  detectorOptions?: Record<string, any>;
}

/**
 * Options for the move tool
 */
export interface MoveToolOptions extends ToolHandlerOptions {
  /** Whether to move all selected annotations or just one */
  moveAllSelected?: boolean;
}

/**
 * Options for the curve tool
 */
export interface CurveToolOptions extends ToolHandlerOptions {
  /**
   * Smoothing tolerance for path simplification (Douglas-Peucker algorithm)
   * Lower values (0.5-2) = more vertices, follows drawn path closely
   * Higher values (3-10) = fewer vertices, smoother result
   * Default: 2
   */
  smoothingTolerance?: number;
}
