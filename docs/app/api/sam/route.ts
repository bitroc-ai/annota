/**
 * SAM Prediction API Route
 *
 * Runs SAM decoder inference using onnxruntime-node on the server.
 * This demonstrates the interface for remote SAM prediction.
 *
 * POST /api/sam
 * Body: JSON with embeddingPath, clickX, clickY, imageWidth, imageHeight
 * Response: JSON with maskBase64, iouScore, maskStats
 *
 * Note: The ONNX session is cached as a module-level singleton.
 * This works well for:
 * - Next.js dev server (single process)
 * - Production with `next start` (persistent Node.js process)
 *
 * For serverless deployments (Vercel), consider:
 * - Using a separate inference service
 * - Accepting ~1s cold start latency
 * - Using provisioned concurrency to keep instances warm
 */

import { NextRequest, NextResponse } from "next/server";
import * as ort from "onnxruntime-node";
import * as fs from "fs";
import * as path from "path";

// ============================================
// Singleton ONNX Session Manager
// ============================================

/**
 * Module-level cache for ONNX session.
 * Survives across requests in the same process.
 */
let cachedSession: ort.InferenceSession | null = null;
let cachedModelPath: string | null = null;
let sessionInitPromise: Promise<ort.InferenceSession> | null = null;

/**
 * Default model path (relative to public directory)
 */
const DEFAULT_MODEL_PATH = "models/sam_onnx_quantized_vit_b.onnx";

/**
 * Get the absolute model path
 */
function getModelPath(): string {
  return path.join(process.cwd(), "public", DEFAULT_MODEL_PATH);
}

/**
 * Warm up the ONNX session on module load.
 * This runs when the API route is first imported, reducing cold start latency.
 */
function warmUp(): void {
  const modelPath = getModelPath();

  // Check if model file exists before attempting to load
  if (!fs.existsSync(modelPath)) {
    return;
  }

  getSession(modelPath).catch(() => {
    // Warm-up failed, will retry on first request
  });
}

// Trigger warm-up on module load (runs once when server starts)
warmUp();

interface SamPredictRequest {
  /** Path to .npy embedding file (relative to public dir) */
  embeddingPath: string;
  /** Click X coordinate in image space */
  clickX: number;
  /** Click Y coordinate in image space */
  clickY: number;
  /** Original image width */
  imageWidth: number;
  /** Original image height */
  imageHeight: number;
  /** Additional positive points */
  positivePoints?: Array<{ x: number; y: number }>;
  /** Negative points to exclude */
  negativePoints?: Array<{ x: number; y: number }>;
}

interface MaskStats {
  width: number;
  height: number;
  whiteCount: number;
  blackCount: number;
  foregroundRatio: number;
  isEmpty: boolean;
  isTiny: boolean;
}

interface SamPredictResponse {
  maskBase64: string;
  iouScore: number;
  maskStats: MaskStats;
}

/**
 * Load a .npy embedding file
 */
function loadNpyEmbedding(filePath: string): Float32Array {
  const buffer = fs.readFileSync(filePath);

  // Parse NPY header - compare bytes directly (not string) to handle binary magic byte
  const expectedMagic = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]); // \x93NUMPY
  if (!buffer.subarray(0, 6).equals(expectedMagic)) {
    throw new Error("Invalid NPY file magic number");
  }

  const version = [buffer[6], buffer[7]];
  let headerLen: number;
  let dataOffset: number;

  if (version[0] === 1) {
    headerLen = buffer.readUInt16LE(8);
    dataOffset = 10 + headerLen;
  } else {
    headerLen = buffer.readUInt32LE(8);
    dataOffset = 12 + headerLen;
  }

  // Extract float32 data
  const dataBuffer = buffer.slice(dataOffset);
  const float32Array = new Float32Array(
    dataBuffer.buffer,
    dataBuffer.byteOffset,
    dataBuffer.length / 4
  );

  return float32Array;
}

/**
 * Get or create ONNX session (singleton with race condition protection)
 *
 * Uses a promise-based lock to ensure only one initialization happens
 * even if multiple requests arrive simultaneously during cold start.
 */
async function getSession(modelPath: string): Promise<ort.InferenceSession> {
  // Return cached session if already initialized with same model
  if (cachedSession && cachedModelPath === modelPath) {
    return cachedSession;
  }

  // If initialization is in progress, wait for it
  if (sessionInitPromise && cachedModelPath === modelPath) {
    return sessionInitPromise;
  }

  // Start initialization (only one request will reach here)
  sessionInitPromise = ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });

  try {
    cachedSession = await sessionInitPromise;
    cachedModelPath = modelPath;
    return cachedSession;
  } catch (error) {
    // Reset on failure so next request can retry
    sessionInitPromise = null;
    throw error;
  }
}

/**
 * Convert mask tensor to base64 PNG using sharp
 */
async function tensorToBase64Png(
  maskData: Float32Array,
  width: number,
  height: number,
  bestMaskIndex: number
): Promise<{ base64: string; stats: MaskStats }> {
  const sharp = (await import("sharp")).default;

  const maskSize = width * height;
  const maskStart = bestMaskIndex * maskSize;

  // Create binary mask as grayscale (single channel)
  let whiteCount = 0;
  let blackCount = 0;
  const binaryMask = new Uint8Array(maskSize);

  for (let i = 0; i < maskSize; i++) {
    const val = maskData[maskStart + i];
    if (val > 0) {
      binaryMask[i] = 255;
      whiteCount++;
    } else {
      binaryMask[i] = 0;
      blackCount++;
    }
  }

  // Use sharp to create PNG from raw grayscale data
  const pngBuffer = await sharp(Buffer.from(binaryMask), {
    raw: {
      width,
      height,
      channels: 1, // Grayscale
    },
  })
    .png()
    .toBuffer();

  const base64 = pngBuffer.toString("base64");

  const foregroundRatio = whiteCount / maskSize;
  const stats: MaskStats = {
    width,
    height,
    whiteCount,
    blackCount,
    foregroundRatio,
    isEmpty: whiteCount === 0,
    isTiny: foregroundRatio > 0 && foregroundRatio < 0.001,
  };

  return { base64, stats };
}

