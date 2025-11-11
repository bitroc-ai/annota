/**
 * SAM (Segment Anything Model) tool for browser-based interactive segmentation
 *
 * This tool allows users to click on objects and instantly generate polygon annotations
 * using Meta's SAM model running entirely in the browser via ONNX Runtime Web.
 */

import type * as ort from 'onnxruntime-web';
import { BaseTool } from './base';
import type { ToolHandlerOptions } from './types';
import { SamOnnxModel } from '../ml/sam-onnx';
import { loadMaskPolygons } from '../loaders/masks';
import type { Annotation } from '../core/types';

/**
 * Configuration for SAM tool
 */
export interface SamToolOptions extends ToolHandlerOptions {
  /** URL to the SAM decoder ONNX model */
  decoderModelUrl: string;

  /** Precomputed image embedding tensor [1, 256, 64, 64] */
  embedding: ort.Tensor;

  /** Original image dimensions */
  imageWidth: number;
  imageHeight: number;

  /** Show hover preview of detected object (default: true) */
  showHoverPreview?: boolean;

  /** Opacity for hover preview (default: 0.5) */
  previewOpacity?: number;

  /** Default properties to apply to created annotations */
  annotationProperties?: Partial<Annotation>;

  /** Callback when annotation is created */
  onAnnotationCreated?: (annotation: Annotation) => void;

  /** Callback when prediction starts */
  onPredictionStart?: () => void;

  /** Callback when prediction completes */
  onPredictionComplete?: (iouScore: number) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

/**
 * SAM tool for interactive segmentation
 *
 * @example
 * ```typescript
 * const samTool = new SamTool({
 *   decoderModelUrl: '/models/sam_vit_h_decoder.onnx',
 *   embedding: precomputedEmbedding,
 *   imageWidth: 1024,
 *   imageHeight: 1024,
 *   annotationProperties: {
 *     classification: 'positive',
 *     properties: { source: 'sam-onnx' }
 *   }
 * });
 *
 * await samTool.initializeModel();
 * annotator.setTool(samTool);
 * ```
 */
export class SamTool extends BaseTool {
  private model: SamOnnxModel;
  private samOptions: Required<
    Omit<
      SamToolOptions,
      keyof ToolHandlerOptions | 'annotationProperties' | 'onAnnotationCreated' | 'onPredictionStart' | 'onPredictionComplete' | 'onError'
    >
  > & {
    annotationProperties?: Partial<Annotation>;
    onAnnotationCreated?: (annotation: Annotation) => void;
    onPredictionStart?: () => void;
    onPredictionComplete?: (iouScore: number) => void;
    onError?: (error: Error) => void;
  };
  private isPredicting = false;
  private previewOverlay: HTMLElement | null = null;
  private previewThrottleTimer: number | null = null;
  private lastPreviewTime = 0;

  constructor(options: SamToolOptions) {
    super('sam', options);

    this.samOptions = {
      decoderModelUrl: options.decoderModelUrl,
      embedding: options.embedding,
      imageWidth: options.imageWidth,
      imageHeight: options.imageHeight,
      showHoverPreview: options.showHoverPreview ?? true,
      previewOpacity: options.previewOpacity ?? 0.5,
      annotationProperties: options.annotationProperties,
      onAnnotationCreated: options.onAnnotationCreated,
      onPredictionStart: options.onPredictionStart,
      onPredictionComplete: options.onPredictionComplete,
      onError: options.onError,
    };

    this.model = new SamOnnxModel({
      decoderModelUrl: this.samOptions.decoderModelUrl,
    });
  }

  /**
   * Initialize the SAM model (must be called before use)
   */
  async initializeModel(): Promise<void> {
    try {
      await this.model.initialize();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.samOptions.onError?.(err);
      throw err;
    }
  }

  /**
   * Check if model is initialized
   */
  isModelInitialized(): boolean {
    return this.model.isInitialized();
  }

  /**
   * Update the image embedding (when switching images)
   */
  setEmbedding(
    embedding: ort.Tensor,
    imageWidth: number,
    imageHeight: number
  ): void {
    this.samOptions.embedding = embedding;
    this.samOptions.imageWidth = imageWidth;
    this.samOptions.imageHeight = imageHeight;
  }

  protected attachEventHandlers(): void {
    super.attachEventHandlers();

    // Attach hover preview handler if enabled
    if (this.samOptions.showHoverPreview && this.viewer) {
      this.viewer.addHandler('canvas-drag', this.onCanvasMove);
      this.viewer.addHandler('canvas-exit', this.onCanvasExit);
    }
  }

  protected detachEventHandlers(): void {
    super.detachEventHandlers();

    // Remove hover preview handlers
    if (this.samOptions.showHoverPreview && this.viewer) {
      this.viewer.removeHandler('canvas-drag', this.onCanvasMove);
      this.viewer.removeHandler('canvas-exit', this.onCanvasExit);
    }

    // Clean up preview overlay
    this.removePreviewOverlay();

    // Clear throttle timer
    if (this.previewThrottleTimer !== null) {
      clearTimeout(this.previewThrottleTimer);
      this.previewThrottleTimer = null;
    }
  }

