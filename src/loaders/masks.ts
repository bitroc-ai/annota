/**
 * Annota Loaders - Generic Mask Loading
 * Handles PNG and PGM mask files for polygon extraction
 */

import type { Annotation } from '../core/types';
import { loadPgmFile, type PgmLoaderOptions } from './pgm';
import UPNG from 'upng-js';
import { initOpenCV } from '../extensions/opencv';
import pako from 'pako';

/**
 * Load mask image (PNG or PGM) from URL and extract polygon contours
 * Automatically detects format and converts to polygon annotations
 */
export async function loadMaskPolygons(
  url: string,
  options: PgmLoaderOptions = {}
): Promise<Annotation[]> {
  console.log('[MaskLoader] Loading mask from:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load mask file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const layer = options.layer || 'masks';

  // Check if it's a PNG file (starts with PNG signature)
  const view = new Uint8Array(arrayBuffer);
  const isPNG = view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47;

  console.log('[MaskLoader] File format detected:', isPNG ? 'PNG' : 'PGM');

  let annotations: Annotation[];

  if (isPNG) {
    // Handle PNG mask
    annotations = await loadPngMask(arrayBuffer);
  } else {
    // Handle PGM mask
    annotations = await loadPgmFile(arrayBuffer);
  }

  console.log('[MaskLoader] Extracted annotations:', annotations.length);

  // Apply layer and styling options
  const styledAnnotations = annotations.map((ann: Annotation) => ({
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

  // Log first styled annotation for debugging
  if (styledAnnotations.length > 0) {
    console.log('[MaskLoader] 🎨 Sample styled annotation:', JSON.stringify(styledAnnotations[0], null, 2));
    const firstShape = styledAnnotations[0].shape;
    if (firstShape.type === 'polygon') {
      console.log('[MaskLoader] 📍 Points sample:', firstShape.points.slice(0, 3));
      console.log('[MaskLoader] 📐 Bounds:', firstShape.bounds);
    }
  }

  return styledAnnotations;
}

/**
 * Load 16-bit grayscale PNG mask
 * Since canvas normalizes 16-bit to 8-bit, we use UPNG.js to decode properly
 */
async function loadPngMask16bit(arrayBuffer: ArrayBuffer): Promise<Annotation[]> {
  console.log('[MaskLoader] Decoding 16-bit PNG...');

  try {
    // Decode 16-bit PNG using UPNG.js
    const img = UPNG.decode(arrayBuffer);
    const data8 = new Uint8Array(img.data);

    // Convert big-endian Uint8Array to Uint16Array
    // UPNG.js returns data as Uint8Array with 2 bytes per 16-bit pixel (big-endian)
    const area = img.width * img.height;
    const data16 = new Uint16Array(area);
    for (let i = 0; i < area; i++) {
      // Convert big-endian bytes to uint16: (MSB << 8) | LSB
      data16[i] = (data8[i * 2] << 8) | data8[i * 2 + 1];
    }

    // Find unique instance IDs (excluding 0 = background)
    const instanceIds = new Set<number>();
    for (let i = 0; i < data16.length; i++) {
      if (data16[i] > 0) {
        instanceIds.add(data16[i]);
      }
    }

    console.log(`[MaskLoader] Found ${instanceIds.size} instances in ${img.width}x${img.height} PNG`);

    // Initialize OpenCV if needed
    console.log('[MaskLoader] Initializing OpenCV...');
    try {
      await initOpenCV();
    } catch (error) {
      console.error('[MaskLoader] Failed to initialize OpenCV:', error);
      console.error('[MaskLoader] Mask loading requires OpenCV.js. Please check your network connection.');
      return [];
    }

    // Use OpenCV to extract contours
    if (typeof window === 'undefined' || !(window as any).cv || !(window as any).cv.Mat) {
      console.error('[MaskLoader] OpenCV not available or not fully initialized');
      return [];
    }

    const cv = (window as any).cv;
    const annotations: Annotation[] = [];
    const { calculateBounds } = await import('../core/types');

    console.log(`[MaskLoader] Starting to process ${instanceIds.size} instances...`);

    // Process each instance separately
    let processedCount = 0;
    let skippedCount = 0;

    for (const instanceId of instanceIds) {
      // Create binary mask for this instance only
      const binaryData = new Uint8Array(img.width * img.height);
      let pixelCount = 0;
      for (let i = 0; i < data16.length; i++) {
        if (data16[i] === instanceId) {
          binaryData[i] = 255;
          pixelCount++;
        } else {
          binaryData[i] = 0;
        }
      }

      // Skip instances with very few pixels (likely noise)
      if (pixelCount < 100) {
        skippedCount++;
        continue;
      }

      processedCount++;
      console.log(`[MaskLoader] Processing instance ${instanceId}: ${pixelCount} pixels`);

      // Create OpenCV Mat directly from binary data (avoid ImageData retina scaling)
      const gray = new cv.Mat(img.height, img.width, cv.CV_8UC1);
      gray.data.set(binaryData);

      // Apply binary threshold to ensure proper binarization
      const binary = new cv.Mat();
      cv.threshold(gray, binary, 127, 255, cv.THRESH_BINARY);

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      console.log(`[MaskLoader] Instance ${instanceId}: found ${contours.size()} contours`);

      // Process ALL contours (keep fragmented regions)
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);

        // Skip tiny contours (noise)
        if (area < 100) continue;

        // Simplify polygon to reduce vertex count
        const approx = new cv.Mat();
        const perimeter = cv.arcLength(contour, true);
        const epsilon = 0.005 * perimeter; // 0.5% tolerance
        cv.approxPolyDP(contour, approx, epsilon, true);

        // Convert to points
        const points: import('../core/types').Point[] = [];
        for (let j = 0; j < approx.data32S.length; j += 2) {
          points.push({
            x: approx.data32S[j],
            y: approx.data32S[j + 1],
          });
        }
        approx.delete();

        // Create annotation for this contour
        if (points.length >= 3) {
          annotations.push({
            id: `mask-${instanceId}-${i}`,
            shape: {
              type: 'polygon',
              points,
              bounds: calculateBounds({
                type: 'polygon',
                points,
                bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
              }),
            },
            properties: {
              source: 'png-mask',
              type: 'region',
              instanceId,
              area,
              layer: 'masks',
            },
            style: {
              fill: '#FFFF00',
              fillOpacity: 0.3,
              stroke: '#FFFF00',
              strokeWidth: 2,
            },
          });
        }
      }

      // Cleanup
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
    }

    console.log(`[MaskLoader] Processed ${processedCount} instances, skipped ${skippedCount} (too small)`);
    console.log(`[MaskLoader] Extracted ${annotations.length} polygons from ${instanceIds.size} instances`);
    return annotations;
  } catch (error) {
    console.error('[MaskLoader] Error decoding 16-bit PNG:', error);
    return [];
  }
}

/**
 * Load PNG mask and extract polygon contours
 * Assumes 16-bit grayscale PNG with instance IDs as pixel values
 */
async function loadPngMask(arrayBuffer: ArrayBuffer): Promise<Annotation[]> {
  console.log('[MaskLoader] Loading 16-bit grayscale PNG mask...');
  return loadPngMask16bit(arrayBuffer);
}

/**
 * Export annotations to 16-bit grayscale PNG mask
 * Creates a PNG where each mask instance has a unique pixel value (instance ID)
 *
 * @param annotations - Array of polygon/multipolygon annotations to export
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns ArrayBuffer containing 16-bit grayscale PNG data
 */
export async function exportMasksToPng(
  annotations: Annotation[],
  width: number,
  height: number
): Promise<ArrayBuffer> {
  console.log(`[MaskExporter] Exporting ${annotations.length} masks to ${width}x${height} PNG`);

  // Create 16-bit grayscale array
  const data16 = new Uint16Array(width * height);
  data16.fill(0); // 0 = background

  // Rasterize each annotation with a unique instance ID
  let instanceId = 1;
  for (const annotation of annotations) {
    if (annotation.shape.type === 'polygon') {
      rasterizePolygon16bit(data16, width, height, annotation.shape.points, instanceId);
      instanceId++;
    } else if (annotation.shape.type === 'multipolygon') {
      // Rasterize each polygon in the multipolygon with the same instance ID
      for (const polygon of annotation.shape.polygons) {
        rasterizePolygon16bit(data16, width, height, polygon, instanceId);
      }
      instanceId++;
    }
  }

  console.log(`[MaskExporter] Rasterized ${instanceId - 1} instances`);

  // UPNG.js npm package doesn't support 16-bit grayscale encoding properly
  // We need to manually create the PNG format using pako for compression

  // Create PNG manually with proper 16-bit grayscale format
  return createPng16bitGrayscale(data16, width, height);
}

/**
 * Create a 16-bit grayscale PNG manually
 * PNG specification: http://www.libpng.org/pub/png/spec/1.2/PNG-Contents.html
 */
function createPng16bitGrayscale(data16: Uint16Array, width: number, height: number): ArrayBuffer {
  // PNG file structure:
  // - PNG signature (8 bytes)
  // - IHDR chunk (image header)
  // - IDAT chunk (image data, zlib compressed)
  // - IEND chunk (end marker)

  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (13 bytes data)
  // Color type 0 = grayscale, bit depth 16
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);       // Width (big-endian)
  ihdrView.setUint32(4, height, false);      // Height (big-endian)
  ihdr[8] = 16;                              // Bit depth
  ihdr[9] = 0;                               // Color type (0 = grayscale)
  ihdr[10] = 0;                              // Compression method
  ihdr[11] = 0;                              // Filter method
  ihdr[12] = 0;                              // Interlace method

  // Prepare image data for IDAT
  // PNG uses filter byte at start of each scanline
  const bytesPerPixel = 2; // 16-bit = 2 bytes
  const stride = width * bytesPerPixel;
  const imageData = new Uint8Array(height * (1 + stride)); // +1 for filter byte per line

  // Convert data16 to big-endian bytes with filter byte (0 = no filter) at start of each line
  for (let y = 0; y < height; y++) {
    const lineOffset = y * (1 + stride);
    imageData[lineOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const value = data16[pixelIndex];
      const dataOffset = lineOffset + 1 + x * bytesPerPixel;

      // Big-endian 16-bit
      imageData[dataOffset] = (value >> 8) & 0xFF;     // High byte
      imageData[dataOffset + 1] = value & 0xFF;        // Low byte
    }
  }

  // Compress image data with zlib/deflate
  const compressed = pako.deflate(imageData);

  // Build final PNG
  const totalSize =
    signature.length +
    createChunk('IHDR', ihdr).length +
    createChunk('IDAT', compressed).length +
    createChunk('IEND', new Uint8Array(0)).length;

  const png = new Uint8Array(totalSize);
  let offset = 0;

  // Write signature
  png.set(signature, offset);
  offset += signature.length;

  // Write IHDR
  const ihdrChunk = createChunk('IHDR', ihdr);
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;

  // Write IDAT
  const idatChunk = createChunk('IDAT', compressed);
  png.set(idatChunk, offset);
  offset += idatChunk.length;

  // Write IEND
  const iendChunk = createChunk('IEND', new Uint8Array(0));
  png.set(iendChunk, offset);

  console.log(`[PNG] Created 16-bit grayscale PNG: ${png.byteLength} bytes`);
  return png.buffer;
}

/**
 * Create a PNG chunk with length, type, data, and CRC
 */
function createChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length;
  const chunk = new Uint8Array(4 + 4 + length + 4); // length + type + data + crc
  const view = new DataView(chunk.buffer);

  // Length (4 bytes, big-endian)
  view.setUint32(0, length, false);

  // Type (4 bytes, ASCII)
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }

  // Data
  chunk.set(data, 8);

  // CRC (4 bytes)
  const crc = calculateCrc(chunk.subarray(4, 8 + length));
  view.setUint32(8 + length, crc, false);

  return chunk;
}

/**
 * Calculate CRC32 for PNG chunks
 */
function calculateCrc(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Rasterize a polygon into a 16-bit mask with the given instance ID
 */
function rasterizePolygon16bit(
  mask: Uint16Array,
  width: number,
  height: number,
  points: import('../core/types').Point[],
  instanceId: number
): void {
  if (points.length < 3) return;

  // Find bounding box
  const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map(p => p.y))));

  // Scanline fill algorithm
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
      if (i + 1 >= intersections.length) break;

      const x1 = Math.max(minX, Math.floor(intersections[i]));
      const x2 = Math.min(maxX, Math.ceil(intersections[i + 1]));

      for (let x = x1; x <= x2; x++) {
        mask[y * width + x] = instanceId;
      }
    }
  }
}
