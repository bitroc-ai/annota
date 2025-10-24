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
    // Use UPNG.js library for 16-bit PNG decoding
    const img = UPNG.decode(arrayBuffer);

    console.log('[MaskLoader] PNG decoded, size:', img.width, 'x', img.height);

    // Get 16-bit data directly
    const data16 = new Uint16Array(img.data);
    console.log('[MaskLoader] 16-bit data length:', data16.length, 'sample values:',
      Array.from(data16.slice(0, 10)));

    // Find unique instance IDs (excluding 0 which is background)
    const instanceIds = new Set<number>();
    for (let i = 0; i < data16.length; i++) {
      if (data16[i] > 0) {
        instanceIds.add(data16[i]);
      }
    }

    console.log('[MaskLoader] Found', instanceIds.size, 'unique instances');

    // Initialize OpenCV if needed
    console.log('[MaskLoader] Initializing OpenCV...');
    await initOpenCV();

    // Use OpenCV to extract contours
    if (typeof window === 'undefined' || !(window as any).cv || !(window as any).cv.Mat) {
      console.error('[MaskLoader] OpenCV not available or not fully initialized');
      return [];
    }

    const cv = (window as any).cv;
    const annotations: Annotation[] = [];
    const { calculateBounds } = await import('../core/types');

    // Process each instance separately
    for (const instanceId of instanceIds) {
      // Count pixels for this instance
      let pixelCount = 0;
      for (let i = 0; i < data16.length; i++) {
        if (data16[i] === instanceId) pixelCount++;
      }

      // Skip instances with very few pixels (likely noise)
      if (pixelCount < 100) {
        console.log(`[MaskLoader] Skipping instance ${instanceId}: only ${pixelCount} pixels`);
        continue;
      }

      // Create binary mask for this instance only
      const binaryData = new Uint8Array(img.width * img.height);
      for (let i = 0; i < data16.length; i++) {
        binaryData[i] = data16[i] === instanceId ? 255 : 0;
      }

      // Create OpenCV Mat directly from binary data (avoid ImageData retina scaling)
      const gray = new cv.Mat(img.height, img.width, cv.CV_8UC1);
      gray.data.set(binaryData);

      // Apply strong morphological operations to connect fragmented regions
      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
      const closed = new cv.Mat();
      // Apply closing multiple times to really connect fragments
      cv.morphologyEx(gray, closed, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 3);
      kernel.delete();

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      console.log(`[MaskLoader] Instance ${instanceId}: ${pixelCount} pixels -> ${contours.size()} contours`);

      // Find the largest contour (main instance)
      let largestContour = null;
      let largestArea = 0;
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area > largestArea) {
          largestArea = area;
          largestContour = contour;
        }
      }

      // Only process the largest contour if it's significant
      if (largestContour && largestArea > 100) {
        // Simplify contour
        const approx = new cv.Mat();
        const epsilon = 0.01 * cv.arcLength(largestContour, true);
        cv.approxPolyDP(largestContour, approx, epsilon, true);

        // Convert to Point array
        const points: import('../core/types').Point[] = [];
        for (let j = 0; j < approx.data32S.length; j += 2) {
          points.push({
            x: approx.data32S[j],
            y: approx.data32S[j + 1],
          });
        }

        approx.delete();

        if (points.length >= 3) {
          annotations.push({
            id: `mask-${instanceId}`,
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
              area: largestArea,
              layer: 'masks',
            },
            style: {
              // Default style - will be overridden by options in loadMaskPolygons
              fill: '#FFFF00',
              fillOpacity: 0.3,
              stroke: '#FFFF00',
              strokeWidth: 2,
            },
          });
          console.log(`[MaskLoader] ✓ Instance ${instanceId}: extracted polygon with ${points.length} points, area ${Math.round(largestArea)}`);
        } else {
          console.log(`[MaskLoader] ✗ Instance ${instanceId}: too few points (${points.length})`);
        }
      }

      // Cleanup this instance's data
      gray.delete();
      closed.delete();
      contours.delete();
      hierarchy.delete();
    }

    console.log('[MaskLoader] Extracted', annotations.length, 'polygon annotations from', instanceIds.size, 'instances');

    // Log first annotation for debugging
    if (annotations.length > 0) {
      console.log('[MaskLoader] Sample annotation:', JSON.stringify(annotations[0], null, 2));
    }

    return annotations;
  } catch (error) {
    console.error('[MaskLoader] Error decoding 16-bit PNG:', error);
    return [];
  }
}