/**
 * GET /api/sam - Health check and warm-up endpoint
 *
 * Returns the current status of the ONNX session.
 * Can be called to trigger model loading before first prediction.
 *
 * Response:
 * - 200: { status: "ready", modelPath: "..." } - Model loaded and ready
 * - 200: { status: "loading", modelPath: "..." } - Model is being loaded
 * - 503: { status: "unavailable", error: "..." } - Model failed to load
 */
export async function GET() {
  const modelPath = getModelPath();

  try {
    // Check if model file exists
    if (!fs.existsSync(modelPath)) {
      return NextResponse.json(
        { status: "unavailable", error: "Model file not found", modelPath },
        { status: 503 }
      );
    }

    // Check if already loaded
    if (cachedSession && cachedModelPath === modelPath) {
      return NextResponse.json({
        status: "ready",
        modelPath: DEFAULT_MODEL_PATH,
      });
    }

    // Check if loading in progress
    if (sessionInitPromise) {
      return NextResponse.json({
        status: "loading",
        modelPath: DEFAULT_MODEL_PATH,
      });
    }

    // Trigger loading
    const startTime = Date.now();
    await getSession(modelPath);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: "ready",
      modelPath: DEFAULT_MODEL_PATH,
      loadTimeMs: duration,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
        modelPath: DEFAULT_MODEL_PATH,
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/sam - Run SAM prediction
 */
export async function POST(request: NextRequest) {
  try {
    const body: SamPredictRequest = await request.json();
    const {
      embeddingPath,
      clickX,
      clickY,
      imageWidth,
      imageHeight,
      positivePoints = [],
      negativePoints = [],
    } = body;

    // Resolve paths
    const publicDir = path.join(process.cwd(), "public");
    const fullEmbeddingPath = path.join(publicDir, embeddingPath);
    const modelPath = getModelPath();

    // Check if embedding file exists
    if (!fs.existsSync(fullEmbeddingPath)) {
      return NextResponse.json(
        { error: `Embedding file not found: ${embeddingPath}` },
        { status: 404 }
      );
    }

    // Load embedding
    const embeddingData = loadNpyEmbedding(fullEmbeddingPath);

    // Get ONNX session
    const session = await getSession(modelPath);

    // Prepare inputs
    const modelScale = 1024 / Math.max(imageWidth, imageHeight);

    // Build point coordinates and labels
    const allPoints: Array<{ x: number; y: number; label: number }> = [
      { x: clickX * modelScale, y: clickY * modelScale, label: 1 },
    ];

    for (const p of positivePoints) {
      allPoints.push({ x: p.x * modelScale, y: p.y * modelScale, label: 1 });
    }

    for (const p of negativePoints) {
      allPoints.push({ x: p.x * modelScale, y: p.y * modelScale, label: 0 });
    }

    // Add padding point if needed
    if (allPoints.length === 1) {
      allPoints.push({ x: 0, y: 0, label: -1 });
    }

    const numPoints = allPoints.length;

    // Create input tensors
    const pointCoordsData = new Float32Array(numPoints * 2);
    const pointLabelsData = new Float32Array(numPoints);

    allPoints.forEach((p, i) => {
      pointCoordsData[i * 2] = p.x;
      pointCoordsData[i * 2 + 1] = p.y;
      pointLabelsData[i] = p.label;
    });

    const embeddingTensor = new ort.Tensor("float32", embeddingData, [
      1,
      256,
      64,
      64,
    ]);
    const pointCoordsTensor = new ort.Tensor("float32", pointCoordsData, [
      1,
      numPoints,
      2,
    ]);
    const pointLabelsTensor = new ort.Tensor("float32", pointLabelsData, [
      1,
      numPoints,
    ]);
    const maskInputTensor = new ort.Tensor(
      "float32",
      new Float32Array(256 * 256).fill(0),
      [1, 1, 256, 256]
    );
    const hasMaskInputTensor = new ort.Tensor("float32", [0], [1]);
    const origImSizeTensor = new ort.Tensor(
      "float32",
      [imageHeight, imageWidth],
      [2]
    );

    // Run inference
    const results = await session.run({
      image_embeddings: embeddingTensor,
      point_coords: pointCoordsTensor,
      point_labels: pointLabelsTensor,
      mask_input: maskInputTensor,
      has_mask_input: hasMaskInputTensor,
      orig_im_size: origImSizeTensor,
    });

    // Extract outputs
    const maskTensor = results.masks;
    const iouPredictions = results.iou_predictions;

    const maskData = maskTensor.data as Float32Array;
    const iouData = iouPredictions.data as Float32Array;

    // Find best mask by IoU
    let bestIdx = 0;
    let bestIou = iouData[0];
    for (let i = 1; i < iouData.length; i++) {
      if (iouData[i] > bestIou) {
        bestIou = iouData[i];
        bestIdx = i;
      }
    }

    // Get mask dimensions
    const maskHeight = maskTensor.dims[2] as number;
    const maskWidth = maskTensor.dims[3] as number;

    // Convert to base64 PNG
    const { base64, stats } = await tensorToBase64Png(
      maskData,
      maskWidth,
      maskHeight,
      bestIdx
    );

    const response: SamPredictResponse = {
      maskBase64: base64,
      iouScore: bestIou,
      maskStats: stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
