/**
 * SAM (Segment Anything Model) tool for interactive segmentation
 *
 * This tool allows users to click on objects and instantly generate polygon annotations
 * using Meta's SAM model. All inference is delegated to a backend server via `predictFn`.
 *
 * The library does not include ONNX runtime - you must provide a prediction function
 * that handles the actual model inference (e.g., via API call to your backend).
 */

import OpenSeadragon from "openseadragon";
import { BaseTool } from "./base";
import type { ToolHandlerOptions } from "./types";
import { loadMaskPolygons } from "../loaders/masks";
import type { Annotation } from "../core/types";

/**
 * Statistics about a generated mask
 */
export interface MaskStats {
  /** Width of the mask in pixels */
  width: number;
  /** Height of the mask in pixels */
  height: number;
  /** Number of masks generated (typically 3 for SAM) */
  numMasks: number;
  /** Number of foreground (white) pixels */
  whiteCount: number;
  /** Number of background (black) pixels */
  blackCount: number;
  /** Ratio of foreground to total pixels */
  foregroundRatio: number;
  /** True if mask has no foreground pixels */
  isEmpty: boolean;
  /** True if mask covers very small area (<0.1%) */
  isTiny: boolean;
  /** Index of best mask based on IoU score */
  iouBestIndex: number;
  /** IoU score of best mask */
  iouBestScore: number;
}

/**
 * Input for SAM prediction
 */
export interface SamPredictInput {
  /** Embedding data as Float32Array or path to .npy file */
  embedding: Float32Array | string;

  /** Click X coordinate in image space */
  clickX: number;

  /** Click Y coordinate in image space */
  clickY: number;

  /** Original image width */
  imageWidth: number;

  /** Original image height */
  imageHeight: number;

  /** Additional positive click points (optional) */
  positivePoints?: Array<{ x: number; y: number }>;

  /** Negative click points to exclude areas (optional) */
  negativePoints?: Array<{ x: number; y: number }>;
}

/**
 * Output from SAM prediction
 */
export interface SamPredictOutput {
  /** Binary mask as PNG blob */
  maskBlob: Blob;

  /** IoU (Intersection over Union) prediction score */
  iouScore: number;

  /** Statistics about the generated mask */
  maskStats: MaskStats;
}

/**
 * Function type for SAM prediction
 * Implement this to handle inference on your backend
 *
 * @example
 * ```typescript
 * const predictFn: SamPredictFn = async (input) => {
 *   const response = await fetch('/api/sam/predict', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       embeddingPath: input.embedding, // string path to .npy file
 *       clickX: input.clickX,
 *       clickY: input.clickY,
 *       imageWidth: input.imageWidth,
 *       imageHeight: input.imageHeight,
 *     }),
 *   });
 *   return response.json();
 * };
 * ```
 */
export type SamPredictFn = (input: SamPredictInput) => Promise<SamPredictOutput>;

// For backwards compatibility
export type SamRemotePredictInput = SamPredictInput;
export type SamRemotePredictOutput = SamPredictOutput;

const MAX_FOREGROUND_RATIO = 0.4; // Treat masks covering >40% as invalid/noise

/**
 * Configuration for SAM tool
 */
export interface SamToolOptions extends ToolHandlerOptions {
  /**
   * Prediction function that handles SAM inference.
   * This is called for each click/hover to generate segmentation masks.
   *
   * @example
   * ```typescript
   * const samTool = new SamTool({
   *   predictFn: async (input) => {
   *     const response = await fetch('/api/sam/predict', {
   *       method: 'POST',
   *       body: JSON.stringify(input),
   *     });
   *     return response.json();
   *   },
   *   imageWidth: 1024,
   *   imageHeight: 1024,
   * });
   * ```
   */
  predictFn: SamPredictFn;

  /**
   * Initial embedding data (Float32Array or path to .npy file)
   * Can be updated later with setEmbedding()
   */
  embedding?: Float32Array | string;

  /** Original image width */
  imageWidth: number;

  /** Original image height */
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
 *
 * Delegates all inference to a backend server via the provided `predictFn`.
 * This avoids loading ONNX runtime in the browser, which can cause memory
 * issues especially on Safari.
 *
 * @example
 * ```typescript
 * const samTool = new SamTool({
 *   predictFn: async (input) => {
 *     const res = await fetch('/api/sam', {
 *       method: 'POST',
 *       body: JSON.stringify(input),
 *     });
 *     return res.json();
 *   },
 *   imageWidth: 1024,
 *   imageHeight: 1024,
 * });
 *
 * // Initialize (validates configuration)
 * await samTool.initializeModel();
 *
 * // Set embedding when image loads
 * samTool.setEmbedding('/embeddings/image1.npy', 2048, 1536);
 * ```
 */
export class SamTool extends BaseTool {
  private predictFn: SamPredictFn;
  private embeddingData: Float32Array | string | null = null;

