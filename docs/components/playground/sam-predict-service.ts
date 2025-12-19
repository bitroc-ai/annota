/**
 * SAM Prediction Service
 *
 * Provides functions to create predictFn implementations for remote SAM inference.
 * The SamTool can use these to delegate inference to a backend instead of running
 * ONNX in the browser (which has memory leak issues on Safari).
 *
 * Available backends:
 * 1. **API Route** (createApiPredictFn) - Uses Next.js API route with onnxruntime-node
 * 2. **Tauri** (createTauriPredictFn) - Uses Rust backend for production apps like bitpath
 * 3. **Mock** (createMockPredictFn) - For testing without real inference
 */

import type {
  SamPredictFn,
  SamRemotePredictInput,
  SamRemotePredictOutput,
  MaskStats,
} from "annota";

/**
 * API response type from /api/sam endpoint
 */
interface ApiPredictResponse {
  maskBase64: string;
  iouScore: number;
  maskStats: {
    width: number;
    height: number;
    whiteCount: number;
    blackCount: number;
    foregroundRatio: number;
    isEmpty: boolean;
    isTiny: boolean;
  };
}

/**
 * Create a prediction function that calls the Next.js API route
 *
 * This uses onnxruntime-node on the server for real SAM inference.
 * Recommended for development/testing and web deployments.
 *
 * @param options.apiEndpoint - API endpoint URL (default: "/api/sam")
 *
 * @example
 * ```ts
 * const predictFn = createApiPredictFn();
 *
 * const samTool = new SamTool({
 *   predictFn,
 *   imageWidth: 1024,
 *   imageHeight: 1024,
 * });
 * ```
 */
