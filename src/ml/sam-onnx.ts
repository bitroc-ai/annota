/**
 * Browser-based SAM (Segment Anything Model) inference using ONNX Runtime Web
 *
 * This module provides client-side object segmentation without requiring a backend.
 * It uses Meta's SAM decoder model to generate masks from click coordinates and
 * precomputed image embeddings.
 *
 * @example
 * ```typescript
 * const model = new SamOnnxModel({
 *   decoderModelUrl: '/models/sam_vit_h_decoder.onnx'
 * });
 *
 * await model.initialize();
 *
 * const mask = await model.predict({
 *   embedding: imageEmbedding,
 *   clickX: 512,
 *   clickY: 512,
 *   imageWidth: 1024,
 *   imageHeight: 1024
 * });
 * ```
 */

import type * as ort from 'onnxruntime-web';

/**
 * Configuration for SAM ONNX model
 */
export interface SamOnnxConfig {
  /** URL to the SAM decoder ONNX model (~10MB) */
  decoderModelUrl: string;

  /** Number of threads for WebAssembly execution (default: 1) */
  numThreads?: number;

  /** Enable SIMD optimizations (default: true) */
  simd?: boolean;

  /** Execution providers in order of preference (default: ['wasm']) */
  executionProviders?: ('wasm' | 'webgl' | 'webgpu')[];
}

/**
 * Input parameters for SAM prediction
 */
export interface SamPredictInput {
  /** Precomputed image embedding tensor [1, 256, 64, 64] */
  embedding: ort.Tensor;

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

  /** Previous mask for iterative refinement (optional) */
  previousMask?: ort.Tensor;
}

/**
 * SAM prediction output
 */
export interface SamPredictOutput {
  /** Binary mask as PNG blob */
  maskBlob: Blob;

  /** Raw mask tensor [1, num_masks, 256, 256] */
  maskTensor: ort.Tensor;

  /** IoU (Intersection over Union) prediction score (best mask) */
  iouScore: number;

  /** IoU predictions for all masks */
  iouPredictions: ort.Tensor;

  /** Index of the best mask (highest IoU) */
  bestMaskIndex: number;

  /** Low resolution mask tensor (for iterative refinement) */
  lowResMask: ort.Tensor;
}

/**
 * Browser-based SAM model for interactive segmentation
 */
export class SamOnnxModel {
  private config: Required<SamOnnxConfig>;
  private session: (import('onnxruntime-web').InferenceSession) | null = null;
  private initialized = false;
  // Lazy-loaded ONNX Runtime Web to avoid importing on the server/SSR path
  private ort?: typeof import('onnxruntime-web');

  constructor(config: SamOnnxConfig) {
    this.config = {
      numThreads: 1,
      simd: true,
      executionProviders: ['wasm'],
      ...config,
    };
  }

  /**
   * Initialize the ONNX model and configure runtime
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import ORT web on the client only
      this.ort = await import('onnxruntime-web');
      // Reduce noisy logs (e.g., cpuid warnings from node paths)
      try {
        this.ort.env.logLevel = 'error';
      } catch {}
      // Configure ONNX Runtime (WASM)
      this.ort.env.wasm.numThreads = this.config.numThreads;
      this.ort.env.wasm.simd = this.config.simd;

      // Load decoder model
      this.session = await this.ort.InferenceSession.create(
        this.config.decoderModelUrl,
        {
          executionProviders: this.config.executionProviders,
          graphOptimizationLevel: 'all',
        }
      );

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize SAM ONNX model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if model is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Generate segmentation mask from click coordinates
   */
  async predict(input: SamPredictInput): Promise<SamPredictOutput> {
    if (!this.session) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    if (!this.ort) {
      throw new Error('ONNX Runtime not loaded');
    }

    const {
      embedding,
      clickX,
      clickY,
      imageWidth,
      imageHeight,
      positivePoints = [],
      negativePoints = [],
      previousMask,
    } = input;

    // SAM expects inputs in a 1024-sized space with UNIFORM scaling
    // (longest side scaled to 1024, aspect ratio preserved)
    const modelScale = 1024;
    const samScale = modelScale / Math.max(imageWidth, imageHeight);

    // Prepare point coordinates and labels
    const allPoints = [
      { x: clickX * samScale, y: clickY * samScale, label: 1 }, // Main click (foreground)
      ...positivePoints.map(p => ({ x: p.x * samScale, y: p.y * samScale, label: 1 })),
      ...negativePoints.map(p => ({ x: p.x * samScale, y: p.y * samScale, label: 0 })),
    ];

    // SAM requires at least 2 points (add padding point if needed)
    if (allPoints.length === 1) {
      allPoints.push({ x: 0, y: 0, label: -1 }); // Padding point
    }

    // Create point coordinate tensor [1, num_points, 2]
    const pointCoordsData = new Float32Array(allPoints.length * 2);
    const pointLabelsData = new Float32Array(allPoints.length);

    allPoints.forEach((point, i) => {
      pointCoordsData[i * 2] = point.x;
      pointCoordsData[i * 2 + 1] = point.y;
      pointLabelsData[i] = point.label;
    });

    const pointCoords = new this.ort.Tensor('float32', pointCoordsData, [
      1,
      allPoints.length,
      2,
    ]);
    const pointLabels = new this.ort.Tensor('float32', pointLabelsData, [
      1,
      allPoints.length,
    ]);

    // Prepare mask input tensor [1, 1, 256, 256]
    let maskInput: ort.Tensor;
    let hasMaskInput: ort.Tensor;

    if (previousMask) {
      maskInput = previousMask;
      hasMaskInput = new this.ort.Tensor('float32', [1], [1]);
    } else {
      // No prior mask
      maskInput = new this.ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [
        1,
        1,
        256,
        256,
      ]);
      hasMaskInput = new this.ort.Tensor('float32', [0], [1]);
    }

