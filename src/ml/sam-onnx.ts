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

import * as ort from 'onnxruntime-web';

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

  /** Raw mask tensor [1, 1, 256, 256] */
  maskTensor: ort.Tensor;

  /** IoU (Intersection over Union) prediction score */
  iouScore: number;

  /** Low resolution mask tensor (for iterative refinement) */
  lowResMask: ort.Tensor;
}

/**
 * Browser-based SAM model for interactive segmentation
 */
export class SamOnnxModel {
  private config: Required<SamOnnxConfig>;
  private session: ort.InferenceSession | null = null;
  private initialized = false;

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
      // Configure ONNX Runtime
      ort.env.wasm.numThreads = this.config.numThreads;
      ort.env.wasm.simd = this.config.simd;

      // Load decoder model
      this.session = await ort.InferenceSession.create(
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

    // SAM expects inputs in 1024x1024 space
    const modelScale = 1024;
    const scaleX = modelScale / imageWidth;
    const scaleY = modelScale / imageHeight;

    // Prepare point coordinates and labels
    const allPoints = [
      { x: clickX * scaleX, y: clickY * scaleY, label: 1 }, // Main click (foreground)
      ...positivePoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY, label: 1 })),
      ...negativePoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY, label: 0 })),
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

    const pointCoords = new ort.Tensor('float32', pointCoordsData, [
      1,
      allPoints.length,
      2,
    ]);
    const pointLabels = new ort.Tensor('float32', pointLabelsData, [
      1,
      allPoints.length,
    ]);

    // Prepare mask input tensor [1, 1, 256, 256]
    let maskInput: ort.Tensor;
    let hasMaskInput: ort.Tensor;

    if (previousMask) {
      maskInput = previousMask;
      hasMaskInput = new ort.Tensor('float32', [1], [1]);
    } else {
      // No prior mask
      maskInput = new ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [
        1,
        1,
        256,
        256,
      ]);
      hasMaskInput = new ort.Tensor('float32', [0], [1]);
    }

    // Original image size tensor [2]
    const origImSize = new ort.Tensor('float32', [imageHeight, imageWidth], [2]);

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

    // Convert mask tensor to PNG blob
    const maskBlob = await this.tensorToPngBlob(maskTensor);

    return {
      maskBlob,
      maskTensor,
      iouScore: (iouPredictions.data as Float32Array)[0],
      lowResMask,
    };
  }

  /**
   * Convert mask tensor to PNG blob
   */
  private async tensorToPngBlob(tensor: ort.Tensor): Promise<Blob> {
    // SAM outputs masks at 256x256 resolution
    const width = 256;
    const height = 256;
    const maskData = tensor.data as Float32Array;

    // Threshold at 0.0 (SAM convention)
    const binaryMask = new Uint8Array(maskData.length);
    for (let i = 0; i < maskData.length; i++) {
      binaryMask[i] = maskData[i] > 0.0 ? 255 : 0;
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
