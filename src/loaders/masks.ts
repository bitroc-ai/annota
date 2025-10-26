/**
 * Annota Loaders - Generic Mask Loading
 * Handles PNG and PGM mask files for polygon extraction
 */

import type { Annotation } from '../core/types';
import { loadPgmFile, type PgmLoaderOptions } from './pgm';
import UPNG from 'upng-js';
import { initOpenCV } from '../extensions/opencv';

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