/**
 * Load PNG mask and extract polygon contours
 */
async function loadPngMask(arrayBuffer: ArrayBuffer): Promise<Annotation[]> {
  console.log('[MaskLoader] Loading PNG mask...');

  // Check if it's 16-bit grayscale PNG by examining the PNG header
  const view = new DataView(arrayBuffer);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  // IHDR chunk starts at byte 12
  const bitDepth = view.getUint8(24); // Bit depth is at offset 24
  const colorType = view.getUint8(25); // Color type is at offset 25

  console.log('[MaskLoader] PNG bit depth:', bitDepth, 'color type:', colorType);

  // For 16-bit grayscale PNGs, we need to decode them properly
  // Browser canvas will normalize 16-bit values to 8-bit, losing small instance IDs
  if (bitDepth === 16 && colorType === 0) {
    console.log('[MaskLoader] Detected 16-bit grayscale PNG, using special handling');
    return loadPngMask16bit(arrayBuffer);
  }

  // For 8-bit PNGs, use normal canvas rendering
  // Create blob and load as image
  const blob = new Blob([arrayBuffer], { type: 'image/png' });
  const imageUrl = URL.createObjectURL(blob);

  console.log('[MaskLoader] Loading PNG image...');

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        console.log('[MaskLoader] PNG loaded, size:', img.width, 'x', img.height);

        // Draw to canvas to get pixel data
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        console.log('[MaskLoader] ImageData created, size:', imageData.width, 'x', imageData.height);

        // Sample some pixels to see what values we're getting
        console.log('[MaskLoader] Sample pixels (first 10):');
        for (let i = 0; i < 40; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          if (r > 0 || g > 0 || b > 0) {
            console.log(`  Pixel ${i/4}: R=${r} G=${g} B=${b} A=${a}`);
          }
        }

        // Convert to binary mask (any non-zero value = foreground)
        // Mask uses grayscale values where pixel value = instance/group ID
        const binaryMask = new ImageData(imageData.width, imageData.height);
        let nonZeroPixels = 0;
        let maxValue = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          // Any non-zero pixel is part of the mask
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];

          // For 16-bit PNG downsampled to 8-bit, check alpha channel too
          const hasValue = r > 0 || g > 0 || b > 0 || a < 255;
          if (hasValue) {
            nonZeroPixels++;
            maxValue = Math.max(maxValue, r, g, b);
          }
          const value = hasValue ? 255 : 0;
          binaryMask.data[i] = value;
          binaryMask.data[i + 1] = value;
          binaryMask.data[i + 2] = value;
          binaryMask.data[i + 3] = 255;
        }

        console.log('[MaskLoader] Binary mask created, non-zero pixels:', nonZeroPixels, 'max value:', maxValue);

        // Convert to polygon using OpenCV
        if (typeof window !== 'undefined' && (window as any).cv) {
          console.log('[MaskLoader] OpenCV available, extracting polygon...');
          const { maskToPolygon } = await import('../extensions/opencv');
          const polygon = maskToPolygon(binaryMask, true);

          console.log('[MaskLoader] Polygon extracted, points:', polygon?.length);

          if (polygon && polygon.length > 0) {
            const { calculateBounds } = await import('../core/types');
            const annotation: Annotation = {
              id: `mask-${Date.now()}`,
              shape: {
                type: 'polygon',
                points: polygon,
                bounds: calculateBounds({
                  type: 'polygon',
                  points: polygon,
                  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
                }),
              },
              properties: {
                source: 'png-mask',
                type: 'region',
              },
            };

            URL.revokeObjectURL(imageUrl);
            console.log('[MaskLoader] Annotation created successfully');
            resolve([annotation]);
          } else {
            URL.revokeObjectURL(imageUrl);
            console.warn('[MaskLoader] No polygon extracted from mask');
            resolve([]);
          }
        } else {
          URL.revokeObjectURL(imageUrl);
          console.warn('[MaskLoader] OpenCV not available, cv:', (window as any).cv);
          resolve([]);
        }
      } catch (error) {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load PNG image'));
    };

    img.src = imageUrl;
  });
}
