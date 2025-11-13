/**
 * SAM (Segment Anything Model) tool for browser-based interactive segmentation
 *
 * This tool allows users to click on objects and instantly generate polygon annotations
 * using Meta's SAM model running entirely in the browser via ONNX Runtime Web.
 */

import type * as ort from 'onnxruntime-web';
import OpenSeadragon from 'openseadragon';
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
  private previewCanvas: HTMLCanvasElement | null = null;
  private previewSeq = 0;
  private lastPreviewTime = 0;
  private hoverHandler: ((evt: MouseEvent) => void) | null = null;
  private lastPreviewResult: { maskBlob: Blob; x: number; y: number; iouScore: number } | null = null;

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
      const container = this.viewer.element;
      if (container) {
        this.hoverHandler = (evt: MouseEvent) => {
          const rect = container.getBoundingClientRect();
          const pixelX = evt.clientX - rect.left;
          const pixelY = evt.clientY - rect.top;
          const viewportPoint = this.viewer!.viewport.pointFromPixel(
            new OpenSeadragon.Point(pixelX, pixelY)
          );
          const imagePoint = this.viewer!.viewport.viewportToImageCoordinates(viewportPoint);
          this.onCanvasHover(imagePoint.x, imagePoint.y);
        };
        container.addEventListener('mousemove', this.hoverHandler);
      }
    }
  }

  protected detachEventHandlers(): void {
    super.detachEventHandlers();

    if (this.hoverHandler && this.viewer) {
      const container = this.viewer.element;
      if (container) {
        container.removeEventListener('mousemove', this.hoverHandler);
        this.hoverHandler = null;
      }
    }

    this.removePreview();
  }

  /**
   * Handle canvas click to create segmentation
   */
  async onCanvasClick(evt: any): Promise<void> {
    if (!this.annotator || !this.viewer || this.isPredicting) {
      return;
    }

    if (!this.isModelInitialized()) {
      const err = new Error('Model not initialized. Call initialize() first.');
      this.samOptions.onError?.(err);
      return;
    }

    if (this.options.preventDefaultAction && evt.preventDefaultAction !== undefined) {
      evt.preventDefaultAction = true;
    }

    // Convert event position to image coordinates
    let imageCoords: { x: number; y: number };
    if (evt.position) {
      const vpPoint = evt.position as OpenSeadragon.Point;
      const imgPoint = this.viewer.viewport.viewportToImageCoordinates(vpPoint);
      imageCoords = { x: imgPoint.x, y: imgPoint.y };
    } else if (evt.originalEvent) {
      imageCoords = this.viewerToImageCoords(
        evt.originalEvent.offsetX || 0,
        evt.originalEvent.offsetY || 0
      );
    } else {
      imageCoords = { x: 0, y: 0 };
    }

    // Check if clicking on existing annotation
    const hitAnnotation = this.checkAnnotationHit(imageCoords);
    if (hitAnnotation) {
      return;
    }

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
      // Check if we can reuse the cached preview result
      // Use a tolerance of 5 pixels to account for slight mouse movement
      const tolerance = 5;
      const canReusePreview = this.lastPreviewResult &&
        Math.abs(this.lastPreviewResult.x - clickX) < tolerance &&
        Math.abs(this.lastPreviewResult.y - clickY) < tolerance;

      let maskBlob: Blob;
      let iouScore: number;

      if (canReusePreview && this.lastPreviewResult) {
        // Reuse cached preview result
        maskBlob = this.lastPreviewResult.maskBlob;
        iouScore = this.lastPreviewResult.iouScore;
      } else {
        // Run new prediction
        const result = await this.model.predict({
          embedding: this.samOptions.embedding,
          clickX,
          clickY,
          imageWidth: this.samOptions.imageWidth,
          imageHeight: this.samOptions.imageHeight,
        });
        maskBlob = result.maskBlob;
        iouScore = result.iouScore;
      }

      this.samOptions.onPredictionComplete?.(iouScore);

      // Convert mask blob to URL
      const blobUrl = URL.createObjectURL(maskBlob);

      try {
        const annotations = await loadMaskPolygons(blobUrl, {
          maskType: 'binary',
        });

        if (annotations.length > 0) {
          const annotation = annotations[0];
          if (this.samOptions.annotationProperties) {
            Object.assign(annotation, this.samOptions.annotationProperties);
          }

          annotation.properties = {
            ...annotation.properties,
            source: 'sam-onnx',
            iouScore: iouScore,
            clickPoint: { x: clickX, y: clickY },
          };

          this.annotator.state.store.add(annotation);
          this.selectAnnotation(annotation.id);
          this.samOptions.onAnnotationCreated?.(annotation);
        }
      } finally {
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
   * Handle canvas hover for preview (throttled)
   */
  private onCanvasHover(x: number, y: number): void {
    if (!this.samOptions.showHoverPreview || !this.isModelInitialized()) {
      return;
    }

    // Check if mouse is within image bounds
    if (x < 0 || y < 0 || x >= this.samOptions.imageWidth || y >= this.samOptions.imageHeight) {
      // Mouse is outside image - remove preview
      this.removePreview();
      return;
    }

    // Throttle to 50ms
    const now = Date.now();
    if (now - this.lastPreviewTime < 50) {
      return;
    }
    this.lastPreviewTime = now;

    this.showPreview(x, y);
  }

  /**
   * Show hover preview at coordinates
   */
  private async showPreview(x: number, y: number): Promise<void> {
    if (!this.viewer || this.isPredicting) {
      return;
    }

    const seq = ++this.previewSeq;

    try {
      const result = await this.model.predict({
        embedding: this.samOptions.embedding,
        clickX: x,
        clickY: y,
        imageWidth: this.samOptions.imageWidth,
        imageHeight: this.samOptions.imageHeight,
      });

      // If a newer preview started, drop this one
      if (seq !== this.previewSeq) return;

      // Extract best mask from tensor
      const maskData = result.maskTensor.data as Float32Array;
      const dims = result.maskTensor.dims;

      // Get actual mask dimensions from tensor: [batch, channels, height, width]
      const maskHeight = dims[2];
      const maskWidth = dims[3];
      const maskSize = maskHeight * maskWidth;

      // Get best mask slice based on IoU-selected index
      const bestMaskIndex = result.bestMaskIndex;
      const maskStart = bestMaskIndex * maskSize;
      const bestMaskData = maskData.slice(maskStart, maskStart + maskSize);

      // Create canvas with actual mask dimensions
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.createImageData(maskWidth, maskHeight);
      for (let i = 0; i < maskSize; i++) {
        const on = bestMaskData[i] > 0.0;
        const p = i * 4;
        if (on) {
          imageData.data[p] = 0;       // R
          imageData.data[p + 1] = 114; // G
          imageData.data[p + 2] = 189; // B
          imageData.data[p + 3] = 255; // A
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // SAM outputs masks at the original image resolution (after we pass orig_im_size)
      // Cache the result for click-to-create
      this.lastPreviewResult = {
        maskBlob: result.maskBlob,
        x,
        y,
        iouScore: result.iouScore,
      };

      // Update or create overlay
      this.removePreview();
      this.previewCanvas = maskCanvas;
      this.previewCanvas.style.opacity = String(this.samOptions.previewOpacity);

      const imageRect = new OpenSeadragon.Rect(0, 0, this.samOptions.imageWidth, this.samOptions.imageHeight);
      const vpRect = this.viewer.viewport.imageToViewportRectangle(imageRect);

      this.viewer.addOverlay({
        element: this.previewCanvas,
        location: vpRect,
        placement: OpenSeadragon.Placement.TOP_LEFT,
      });
    } catch (error) {
      // Silently fail for preview errors
    }
  }

  /**
   * Remove preview overlay
   */
  private removePreview(): void {
    if (this.previewCanvas && this.viewer) {
      try {
        this.viewer.removeOverlay(this.previewCanvas);
      } catch {}
      this.previewCanvas = null;
    }
    this.lastPreviewResult = null;
  }

  /**
   * Clean up resources
   */
  override destroy(): void {
    super.destroy();
    this.model.dispose();
    this.removePreview();
  }
}
