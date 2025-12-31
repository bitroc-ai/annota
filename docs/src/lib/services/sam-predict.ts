import type {
  SamPredictFn,
  SamRemotePredictInput,
  SamRemotePredictOutput,
  MaskStats,
} from "annota";

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

    const binaryString = atob(result.maskBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const maskBlob = new Blob([bytes], { type: "image/png" });

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

export function createMockPredictFn(): SamPredictFn {
  return async (
    input: SamRemotePredictInput
  ): Promise<SamRemotePredictOutput> => {
    const { clickX, clickY, imageWidth, imageHeight } = input;

    await new Promise((resolve) => setTimeout(resolve, 50));

    const radius = Math.min(imageWidth, imageHeight) * 0.1;
    const maskBlob = await createCircularMask(
      clickX,
      clickY,
      radius,
      imageWidth,
      imageHeight
    );

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
      iouBestScore: 0.95,
    };

    return {
      maskBlob,
      iouScore: 0.95,
      maskStats,
    };
  };
}

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

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

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