  /**
   * Handle canvas click to create segmentation
   */
  async onCanvasClick(evt: any): Promise<void> {
    if (!this.annotator || !this.viewer || this.isPredicting) {
      return;
    }

    // Check if model is initialized
    if (!this.isModelInitialized()) {
      const err = new Error('Model not initialized. Call initialize() first.');
      this.samOptions.onError?.(err);
      console.error('SAM prediction failed:', err.message);
      return;
    }

    // Prevent default OpenSeadragon behavior
    if (this.options.preventDefaultAction && evt.preventDefaultAction !== undefined) {
      evt.preventDefaultAction = true;
    }

    // Convert to image coordinates
    const imageCoords = this.viewerToImageCoords(
      evt.position?.x || 0,
      evt.position?.y || 0
    );

    // Check if clicking on existing annotation
    const hitAnnotation = this.checkAnnotationHit(imageCoords);
    if (hitAnnotation) {
      // Don't create new annotation, let user interact with existing one
      return;
    }

    // Run SAM prediction
    await this.predictAndCreateAnnotation(imageCoords.x, imageCoords.y);
  }

  /**
   * Run SAM prediction and create annotation
   */
  private async predictAndCreateAnnotation(
    clickX: number,
    clickY: number
  ): Promise<void> {
    if (!this.annotator || this.isPredicting) {
      return;
    }

    this.isPredicting = true;
    this.samOptions.onPredictionStart?.();

    try {
      // Run SAM inference
      const result = await this.model.predict({
        embedding: this.samOptions.embedding,
        clickX,
        clickY,
        imageWidth: this.samOptions.imageWidth,
        imageHeight: this.samOptions.imageHeight,
      });

      this.samOptions.onPredictionComplete?.(result.iouScore);

      // Convert mask blob to URL
      const blobUrl = URL.createObjectURL(result.maskBlob);

      try {
        // Use existing mask loader to create polygon annotations
        const annotations = await loadMaskPolygons(blobUrl, {
          maskType: 'binary',
        });

        if (annotations.length > 0) {
          // Apply custom properties if provided
          const annotation = annotations[0];
          if (this.samOptions.annotationProperties) {
            Object.assign(annotation, this.samOptions.annotationProperties);
          }

          // Add metadata about SAM prediction
          annotation.properties = {
            ...annotation.properties,
            source: 'sam-onnx',
            iouScore: result.iouScore,
            clickPoint: { x: clickX, y: clickY },
          };

          // Add to annotator
          this.annotator.state.store.add(annotation);

          // Select the new annotation
          this.selectAnnotation(annotation.id);

          // Trigger callback
          this.samOptions.onAnnotationCreated?.(annotation);
        }
      } finally {
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.samOptions.onError?.(err);
      console.error('SAM prediction failed:', err);
    } finally {
      this.isPredicting = false;
    }
  }

  /**
   * Handle mouse move for hover preview (throttled)
   */
  private onCanvasMove = (evt: any): void => {
    if (!this.samOptions.showHoverPreview || !this.isModelInitialized()) {
      return;
    }

    // Throttle to 15ms like the SAM demo
    const now = Date.now();
    if (now - this.lastPreviewTime < 15) {
      return;
    }
    this.lastPreviewTime = now;

    // Convert to image coordinates
    const imageCoords = this.viewerToImageCoords(
      evt.position?.x || 0,
      evt.position?.y || 0
    );

    // Run preview prediction (non-blocking)
    this.showPreview(imageCoords.x, imageCoords.y);
  };

  /**
   * Handle canvas exit to clear preview
   */
  private onCanvasExit = (): void => {
    this.removePreviewOverlay();
  };

  /**
   * Show hover preview at coordinates
   */
  private async showPreview(x: number, y: number): Promise<void> {
    if (!this.annotator || this.isPredicting) {
      return;
    }

    try {
      // Run SAM inference
      const result = await this.model.predict({
        embedding: this.samOptions.embedding,
        clickX: x,
        clickY: y,
        imageWidth: this.samOptions.imageWidth,
        imageHeight: this.samOptions.imageHeight,
      });

      // Convert mask blob to image element
      const blobUrl = URL.createObjectURL(result.maskBlob);
      const img = new Image();

      img.onload = () => {
        // Update or create preview overlay
        if (!this.previewOverlay) {
          this.previewOverlay = document.createElement('img');
          this.previewOverlay.style.position = 'absolute';
          this.previewOverlay.style.top = '0';
          this.previewOverlay.style.left = '0';
          this.previewOverlay.style.width = '100%';
          this.previewOverlay.style.height = '100%';
          this.previewOverlay.style.pointerEvents = 'none';
          this.previewOverlay.style.opacity = String(this.samOptions.previewOpacity);

          // Add to viewer canvas
          const canvas = this.viewer?.canvas;
          if (canvas && canvas.parentElement) {
            canvas.parentElement.appendChild(this.previewOverlay);
          }
        }

        (this.previewOverlay as HTMLImageElement).src = img.src;
        URL.revokeObjectURL(blobUrl);
      };

      img.src = blobUrl;
    } catch (error) {
      // Silently fail for preview errors
      console.warn('Preview prediction failed:', error);
    }
  }

  /**
   * Remove preview overlay
   */
  private removePreviewOverlay(): void {
    if (this.previewOverlay && this.previewOverlay.parentNode) {
      this.previewOverlay.parentNode.removeChild(this.previewOverlay);
      this.previewOverlay = null;
    }
  }

  /**
   * Clean up resources
   */
  override destroy(): void {
    super.destroy();
    this.model.dispose();
    this.removePreviewOverlay();
  }
}
