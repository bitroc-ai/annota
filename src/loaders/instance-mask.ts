import UPNG from 'upng-js';
import { AnnotaError } from '../core/errors';
import type {
  AnnotationInput,
  AnnotationProperties,
  AnnotationStyle,
  Point,
} from '../core/types';
import { initOpenCV } from '../extensions/opencv';

export interface RgbaPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface DecodedInstance<A = Record<string, unknown>> {
  instanceId: number;
  attributes?: A;
}

export interface DecodedInstanceRegion<A = Record<string, unknown>> {
  instance: DecodedInstance<A>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
  pixels: ReadonlyArray<{ x: number; y: number }>;
}

export interface DecodedPixelSource {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  channels?: 3 | 4;
}

export interface ExtractedContour {
  points: Point[];
  area: number;
}

export interface InstanceMaskLoaderOptions<
  P extends AnnotationProperties = AnnotationProperties,
  A = Record<string, unknown>,
> {
  decodePixel(pixel: RgbaPixel): DecodedInstance<A> | null;
  mapProperties?(instance: DecodedInstance<A>): P;
  layerId?: string;
  style?: AnnotationStyle;
  minArea?: number;
  extractContours?(region: DecodedInstanceRegion<A>): Promise<ExtractedContour[]> | ExtractedContour[];
}

export function decodeRgb16Pixel(
  pixel: RgbaPixel
): DecodedInstance<{ classId: number }> | null {
  const instanceId = (pixel.r << 8) | pixel.g;
  return instanceId === 0
    ? null
    : { instanceId, attributes: { classId: pixel.b } };
}

export function decodeInstancePixels<A = Record<string, unknown>>(
  source: DecodedPixelSource,
  decodePixel: (pixel: RgbaPixel) => DecodedInstance<A> | null
): DecodedInstanceRegion<A>[] {
  const { width, height, data } = source;
  if (!Number.isInteger(width) || width < 0 || !Number.isInteger(height) || height < 0) {
    throw new AnnotaError('MASK_DECODE_FAILED', 'Mask dimensions must be non-negative integers');
  }
  const sourcePixelCount = width * height;
  if (sourcePixelCount === 0) return [];
  const channels = source.channels ?? (data.length === sourcePixelCount * 4 ? 4 : 3);
  if (data.length !== sourcePixelCount * channels) {
    throw new AnnotaError(
      'MASK_DECODE_FAILED',
      `Pixel buffer length ${data.length} does not match ${width}x${height}x${channels}`
    );
  }

  const regions = new Map<number, {
    instance: DecodedInstance<A>;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    pixels: Array<{ x: number; y: number }>;
  }>();
  for (let index = 0; index < sourcePixelCount; index++) {
    const offset = index * channels;
    const decoded = decodePixel({
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
      a: channels === 4 ? data[offset + 3] : 255,
    });
    if (!decoded) continue;
    if (!Number.isSafeInteger(decoded.instanceId) || decoded.instanceId <= 0) {
      throw new AnnotaError(
        'MASK_DECODE_FAILED',
        `decodePixel returned invalid instanceId ${decoded.instanceId}`
      );
    }
    const x = index % width;
    const y = Math.floor(index / width);
    const existing = regions.get(decoded.instanceId);
    if (existing) {
      existing.minX = Math.min(existing.minX, x);
      existing.minY = Math.min(existing.minY, y);
      existing.maxX = Math.max(existing.maxX, x);
      existing.maxY = Math.max(existing.maxY, y);
      existing.pixels.push({ x, y });
    } else {
      regions.set(decoded.instanceId, {
        instance: {
          instanceId: decoded.instanceId,
          ...(decoded.attributes === undefined ? {} : { attributes: decoded.attributes }),
        },
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
        pixels: [{ x, y }],
      });
    }
  }

  return Array.from(regions.values(), region => ({
    ...region,
    pixelCount: region.pixels.length,
  }));
}

interface CvDisposable {
  delete(): void;
}
interface CvMat extends CvDisposable {
  data: Uint8Array;
  data32S: Int32Array;
}
interface CvMatVector extends CvDisposable {
  size(): number;
  get(index: number): CvMat;
}
interface CvApi {
  Mat: new (rows?: number, cols?: number, type?: number) => CvMat;
  MatVector: new () => CvMatVector;
  CV_8UC1: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  findContours(
    image: CvMat,
    contours: CvMatVector,
    hierarchy: CvMat,
    mode: number,
    method: number
  ): void;
  contourArea(contour: CvMat): number;
  arcLength(contour: CvMat, closed: boolean): number;
  approxPolyDP(contour: CvMat, approx: CvMat, epsilon: number, closed: boolean): void;
}

