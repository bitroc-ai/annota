/**
 * SAM Prediction API Route (SvelteKit)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as ort from "onnxruntime-node";
import * as fs from "fs";
import * as path from "path";

let cachedSession: ort.InferenceSession | null = null;
let cachedModelPath: string | null = null;
let sessionInitPromise: Promise<ort.InferenceSession> | null = null;

const DEFAULT_MODEL_PATH = "models/sam_onnx_quantized_vit_b.onnx";

function getModelPath(): string {
  return path.join(process.cwd(), "static", DEFAULT_MODEL_PATH);
}

function warmUp(): void {
  const modelPath = getModelPath();
  if (!fs.existsSync(modelPath)) {
    return;
  }
  getSession(modelPath).catch(() => {});
}

warmUp();

interface SamPredictRequest {
  embeddingPath: string;
  clickX: number;
  clickY: number;
  imageWidth: number;
  imageHeight: number;
  positivePoints?: Array<{ x: number; y: number }>;
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

function loadNpyEmbedding(filePath: string): Float32Array {
  const buffer = fs.readFileSync(filePath);
  const expectedMagic = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]);
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

  const dataBuffer = buffer.slice(dataOffset);
  return new Float32Array(
    dataBuffer.buffer,
    dataBuffer.byteOffset,
    dataBuffer.length / 4
  );
}

async function getSession(modelPath: string): Promise<ort.InferenceSession> {
  if (cachedSession && cachedModelPath === modelPath) {
    return cachedSession;
  }

  if (sessionInitPromise && cachedModelPath === modelPath) {
    return sessionInitPromise;
  }

  sessionInitPromise = ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });

  try {
    cachedSession = await sessionInitPromise;
    cachedModelPath = modelPath;
    return cachedSession;
  } catch (error) {
    sessionInitPromise = null;
    throw error;
  }
}

async function tensorToBase64Png(
  maskData: Float32Array,
  width: number,
  height: number,
  bestMaskIndex: number
): Promise<{ base64: string; stats: MaskStats }> {
  const sharp = (await import("sharp")).default;

  const maskSize = width * height;
  const maskStart = bestMaskIndex * maskSize;

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

  const pngBuffer = await sharp(Buffer.from(binaryMask), {
    raw: {
      width,
      height,
      channels: 1,
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

export const GET: RequestHandler = async () => {
  const modelPath = getModelPath();

  try {
    if (!fs.existsSync(modelPath)) {
      return json(
        { status: "unavailable", error: "Model file not found", modelPath },
        { status: 503 }
      );
    }

    if (cachedSession && cachedModelPath === modelPath) {
      return json({
        status: "ready",
        modelPath: DEFAULT_MODEL_PATH,
      });
    }

    if (sessionInitPromise) {
      return json({
        status: "loading",
        modelPath: DEFAULT_MODEL_PATH,
      });
    }

    const startTime = Date.now();
    await getSession(modelPath);
    const duration = Date.now() - startTime;

    return json({
      status: "ready",
      modelPath: DEFAULT_MODEL_PATH,
      loadTimeMs: duration,
    });
  } catch (error) {
    return json(
      {
        status: "unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
        modelPath: DEFAULT_MODEL_PATH,
      },
      { status: 503 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
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

    const publicDir = path.join(process.cwd(), "static");
    const fullEmbeddingPath = path.join(publicDir, embeddingPath);
    const modelPath = getModelPath();

    if (!fs.existsSync(fullEmbeddingPath)) {
      return json(
        { error: `Embedding file not found: ${embeddingPath}` },
        { status: 404 }
      );
    }

    const embeddingData = loadNpyEmbedding(fullEmbeddingPath);
    const session = await getSession(modelPath);

    const modelScale = 1024 / Math.max(imageWidth, imageHeight);

    const allPoints: Array<{ x: number; y: number; label: number }> = [
      { x: clickX * modelScale, y: clickY * modelScale, label: 1 },
    ];

    for (const p of positivePoints) {
      allPoints.push({ x: p.x * modelScale, y: p.y * modelScale, label: 1 });
    }

    for (const p of negativePoints) {
      allPoints.push({ x: p.x * modelScale, y: p.y * modelScale, label: 0 });
    }

    if (allPoints.length === 1) {
      allPoints.push({ x: 0, y: 0, label: -1 });
    }

    const numPoints = allPoints.length;

    const pointCoordsData = new Float32Array(numPoints * 2);
    const pointLabelsData = new Float32Array(numPoints);

    allPoints.forEach((p, i) => {
      pointCoordsData[i * 2] = p.x;
      pointCoordsData[i * 2 + 1] = p.y;
      pointLabelsData[i] = p.label;
    });

    const embeddingTensor = new ort.Tensor("float32", embeddingData, [
      1, 256, 64, 64,
    ]);
    const pointCoordsTensor = new ort.Tensor("float32", pointCoordsData, [
      1, numPoints, 2,
    ]);
    const pointLabelsTensor = new ort.Tensor("float32", pointLabelsData, [
      1, numPoints,
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

    const results = await session.run({
      image_embeddings: embeddingTensor,
      point_coords: pointCoordsTensor,
      point_labels: pointLabelsTensor,
      mask_input: maskInputTensor,
      has_mask_input: hasMaskInputTensor,
      orig_im_size: origImSizeTensor,
    });

    const maskTensor = results.masks;
    const iouPredictions = results.iou_predictions;

    const maskData = maskTensor.data as Float32Array;
    const iouData = iouPredictions.data as Float32Array;

    let bestIdx = 0;
    let bestIou = iouData[0];
    for (let i = 1; i < iouData.length; i++) {
      if (iouData[i] > bestIou) {
        bestIou = iouData[i];
        bestIdx = i;
      }
    }

    const maskHeight = maskTensor.dims[2] as number;
    const maskWidth = maskTensor.dims[3] as number;

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

    return json(response);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