    // Original image size tensor [2]
    const origImSize = new this.ort.Tensor('float32', [imageHeight, imageWidth], [2]);

    // Run inference
    const feeds = {
      image_embeddings: embedding,
      point_coords: pointCoords,
      point_labels: pointLabels,
      mask_input: maskInput,
      has_mask_input: hasMaskInput,
      orig_im_size: origImSize,
    };

    const results = await this.session.run(feeds);

    // Extract outputs
    const maskTensor = results.masks as ort.Tensor;
    const iouPredictions = results.iou_predictions as ort.Tensor;
    const lowResMask = results.low_res_masks as ort.Tensor;

    // Find best mask index (highest IoU)
    const iouData = iouPredictions.data as Float32Array;
    let bestMaskIndex = 0;
    let bestIou = iouData[0];
    for (let i = 1; i < iouData.length; i++) {
      if (iouData[i] > bestIou) {
        bestIou = iouData[i];
        bestMaskIndex = i;
      }
    }

    // Convert mask tensor to PNG blob (extracts best mask based on IoU)
    const maskBlob = await this.tensorToPngBlob(maskTensor, iouPredictions);

    return {
      maskBlob,
      maskTensor,
      iouScore: bestIou,
      iouPredictions,
      bestMaskIndex,
      lowResMask,
    };
  }

  /**
   * Convert mask tensor to PNG blob
   * Extracts the best mask from multi-mask output based on IoU scores
   */
  private async tensorToPngBlob(tensor: ort.Tensor, iouPredictions: ort.Tensor): Promise<Blob> {
    const maskData = tensor.data as Float32Array;

    // SAM decoder outputs multiple candidate masks [batch, num_masks, height, width]
    // We need to extract only the best one based on IoU score
    const dims = tensor.dims; // e.g., [1, 3, height, width] or [1, 1, height, width]

    const numMasks = dims.length >= 4 ? dims[1] : 1;
    const height = dims[2];
    const width = dims[3];
    const maskSize = height * width;

    let bestMaskData: Float32Array;

    if (numMasks > 1) {
      // Find best mask index (highest IoU)
      const iouData = iouPredictions.data as Float32Array;
      let bestIdx = 0;
      let bestIou = iouData[0];
      for (let i = 1; i < numMasks; i++) {
        if (iouData[i] > bestIou) {
          bestIou = iouData[i];
          bestIdx = i;
        }
      }

      // Extract best mask slice from flattened tensor
      const maskStart = bestIdx * maskSize;
      const maskEnd = maskStart + maskSize;
      bestMaskData = maskData.slice(maskStart, maskEnd) as Float32Array;
    } else {
      // Single mask output - might still need to skip batch dimension
      // If dims is [1, 1, 256, 256], data is already correct
      // If dims is [256, 256], data is already correct
      bestMaskData = maskData.slice(0, maskSize) as Float32Array;
    }

    // Threshold at 0.0 (SAM convention)
    const binaryMask = new Uint8Array(bestMaskData.length);
    for (let i = 0; i < bestMaskData.length; i++) {
      binaryMask[i] = bestMaskData[i] > 0.0 ? 255 : 0;
    }

    // Create canvas and render binary mask
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < binaryMask.length; i++) {
      const pixelValue = binaryMask[i];
      imageData.data[i * 4] = pixelValue; // R
      imageData.data[i * 4 + 1] = pixelValue; // G
      imageData.data[i * 4 + 2] = pixelValue; // B
      imageData.data[i * 4 + 3] = 255; // A (fully opaque)
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });
  }

  /**
   * Dispose of the model and free resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
      this.initialized = false;
    }
  }
}