  private samOptions: {
    imageWidth: number;
    imageHeight: number;
    showHoverPreview: boolean;
    previewOpacity: number;
    annotationProperties?: Partial<Annotation>;
    onAnnotationCreated?: (annotation: Annotation) => void;
    onPredictionStart?: () => void;
    onPredictionComplete?: (iouScore: number) => void;
    onError?: (error: Error) => void;
  };

  private isPredicting = false;
  private previewCanvas: HTMLCanvasElement | null = null;
  private lastPreviewTime = 0;
  private hoverHandler: ((evt: MouseEvent) => void) | null = null;
  private lastPreviewResult: {
    maskBlob: Blob;
    x: number;
    y: number;
    iouScore: number;
    maskStats: MaskStats;
  } | null = null;
  private initialized = false;

  constructor(options: SamToolOptions) {
    super("sam", options);

    if (!options.predictFn) {
      throw new Error("SamTool requires a predictFn for inference");
    }

    this.predictFn = options.predictFn;
    this.embeddingData = options.embedding ?? null;

    this.samOptions = {
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

  }

  /**
   * Initialize the SAM tool (validates configuration)
   * Since inference is delegated to the backend, this is lightweight.
   */
  async initializeModel(): Promise<void> {
    this.initialized = true;
  }

  /**
   * Check if tool is initialized
   */
  isModelInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Update the embedding data (when switching images)
   * @param embedding - Float32Array or path to .npy file
   * @param imageWidth - Original image width
   * @param imageHeight - Original image height
   */
  setEmbedding(
    embedding: Float32Array | string,
    imageWidth: number,
    imageHeight: number
  ): void {
    this.embeddingData = embedding;
    this.samOptions.imageWidth = imageWidth;
    this.samOptions.imageHeight = imageHeight;
  }

  /**
   * Alias for setEmbedding for backwards compatibility
   */
  setEmbeddingData(
    embeddingData: Float32Array | string,
    imageWidth: number,
    imageHeight: number
  ): void {
    this.setEmbedding(embeddingData, imageWidth, imageHeight);
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
          const imagePoint =
            this.viewer!.viewport.viewportToImageCoordinates(viewportPoint);
          this.onCanvasHover(imagePoint.x, imagePoint.y);
        };
        container.addEventListener("mousemove", this.hoverHandler);
      }
    }
  }

  protected detachEventHandlers(): void {
    super.detachEventHandlers();

    if (this.hoverHandler && this.viewer) {
      const container = this.viewer.element;
      if (container) {
        container.removeEventListener("mousemove", this.hoverHandler);
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
      const err = new Error("Tool not initialized. Call initializeModel() first.");
      this.samOptions.onError?.(err);
      return;
    }

    if (!this.embeddingData) {
      const err = new Error(
        "Embedding not loaded. Please wait for image to load."
      );
      this.samOptions.onError?.(err);
      return;
    }

    if (
      this.options.preventDefaultAction &&
      evt.preventDefaultAction !== undefined
    ) {
      evt.preventDefaultAction = true;
    }

    // Convert click coordinates to image space
    const container = this.viewer.element;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pixelX = evt.originalEvent.clientX - rect.left;
    const pixelY = evt.originalEvent.clientY - rect.top;
    const viewportPoint = this.viewer.viewport.pointFromPixel(
      new OpenSeadragon.Point(pixelX, pixelY)
    );
    const imagePoint =
      this.viewer.viewport.viewportToImageCoordinates(viewportPoint);
    const samCoords = { x: imagePoint.x, y: imagePoint.y };

    // Ignore clicks outside image bounds
    if (
      samCoords.x < 0 ||
      samCoords.y < 0 ||
      samCoords.x >= this.samOptions.imageWidth ||
      samCoords.y >= this.samOptions.imageHeight
    ) {
      this.removePreview();
      return;
    }

    // Check if clicking on existing annotation
    const hitAnnotation = this.checkAnnotationHit(samCoords);
    if (hitAnnotation) {
      return;
    }

    await this.predictAndCreateAnnotation(samCoords.x, samCoords.y);
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
      const tolerance = 5;
      const canReusePreview =
        this.lastPreviewResult &&
        Math.abs(this.lastPreviewResult.x - clickX) < tolerance &&
        Math.abs(this.lastPreviewResult.y - clickY) < tolerance;

      let maskBlob: Blob;
      let iouScore: number;
      let maskStats: MaskStats;

      if (canReusePreview && this.lastPreviewResult) {
        // Reuse cached preview result
        maskBlob = this.lastPreviewResult.maskBlob;
        iouScore = this.lastPreviewResult.iouScore;
        maskStats = this.lastPreviewResult.maskStats;
      } else {
        // Call prediction function
        const result = await this.predictFn({
          embedding: this.embeddingData!,
          clickX,
          clickY,
          imageWidth: this.samOptions.imageWidth,
          imageHeight: this.samOptions.imageHeight,
        });
        maskBlob = result.maskBlob;
        iouScore = result.iouScore;
        maskStats = result.maskStats;
      }

      this.samOptions.onPredictionComplete?.(iouScore);

      // Skip obviously invalid results that cover too much of the image
      if (this.isMaskTooLarge(maskStats)) {
        return;
      }

      // Convert mask blob to URL
      const blobUrl = URL.createObjectURL(maskBlob);

      try {
        const annotations = await loadMaskPolygons(blobUrl, {
          maskType: "binary",
        });

        if (annotations.length > 0) {
          const annotation = annotations[0];

          annotation.properties = {
            ...annotation.properties,
            ...this.samOptions.annotationProperties,
            source: "sam",
            iouScore: iouScore,
            clickPoint: { x: clickX, y: clickY },
          };

          this.annotator.addAnnotation(annotation);
          this.selectAnnotation(annotation.id);
          this.samOptions.onAnnotationCreated?.(annotation);
        }
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.samOptions.onError?.(err);
    } finally {
      this.isPredicting = false;
    }
  }

  /**
   * Handle canvas hover for preview (throttled)
   */
  private onCanvasHover(x: number, y: number): void {
    if (
      !this.samOptions.showHoverPreview ||
      !this.isModelInitialized() ||
      !this.embeddingData
    ) {
      return;
    }

    // Check if mouse is within image bounds
    if (
      x < 0 ||
      y < 0 ||
      x >= this.samOptions.imageWidth ||
      y >= this.samOptions.imageHeight
    ) {
      this.removePreview();
      this.lastPreviewResult = null;
      return;
    }

    // Throttle predictions (100ms default for remote mode)
    const throttleMs = 100;
    const now = Date.now();
    if (now - this.lastPreviewTime < throttleMs) {
      return;
    }
    this.lastPreviewTime = now;

    this.showPreview(x, y);
  }

  /**
   * Show hover preview at coordinates
   * For remote mode, this caches the prediction for click-to-create
   */
  private async showPreview(x: number, y: number): Promise<void> {
    if (!this.viewer || this.isPredicting) {
      return;
    }

    try {
      const result = await this.predictFn({
        embedding: this.embeddingData!,
        clickX: x,
        clickY: y,
        imageWidth: this.samOptions.imageWidth,
        imageHeight: this.samOptions.imageHeight,
      });

      // Skip preview if mask is too large
      if (this.isMaskTooLarge(result.maskStats)) {
        this.removePreview();
        this.lastPreviewResult = null;
        return;
      }

      // Cache the result for click-to-create
      this.lastPreviewResult = {
        maskBlob: result.maskBlob,
        x,
        y,
        iouScore: result.iouScore,
        maskStats: result.maskStats,
      };

      // Show preview overlay
      await this.displayPreviewOverlay(result.maskBlob);
    } catch {
      // Preview failed, silently ignore
    }
  }

  /**
   * Display preview overlay from mask blob
   */
  private async displayPreviewOverlay(maskBlob: Blob): Promise<void> {
    if (!this.viewer) return;

    // Create image from blob
    const blobUrl = URL.createObjectURL(maskBlob);
    const img = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = blobUrl;
      });

      // Create canvas from image
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;

      // Draw image and colorize
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Convert grayscale mask to colored overlay
      for (let i = 0; i < imageData.data.length; i += 4) {
        const value = imageData.data[i]; // Grayscale value
        if (value > 127) {
          imageData.data[i] = 0; // R
          imageData.data[i + 1] = 114; // G
          imageData.data[i + 2] = 189; // B
          imageData.data[i + 3] = 180; // A
        } else {
          imageData.data[i + 3] = 0; // Transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Update overlay
      this.removePreview();
      this.previewCanvas = maskCanvas;
      this.previewCanvas.style.opacity = String(this.samOptions.previewOpacity);
      this.previewCanvas.style.pointerEvents = "none"; // Allow clicks to pass through

      const imageRect = new OpenSeadragon.Rect(
        0,
        0,
        this.samOptions.imageWidth,
        this.samOptions.imageHeight
      );
      const vpRect = this.viewer.viewport.imageToViewportRectangle(imageRect);

      this.viewer.addOverlay({
        element: this.previewCanvas,
        location: vpRect,
        placement: OpenSeadragon.Placement.TOP_LEFT,
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
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
  }

  private isMaskTooLarge(stats: MaskStats): boolean {
    return stats.foregroundRatio >= MAX_FOREGROUND_RATIO && !stats.isTiny;
  }

  /**
   * Clean up resources
   */
  override destroy(): void {
    super.destroy();
    this.removePreview();
    this.lastPreviewResult = null;
  }
}
