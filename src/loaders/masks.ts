/**
 * Annota Loaders - Generic Mask Loading
 * Handles PNG and PGM mask files for polygon extraction
 */

import type { Annotation } from '../core/types';
import { loadPgmFile, type PgmLoaderOptions } from './pgm';

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
 * Load PNG mask and extract polygon contours
 */
async function loadPngMask(arrayBuffer: ArrayBuffer): Promise<Annotation[]> {
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
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        console.log('[MaskLoader] ImageData created, checking OpenCV...');

        // Convert to polygon using OpenCV
        if (typeof window !== 'undefined' && (window as any).cv) {
          console.log('[MaskLoader] OpenCV available, extracting polygon...');
          const { maskToPolygon } = await import('../extensions/opencv');
          const polygon = maskToPolygon(imageData, true);

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