function getCv(): CvApi {
  const candidate = (globalThis as typeof globalThis & { cv?: Partial<CvApi> }).cv;
  if (
    !candidate ||
    typeof candidate.Mat !== 'function' ||
    typeof candidate.MatVector !== 'function' ||
    typeof candidate.findContours !== 'function'
  ) {
    throw new AnnotaError('OPENCV_UNAVAILABLE', 'OpenCV is not available');
  }
  return candidate as CvApi;
}

async function extractContoursWithOpenCv<A>(
  region: DecodedInstanceRegion<A>
): Promise<ExtractedContour[]> {
  try {
    await initOpenCV();
  } catch (cause) {
    throw new AnnotaError('OPENCV_UNAVAILABLE', 'OpenCV failed to initialize', { cause });
  }
  const cv = getCv();
  const width = region.maxX - region.minX + 3;
  const height = region.maxY - region.minY + 3;
  const source = new cv.Mat(height, width, cv.CV_8UC1);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    source.data.fill(0);
    region.pixels.forEach(({ x, y }) => {
      source.data[(y - region.minY + 1) * width + (x - region.minX + 1)] = 255;
    });
    cv.findContours(
      source,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const extracted: ExtractedContour[] = [];
    for (let index = 0; index < contours.size(); index++) {
      const contour = contours.get(index);
      try {
        const area = cv.contourArea(contour);
        const approx = new cv.Mat();
        try {
          cv.approxPolyDP(contour, approx, cv.arcLength(contour, true) * 0.005, true);
          const points: Point[] = [];
          for (let pointIndex = 0; pointIndex < approx.data32S.length; pointIndex += 2) {
            points.push({
              x: approx.data32S[pointIndex] + region.minX - 1,
              y: approx.data32S[pointIndex + 1] + region.minY - 1,
            });
          }
          if (points.length >= 3) extracted.push({ points, area });
        } finally {
          approx.delete();
        }
      } finally {
        contour.delete();
      }
    }
    return extracted;
  } catch (cause) {
    throw new AnnotaError(
      'OPENCV_EXTRACTION_FAILED',
      `Failed to extract contours for instance ${region.instance.instanceId}`,
      { cause }
    );
  } finally {
    hierarchy.delete();
    contours.delete();
    source.delete();
  }
}

export async function loadInstanceMask<
  P extends AnnotationProperties = AnnotationProperties,
  A = Record<string, unknown>,
>(
  input: string | ArrayBuffer | DecodedPixelSource,
  options: InstanceMaskLoaderOptions<P, A>
): Promise<AnnotationInput<P>[]> {
  let source: DecodedPixelSource;
  if (typeof input === 'string') {
    const response = await fetch(input);
    if (!response.ok) {
      throw new AnnotaError(
        'MASK_DECODE_FAILED',
        `Failed to load mask file: ${response.status} ${response.statusText}`
      );
    }
    source = decodePng(await response.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    source = decodePng(input);
  } else {
    source = input;
  }

  const regions = decodeInstancePixels(source, options.decodePixel);
  const annotations: AnnotationInput<P>[] = [];
  const extract = options.extractContours ?? extractContoursWithOpenCv;
  for (const region of regions) {
    const contours = await extract(region);
    for (let index = 0; index < contours.length; index++) {
      const contour = contours[index];
      if (contour.area < (options.minArea ?? 15) || contour.points.length < 3) continue;
      const mapped = options.mapProperties?.(region.instance);
      const generic = {
        source: 'instance-mask',
        instanceId: region.instance.instanceId,
        ...(region.instance.attributes === undefined
          ? {}
          : { attributes: region.instance.attributes }),
        area: contour.area,
      };
      annotations.push({
        id: `mask-${region.instance.instanceId}-${index}`,
        shape: { type: 'polygon', points: contour.points },
        layerId: options.layerId ?? 'masks',
        properties: { ...generic, ...mapped } as unknown as P,
        style: options.style ?? {
          fill: '#FFFF00',
          fillOpacity: 0.3,
          stroke: '#FFFF00',
          strokeWidth: 2,
        },
      });
    }
  }
  return annotations;
}

function decodePng(arrayBuffer: ArrayBuffer): DecodedPixelSource {
  try {
    const image = UPNG.decode(arrayBuffer);
    const rgbaFrames = UPNG.toRGBA8(image);
    const frame = rgbaFrames[0];
    if (!frame) throw new Error('PNG has no image frame');
    return {
      width: image.width,
      height: image.height,
      data: new Uint8Array(frame),
      channels: 4,
    };
  } catch (cause) {
    throw new AnnotaError('MASK_DECODE_FAILED', 'Failed to decode PNG mask', { cause });
  }
}