export function createApiPredictFn(options?: {
  apiEndpoint?: string;
}): SamPredictFn {
  const apiEndpoint = options?.apiEndpoint ?? "/api/sam";

  return async (
    input: SamRemotePredictInput
  ): Promise<SamRemotePredictOutput> => {
    const {
      embedding,
      clickX,
      clickY,
      imageWidth,
      imageHeight,
      positivePoints,
      negativePoints,
    } = input;

    // Embedding should be a path to .npy file for API backend
    if (typeof embedding !== "string") {
      throw new Error(
        "API backend requires embedding path as string, not Float32Array"
      );
    }

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeddingPath: embedding,
        clickX,
        clickY,
        imageWidth,
        imageHeight,
        positivePoints,
        negativePoints,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SAM API error: ${error}`);
    }

    const result: ApiPredictResponse = await response.json();

    // Convert base64 mask to Blob
    const binaryString = atob(result.maskBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const maskBlob = new Blob([bytes], { type: "image/png" });

    // Map API result to SamRemotePredictOutput
    const maskStats: MaskStats = {
      width: result.maskStats.width,
      height: result.maskStats.height,
      numMasks: 1,
      whiteCount: result.maskStats.whiteCount,
      blackCount: result.maskStats.blackCount,
      foregroundRatio: result.maskStats.foregroundRatio,
      isEmpty: result.maskStats.isEmpty,
      isTiny: result.maskStats.isTiny,
      iouBestIndex: 0,
      iouBestScore: result.iouScore,
    };

    return {
      maskBlob,
      iouScore: result.iouScore,
      maskStats,
    };
  };
}

/**
 * Create a mock prediction function for testing
 *
 * Generates a simple circular mask around the click point.
 * Useful for UI testing without real model inference.
 */
export function createMockPredictFn(): SamPredictFn {
  return async (
    input: SamRemotePredictInput
  ): Promise<SamRemotePredictOutput> => {
    const { clickX, clickY, imageWidth, imageHeight } = input;

    // Simulate some processing delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Create a simple circular mask around the click point
    const radius = Math.min(imageWidth, imageHeight) * 0.1; // 10% of image size
    const maskBlob = await createCircularMask(
      clickX,
      clickY,
      radius,
      imageWidth,
      imageHeight
    );

    // Calculate mock stats
    const area = Math.PI * radius * radius;
    const totalPixels = imageWidth * imageHeight;
    const foregroundRatio = area / totalPixels;

    const maskStats: MaskStats = {
      width: imageWidth,
      height: imageHeight,
      numMasks: 1,
      whiteCount: Math.round(area),
      blackCount: Math.round(totalPixels - area),
      foregroundRatio,
      isEmpty: false,
      isTiny: foregroundRatio < 0.001,
      iouBestIndex: 0,
      iouBestScore: 0.95, // Mock high confidence
    };

    return {
      maskBlob,
      iouScore: 0.95,
      maskStats,
    };
  };
}

/**
 * Create a circular PNG mask (for mock service)
 */
async function createCircularMask(
  centerX: number,
  centerY: number,
  radius: number,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  // Fill with black (background)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Draw white circle (foreground)
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create blob"));
      }
    }, "image/png");
  });
}

/**
 * Type definition for Tauri invoke (when running in bitpath)
 */
interface TauriInvokeArgs {
  embeddingPath: string;
  modelPath: string;
  clickX: number;
  clickY: number;
  imageWidth: number;
  imageHeight: number;
  positivePoints?: Array<{ x: number; y: number }>;
  negativePoints?: Array<{ x: number; y: number }>;
}

interface TauriPredictResult {
  maskBase64: string;
  iouScore: number;
  maskStats: {
    width: number;
    height: number;
    whiteCount: number;
    blackCount: number;
    foregroundRatio: number;
    isEmpty: boolean;
    isTiny: boolean;
  };
}

/**
 * Create a prediction function that uses Tauri backend (for bitpath)
 *
 * This calls the Rust backend's sam_predict command for native ONNX inference.
 * Recommended for production desktop apps.
 *
 * @param invoke - Tauri invoke function
 * @param options.modelPath - Path to SAM decoder ONNX model
 *
 * @example
 * ```ts
 * import { invoke } from '@tauri-apps/api/core';
 *
 * const predictFn = createTauriPredictFn(invoke, {
 *   modelPath: '/path/to/sam_decoder.onnx',
 * });
 *
 * const samTool = new SamTool({
 *   predictFn,
 *   imageWidth: 1024,
 *   imageHeight: 1024,
 * });
 * ```
 */
export function createTauriPredictFn(
  invoke: <T>(cmd: string, args: Record<string, unknown>) => Promise<T>,
  options: {
    modelPath: string;
  }
): SamPredictFn {
  return async (
    input: SamRemotePredictInput
  ): Promise<SamRemotePredictOutput> => {
    const {
      embedding,
      clickX,
      clickY,
      imageWidth,
      imageHeight,
      positivePoints,
      negativePoints,
    } = input;

    // Embedding should be a path to .npy file when using Tauri backend
    if (typeof embedding !== "string") {
      throw new Error(
        "Tauri backend requires embedding path as string, not Float32Array"
      );
    }

    const args: TauriInvokeArgs = {
      embeddingPath: embedding,
      modelPath: options.modelPath,
      clickX,
      clickY,
      imageWidth,
      imageHeight,
      positivePoints,
      negativePoints,
    };

    const result = await invoke<TauriPredictResult>("sam_predict", {
      input: args,
    });

    // Convert base64 mask to Blob
    const binaryString = atob(result.maskBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const maskBlob = new Blob([bytes], { type: "image/png" });

    // Map Tauri result to SamRemotePredictOutput
    const maskStats: MaskStats = {
      width: result.maskStats.width,
      height: result.maskStats.height,
      numMasks: 1,
      whiteCount: result.maskStats.whiteCount,
      blackCount: result.maskStats.blackCount,
      foregroundRatio: result.maskStats.foregroundRatio,
      isEmpty: result.maskStats.isEmpty,
      isTiny: result.maskStats.isTiny,
      iouBestIndex: 0,
      iouBestScore: result.iouScore,
    };

    return {
      maskBlob,
      iouScore: result.iouScore,
      maskStats,
    };
  };
}
