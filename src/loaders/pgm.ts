/**
 * Annota Loaders - PGM Format
 * Portable GrayMap format for region masks
 */

import type { Point, PolygonShape, Annotation } from '../core/types';
import { calculateBounds } from '../core/types';
import type { MaskLoaderOptions } from './masks';

/**
 * PGM File Header
 */
interface PGMHeader {
  format: 'P2' | 'P5'; // P2 = ASCII, P5 = Binary
  width: number;
  height: number;
  maxValue: number;
}

/**
 * Parse PGM file header
 */
function parsePgmHeader(data: string | ArrayBuffer): PGMHeader {
  let lines: string[];

  if (typeof data === 'string') {
    lines = data.split('\n');
  } else {
    const text = new TextDecoder('utf-8').decode(data.slice(0, 200));
    lines = text.split('\n');
  }

  const filtered = lines.filter(line => !line.startsWith('#') && line.trim().length > 0);

  if (filtered.length < 3) {
    throw new Error('Invalid PGM file: missing header');
  }

  const format = filtered[0].trim() as 'P2' | 'P5';
  if (format !== 'P2' && format !== 'P5') {
    throw new Error(`Unsupported PGM format: ${format}`);
  }

  const [width, height] = filtered[1].split(/\s+/).map(Number);
  const maxValue = Number(filtered[2]);

  if (!width || !height || !maxValue) {
    throw new Error('Invalid PGM header values');
  }

  return { format, width, height, maxValue };
}

/**
 * Load PGM file from URL and extract polygon contours
 * Fetches the file and converts to polygon annotations
 */
export async function loadPgmPolygons(
  url: string,
  options: MaskLoaderOptions = {}
): Promise<Annotation[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load PGM file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const annotations = await loadPgmFile(arrayBuffer);

  const layer = options.layer || 'masks';

  // Apply layer and styling options
  return annotations.map((ann: Annotation) => ({
    ...ann,
    properties: {
      ...ann.properties,
      layer,
    },
    style: {
      ...ann.style,
      ...(options.color && { fill: options.color, stroke: options.color }),
      ...(options.fillOpacity !== undefined && { fillOpacity: options.fillOpacity }),
      ...(options.strokeWidth !== undefined && { strokeWidth: options.strokeWidth }),
    },
  }));
}

/**
 * Load PGM file and extract polygon contours
 * PGM files contain region masks (255 = foreground, 0 = background)
 */
export async function loadPgmFile(file: File | ArrayBuffer): Promise<Annotation[]> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const header = parsePgmHeader(data);

  // Create ImageData from PGM
  const imageData = new ImageData(header.width, header.height);

  if (header.format === 'P5') {
    // Binary format
    const headerEnd = findHeaderEnd(data);
    const pixelData = new Uint8Array(data, headerEnd);

    for (let i = 0; i < pixelData.length; i++) {
      const idx = i * 4;
      const value = pixelData[i];
      imageData.data[idx] = value;
      imageData.data[idx + 1] = value;
      imageData.data[idx + 2] = value;
      imageData.data[idx + 3] = 255;
    }
  } else {
    // ASCII format (P2)
    const text = new TextDecoder('utf-8').decode(data);
    const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
    const values = lines.slice(3).join(' ').split(/\s+/).map(Number);

    for (let i = 0; i < values.length; i++) {
      const idx = i * 4;
      const value = values[i];
      imageData.data[idx] = value;
      imageData.data[idx + 1] = value;
      imageData.data[idx + 2] = value;
      imageData.data[idx + 3] = 255;
    }
  }

  // Convert mask to polygon annotations using OpenCV (if available)
  if (typeof window !== 'undefined' && window.cv) {
    const { maskToPolygon } = await import('../extensions/opencv');
    const polygon = maskToPolygon(imageData, true);

    if (polygon && polygon.length > 0) {
      const shape: PolygonShape = {
        type: 'polygon',
        points: polygon,
        bounds: calculateBounds({
          type: 'polygon',
          points: polygon,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        }),
      };

      return [
        {
          id: `pgm-region-${Date.now()}`,
          shape,
          properties: {
            source: 'pgm',
            type: 'cell_region',
          },
        },
      ];
    }
  }

  // Fallback: return empty if OpenCV not available
  console.warn('[PGM] OpenCV not available, cannot extract polygon from mask');
  return [];
}

/**
 * Find where header ends in binary PGM
 */
function findHeaderEnd(data: ArrayBuffer): number {
  const view = new Uint8Array(data);
  let lineCount = 0;
  let i = 0;

  while (i < view.length && lineCount < 3) {
    if (view[i] === 0x0a) {
      // newline
      lineCount++;
    }
    i++;
  }

  return i;
}

/**
 * Export annotations to PGM format
 * Converts polygon annotations to binary masks
 */
export function annotationsToPgm(
  annotations: Annotation[],
  width: number,
  height: number
): ArrayBuffer {
  // Create blank mask
  const mask = new Uint8Array(width * height);
  mask.fill(0);

  // Rasterize each annotation
  for (const annotation of annotations) {
    if (annotation.shape.type === 'polygon' || annotation.shape.type === 'freehand') {
      const points = annotation.shape.points;
      rasterizePolygon(mask, width, height, points);
    }
  }

  // Create PGM file (binary format P5)
  const header = `P5\n${width} ${height}\n255\n`;
  const headerBytes = new TextEncoder().encode(header);

  const result = new Uint8Array(headerBytes.length + mask.length);
  result.set(headerBytes, 0);
  result.set(mask, headerBytes.length);

  return result.buffer;
}

/**
 * Simple polygon rasterization using scanline algorithm
 */
function rasterizePolygon(mask: Uint8Array, width: number, height: number, points: Point[]): void {
  if (points.length < 3) return;

  // Find bounding box
  const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map(p => p.y))));

  // Scanline fill
  for (let y = minY; y <= maxY; y++) {
    const intersections: number[] = [];

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const p1 = points[i];
      const p2 = points[j];

      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const x = p1.x + ((y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x);
        intersections.push(x);
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length; i += 2) {
      const x1 = Math.max(minX, Math.floor(intersections[i]));
      const x2 = Math.min(maxX, Math.ceil(intersections[i + 1]));

      for (let x = x1; x <= x2; x++) {
        mask[y * width + x] = 255;
      }
    }
  }
}

/**
 * Export single annotation to PGM
 */
export function annotationToPgm(
  annotation: Annotation,
  width: number,
  height: number
): ArrayBuffer {
  return annotationsToPgm([annotation], width, height);
}
